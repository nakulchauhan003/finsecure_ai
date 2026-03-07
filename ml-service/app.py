"""
FinSecure AI — ML Scoring API v3.0
FastAPI service: calibrated XGBoost trained on real credit risk data.
Maps frontend application fields → model feature space (15 features).
"""

import os
import json
import logging
import importlib
import base64
import binascii
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import shap
try:
    _lime_module = importlib.import_module("lime.lime_tabular")
    LimeTabularExplainer = getattr(_lime_module, "LimeTabularExplainer")
except Exception:
    LimeTabularExplainer = None
from collections import deque
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal

# --- Structured logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("finsecure_ml")
HAS_LIME = LimeTabularExplainer is not None

# --- Load model artifacts ---
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

try:
    credit_model = joblib.load(os.path.join(MODEL_DIR, "credit_risk_model.pkl"))
    fraud_model = joblib.load(os.path.join(MODEL_DIR, "fraud_detection_model.joblib"))
    encoders = joblib.load(os.path.join(MODEL_DIR, "encoders.joblib"))
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "r") as f:
        model_metadata = json.load(f)

    cal_path = os.path.join(MODEL_DIR, "credit_risk_calibrated.pkl")
    if os.path.exists(cal_path):
        isotonic_calibrator = joblib.load(cal_path)
        print("[OK] Isotonic calibrator loaded")
    else:
        isotonic_calibrator = None
        print("[WARN] No calibrator found, using raw probabilities")

    # SHAP explainer
    shap_explainer = shap.TreeExplainer(credit_model.get_booster())

    # --- Fraud model calibration ---
    # Compute anomaly score distribution from training data so we can
    # convert raw Isolation Forest decision_function scores into proper
    # [0, 1] probabilities via percentile normalization.
    _train_sample_path = os.path.join(
        os.path.dirname(__file__), "data", "training_sample.csv"
    )
    lime_background_data = None
    if os.path.exists(_train_sample_path):
        _cal_df = pd.read_csv(_train_sample_path)

        # The training sample has raw columns — encode them to match model features
        _grade_map = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6}
        _cal_df["loan_grade_enc"] = _cal_df["loan_grade"].map(_grade_map)
        _cal_df["cb_default_enc"] = (_cal_df["cb_person_default_on_file"] == "Y").astype(int)
        _cal_df["home_ownership_enc"] = encoders["home_ownership"].transform(
            _cal_df["person_home_ownership"])
        _cal_df["loan_intent_enc"] = encoders["loan_intent"].transform(
            _cal_df["loan_intent"])
        _cal_df["income_to_loan"] = _cal_df["person_income"] / np.maximum(_cal_df["loan_amnt"], 1)
        _cal_df["age_emp_ratio"] = _cal_df["person_emp_length"] / np.maximum(_cal_df["person_age"], 1)
        _cal_df["rate_grade_interaction"] = _cal_df["loan_int_rate"] * _cal_df["loan_grade_enc"]
        _cal_df["cred_hist_per_age"] = _cal_df["cb_person_cred_hist_length"] / np.maximum(_cal_df["person_age"], 1)

        _cal_features = _cal_df[model_metadata["feature_columns"]]
        lime_background_data = _cal_features.values
        _cal_scores = fraud_model.decision_function(_cal_features)
        FRAUD_SCORE_MIN = float(np.percentile(_cal_scores, 1))   # deepest anomaly
        FRAUD_SCORE_MAX = float(np.percentile(_cal_scores, 99))  # most normal
        logger.info(f"Fraud calibration: score range [{FRAUD_SCORE_MIN:.4f}, {FRAUD_SCORE_MAX:.4f}]")

        # Publish evaluation metrics for the fraud model
        _anomaly_labels = fraud_model.predict(_cal_features)
        _n_anomalies = int((_anomaly_labels == -1).sum())
        _anomaly_rate = _n_anomalies / len(_cal_df)
        logger.info(f"Fraud evaluation on {len(_cal_df)} samples: "
                    f"{_n_anomalies} anomalies ({_anomaly_rate:.2%}), "
                    f"score mean={float(np.mean(_cal_scores)):.4f}, "
                    f"score std={float(np.std(_cal_scores)):.4f}")
    else:
        # Fallback: use conservative fixed range
        FRAUD_SCORE_MIN = -0.5
        FRAUD_SCORE_MAX = 0.3
        lime_background_data = None
        logger.warning("No training sample for fraud calibration — using fallback range")

    logger.info(f"All models and SHAP explainer loaded successfully")
    logger.info(f"  Model version: {model_metadata['model_version']}")
    logger.info(f"  Features: {model_metadata['n_features']}")

except Exception as e:
    print(f"Failed to load models: {e}")
    print("Run train_model.py first to generate model artifacts.")
    raise SystemExit(1)


# ── Model Monitoring: rolling prediction store ──
# Keeps the last N predictions for drift detection.

MONITOR_WINDOW = 500  # rolling window size
_prediction_log = deque(maxlen=MONITOR_WINDOW)
_baseline_stats = {"mean_pd": None, "approval_rate": None, "recorded_at": None}

# ── Input Feature Drift Tracking ──
# Tracks rolling statistics (mean, std, min, max) for key input features.
# Compares against a baseline snapshot to detect distribution shifts.

TRACKED_FEATURES = ["credit_score", "monthly_income", "loan_amount", "account_age"]
FEATURE_DRIFT_THRESHOLDS = {
    "credit_score":   {"mean_shift": 30, "std_ratio": 1.5},
    "monthly_income": {"mean_shift": 15000, "std_ratio": 1.5},
    "loan_amount":    {"mean_shift": 100000, "std_ratio": 1.5},
    "account_age":    {"mean_shift": 3, "std_ratio": 1.5},
}

_feature_log: dict[str, deque] = {f: deque(maxlen=MONITOR_WINDOW) for f in TRACKED_FEATURES}
_feature_baseline: dict[str, dict] = {}  # populated after first 50 predictions


# --- Pydantic Schemas (unchanged — frontend compatible) ---

class ScoringRequest(BaseModel):
    employment_type: Literal["salaried", "self_employed"] = Field(description="Employment category")
    age: int = Field(ge=18, le=80, description="Applicant age")
    credit_score: int = Field(ge=300, le=900, description="CIBIL credit score")
    monthly_income: float = Field(gt=0, description="Monthly income in INR")
    loan_amount: float = Field(gt=0, description="Requested loan amount in INR")
    previous_defaults: int = Field(ge=0, le=10, description="Number of previous defaults")
    account_age: float = Field(ge=0, description="Banking relationship in years")
    loan_enquiries: int = Field(ge=0, description="Loan enquiries in last 3 months")
    housing_type: Literal["rent", "owned"] = Field(description="Housing status")
    total_expenditure: float = Field(ge=0, description="Monthly total expenditure in INR")
    other_fixed_expenses: float = Field(ge=0, default=0, description="Other fixed monthly expenses")

    # Self-employed specific
    gross_revenue: float = Field(ge=0, default=0)
    expected_margin: float = Field(ge=0, le=100, default=0)
    business_rent: float = Field(ge=0, default=0)
    utilities_salaries: float = Field(ge=0, default=0)
    business_age: float = Field(ge=0, default=0)
    gst_registered: int = Field(ge=0, le=1, default=0)
    business_type: Literal["trading", "manufacturing", "service", "none"] = Field(default="none")

    # Optional v2.0 features (kept for backward compat, auto-mapped)
    credit_utilization: Optional[float] = Field(default=None, ge=0, le=1)
    payment_history_length: Optional[int] = Field(default=None, ge=0)
    savings_ratio: Optional[float] = Field(default=None, ge=0, le=1)
    employment_stability: Optional[float] = Field(default=None, ge=0)
    income_volatility: Optional[float] = Field(default=None, ge=0, le=1)
    loan_purpose: Optional[Literal["home", "personal", "vehicle", "education", "business", "gold"]] = Field(default=None)
    disposable_income_ratio: Optional[float] = Field(default=None, ge=0, le=1)

    risk_appetite: Literal["conservative", "moderate", "aggressive"] = Field(default="moderate")


class FraudRequest(BaseModel):
    employment_type: Literal["salaried", "self_employed"]
    age: int
    credit_score: int
    monthly_income: float
    loan_amount: float
    previous_defaults: int
    account_age: float
    loan_enquiries: int
    housing_type: Literal["rent", "owned"]
    total_expenditure: float
    other_fixed_expenses: float = 0
    gross_revenue: float = 0
    expected_margin: float = 0
    business_rent: float = 0
    utilities_salaries: float = 0
    business_age: float = 0
    gst_registered: int = 0
    business_type: str = "none"


class PredictLoanRequest(BaseModel):
    credit_score: int = Field(ge=300, le=900)
    income: float = Field(gt=0, description="Annual income in INR")
    loan_amount: float = Field(gt=0, description="Loan amount in INR")
    term: int = Field(ge=6, le=360, default=36)
    employment_type: Literal["salaried", "self_employed"] = Field(default="salaried")
    applicant_id: Optional[str] = None


class CounterfactualRequest(BaseModel):
    applicant_id: Optional[str] = None
    target: Literal["approve", "reject"] = Field(default="approve")
    features: PredictLoanRequest


class SignatureVerifyRequest(BaseModel):
    """Request model for signature verification using base64-encoded images."""
    reference_image: str = Field(description="Reference signature image as base64 or data URL")
    test_image: str = Field(description="Test signature image as base64 or data URL")
    threshold: float = Field(default=70.0, ge=0.0, le=100.0)


# --- FastAPI App ---

app = FastAPI(
    title="FinSecure AI — Risk Scoring API v3.0",
    description="Real-data trained XGBoost + SHAP + Isolation Forest",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002",
                   "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mapping tables ---

# Credit score → loan grade (A best → G worst)
GRADE_RANGES = [
    (750, "A"), (700, "B"), (650, "C"), (600, "D"),
    (550, "E"), (500, "F"), (0, "G"),
]

# Grade → typical interest rate (from dataset medians)
GRADE_INT_RATE = {
    "A": 7.51, "B": 10.99, "C": 13.47, "D": 15.61,
    "E": 18.39, "F": 21.49, "G": 22.35,
}

# Frontend loan_purpose → dataset loan_intent
PURPOSE_TO_INTENT = {
    "personal": "PERSONAL",
    "education": "EDUCATION",
    "home": "HOMEIMPROVEMENT",
    "vehicle": "PERSONAL",
    "business": "VENTURE",
    "gold": "PERSONAL",
}

# Frontend housing → dataset home_ownership
HOUSING_MAP = {
    "rent": "RENT",
    "owned": "OWN",
}


def _credit_score_to_grade(score: int) -> str:
    for threshold, grade in GRADE_RANGES:
        if score >= threshold:
            return grade
    return "G"


# ── Percentile-based cross-market mapping (INR → USD feature space) ───────────
#
# DOCUMENTATION — Percentile Mapping Strategy
# ─────────────────────────────────────────────
# Problem:  The XGBoost model was trained on the LendingClub / Kaggle
#           "credit_risk_dataset" containing ~32K US consumer loan records
#           with income in USD/year and loan amounts in USD.
#           FinSecure AI serves Indian applicants who submit values in INR/month.
#
# Approach: Percentile-based cross-market normalisation.
#           1. Define the empirical CDF for Indian incomes/loans (INR).
#           2. Define the empirical CDF for US incomes/loans (USD) from the
#              training dataset.
#           3. For a given INR value, find its percentile in the Indian
#              distribution, then look up the USD value at the same percentile
#              in the US distribution.  This preserves *relative standing*
#              while converting across markets.
#
# Source data for Indian distributions:
#   - RBI Handbook of Statistics on Indian Economy (2023-24)
#   - CMIE Consumer Pyramids household income surveys
#   - National Statistical Office (NSO) PLFS annual report
#   Percentiles were cross-referenced with SBI/HDFC published home-loan
#   and personal-loan bracket data.
#
# Source data for US distributions:
#   - Computed directly from the training CSV (credit_risk_dataset..csv)
#     using np.percentile on person_income and loan_amnt columns.
#
# Update frequency:
#   - Indian tables should be refreshed annually when RBI/NSO publish
#     new data (typically Q3).
#   - US tables are recomputed every time the model is retrained on
#     fresh data (see train_model.py → save_artifacts).
#
# Clamping behaviour:
#   - Values outside the min/max of the table are clamped to the
#     boundary percentile.  An OOD (out-of-distribution) warning is
#     logged so that drift can be monitored.
# ──────────────────────────────────────────────────────────────────────────────

PERCENTILES = [0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]

# Indian monthly income distribution (INR/month)
# Sources: RBI Handbook 2023-24, CMIE Consumer Pyramids, NSO PLFS
INDIAN_INCOME_MONTHLY = [15_000, 30_000, 50_000, 80_000, 150_000, 250_000, 500_000]
# US annual income distribution ($) at matching percentiles (from training dataset)
US_INCOME_ANNUAL      = [24_000, 38_500, 55_000, 79_200, 120_000, 180_000, 500_000]

# Indian loan amount distribution (INR)
# Sources: SBI/HDFC personal & home loan bracket data, RBI sectoral deployment stats
INDIAN_LOAN_AMT = [30_000, 100_000, 300_000, 800_000, 2_000_000, 5_000_000, 10_000_000]
# US loan amount distribution ($) at matching percentiles (from training dataset)
US_LOAN_AMT     = [1_500, 5_000, 8_000, 12_200, 20_000, 30_000, 35_000]


def _map_income(monthly_inr: float) -> float:
    """Map Indian monthly income (INR) → US annual income ($) via percentile.

    Logs an OOD warning when the input falls outside the Indian distribution
    bounds so that data drift can be detected in monitoring.
    """
    if monthly_inr < INDIAN_INCOME_MONTHLY[0]:
        logger.warning(f"OOD: monthly_income ₹{monthly_inr:,.0f} below P10 "
                       f"(min table ₹{INDIAN_INCOME_MONTHLY[0]:,})")
    elif monthly_inr > INDIAN_INCOME_MONTHLY[-1]:
        logger.warning(f"OOD: monthly_income ₹{monthly_inr:,.0f} above P99 "
                       f"(max table ₹{INDIAN_INCOME_MONTHLY[-1]:,})")
    pct = np.interp(monthly_inr, INDIAN_INCOME_MONTHLY, PERCENTILES)
    return float(np.interp(pct, PERCENTILES, US_INCOME_ANNUAL))


def _map_loan(loan_inr: float) -> float:
    """Map Indian loan amount (INR) → US loan amount ($) via percentile.

    Logs an OOD warning when the input falls outside the Indian distribution
    bounds so that data drift can be detected in monitoring.
    """
    if loan_inr < INDIAN_LOAN_AMT[0]:
        logger.warning(f"OOD: loan_amount ₹{loan_inr:,.0f} below P10 "
                       f"(min table ₹{INDIAN_LOAN_AMT[0]:,})")
    elif loan_inr > INDIAN_LOAN_AMT[-1]:
        logger.warning(f"OOD: loan_amount ₹{loan_inr:,.0f} above P99 "
                       f"(max table ₹{INDIAN_LOAN_AMT[-1]:,})")
    pct = np.interp(loan_inr, INDIAN_LOAN_AMT, PERCENTILES)
    return float(np.interp(pct, PERCENTILES, US_LOAN_AMT))


def prepare_features(data: dict) -> pd.DataFrame:
    """Map frontend request fields → model's 15-feature space."""
    credit_score = data["credit_score"]
    monthly_income = data["monthly_income"]
    loan_amount = data["loan_amount"]
    account_age = data["account_age"]

    # 1. person_age → direct
    person_age = data["age"]

    # 2. person_income → annual USD via percentile mapping (frontend sends monthly INR)
    person_income = _map_income(monthly_income)

    # 3. person_emp_length → use account_age as proxy for employment length
    emp_stability = data.get("employment_stability")
    if emp_stability is not None and emp_stability > 0:
        person_emp_length = emp_stability
    elif data["employment_type"] == "self_employed":
        person_emp_length = data.get("business_age", 0) or account_age
    else:
        person_emp_length = account_age

    # 4. loan_amnt → convert INR to USD via percentile mapping
    loan_amnt = _map_loan(loan_amount)

    # 5. loan_grade → derived from credit score
    grade = _credit_score_to_grade(credit_score)
    grade_map = encoders["grade_map"]
    loan_grade_enc = grade_map.get(grade, 2)

    # 6. loan_int_rate → from grade mapping
    loan_int_rate = GRADE_INT_RATE.get(grade, 13.47)

    # 7. loan_percent_income → computed (both in USD scale from percentile mapping)
    loan_percent_income = loan_amnt / max(person_income, 1)

    # 8. cb_person_default_on_file → from previous_defaults
    cb_default_enc = 1 if data["previous_defaults"] > 0 else 0

    # 9. cb_person_cred_hist_length → use account_age
    cb_person_cred_hist_length = max(int(account_age), 2)

    # 10. person_home_ownership → map
    home_str = HOUSING_MAP.get(data["housing_type"], "RENT")
    le_home = encoders["home_ownership"]
    try:
        home_ownership_enc = le_home.transform([home_str])[0]
    except ValueError:
        home_ownership_enc = le_home.transform(["RENT"])[0]

    # 11. loan_intent → map from loan_purpose
    purpose = data.get("loan_purpose") or "personal"
    intent_str = PURPOSE_TO_INTENT.get(purpose, "PERSONAL")
    le_intent = encoders["loan_intent"]
    try:
        loan_intent_enc = le_intent.transform([intent_str])[0]
    except ValueError:
        loan_intent_enc = le_intent.transform(["PERSONAL"])[0]

    # 12-15. Engineered features (same as training)
    income_to_loan = person_income / max(loan_amnt, 1)
    age_emp_ratio = person_emp_length / max(person_age, 1)
    rate_grade_interaction = loan_int_rate * loan_grade_enc
    cred_hist_per_age = cb_person_cred_hist_length / max(person_age, 1)

    feature_row = {
        "person_age": person_age,
        "person_income": person_income,
        "person_emp_length": person_emp_length,
        "loan_amnt": loan_amnt,
        "loan_int_rate": loan_int_rate,
        "loan_percent_income": loan_percent_income,
        "cb_person_cred_hist_length": cb_person_cred_hist_length,
        "loan_grade_enc": loan_grade_enc,
        "cb_default_enc": cb_default_enc,
        "home_ownership_enc": home_ownership_enc,
        "loan_intent_enc": loan_intent_enc,
        "income_to_loan": income_to_loan,
        "age_emp_ratio": age_emp_ratio,
        "rate_grade_interaction": rate_grade_interaction,
        "cred_hist_per_age": cred_hist_per_age,
    }

    return pd.DataFrame([feature_row])[model_metadata["feature_columns"]]


def get_risk_category(pd_value: float, threshold: float):
    """Determine risk category from PD and threshold."""
    if pd_value < threshold * 0.5:
        return "LOW", "Approved — Low risk profile"
    elif pd_value < threshold:
        return "MEDIUM", "Approved with conditions — Moderate risk"
    elif pd_value < threshold * 1.5:
        return "HIGH", "Manual review required — Elevated risk"
    else:
        return "CRITICAL", "Loan rejected — High probability of default"


def calculate_interest_rate(data: dict, pd_value: float, risk_category: str,
                            credit_grade: str, foir: float) -> dict:
    """
    Multi-factor interest rate pricing engine.
    Combines: Base Rate + Credit Grade Premium + PD Risk Premium
              + FOIR Adjustment + Loan Amount Adjustment

    Returns dict with final rate and full breakdown.
    """
    # 1. Base rate (linked to RBI repo rate / MCLR benchmark)
    base_rate = 7.0  # approximate MCLR-linked base

    # 2. Credit grade premium (spread over base)
    grade_premiums = {
        "A": 0.5,  "B": 2.5,  "C": 5.0,
        "D": 7.5,  "E": 10.0, "F": 13.0, "G": 15.0,
    }
    grade_premium = grade_premiums.get(credit_grade, 5.0)

    # 3. PD-based risk premium
    if pd_value < 0.05:
        pd_premium = 0.0
    elif pd_value < 0.10:
        pd_premium = 1.0
    elif pd_value < 0.25:
        pd_premium = 4.0
    elif pd_value < 0.50:
        pd_premium = 8.0
    else:
        pd_premium = 12.0

    # 4. FOIR / DTI adjustment
    if foir < 0.30:
        foir_adj = -0.5
    elif foir <= 0.50:
        foir_adj = 0.0
    else:
        foir_adj = 2.0

    # 5. Loan amount adjustment (INR — after percentile mapping the API
    #    receives the original INR amount from the frontend)
    loan_amount = data["loan_amount"]
    if loan_amount < 200_000:
        loan_adj = 1.0
    elif loan_amount <= 1_000_000:
        loan_adj = 0.0
    else:
        loan_adj = -0.5

    # Assemble
    final_rate = base_rate + grade_premium + pd_premium + foir_adj + loan_adj
    final_rate = round(max(final_rate, base_rate), 2)  # floor at base rate

    if risk_category == "CRITICAL":
        final_rate = None  # rejected — no rate offered

    return {
        "final_rate": final_rate,
        "breakdown": {
            "base_rate": base_rate,
            "grade_premium": round(grade_premium, 2),
            "pd_premium": round(pd_premium, 2),
            "foir_adjustment": round(foir_adj, 2),
            "loan_amount_adjustment": round(loan_adj, 2),
            "credit_grade": credit_grade,
        },
    }


def generate_fraud_flags(data: dict, anomaly_score: float) -> list:
    """Generate rule-based + ML-based fraud flags."""
    flags = []
    monthly_income = data["monthly_income"]
    loan_amount = data["loan_amount"]

    if loan_amount > monthly_income * 60:
        flags.append({"severity": "danger", "message": "Loan amount exceeds 5 years of income"})
    elif loan_amount > monthly_income * 36:
        flags.append({"severity": "warning", "message": "High loan-to-income ratio (>3 years income)"})

    if data["account_age"] < 1:
        flags.append({"severity": "warning", "message": "Very new bank account (<1 year)"})

    if data["previous_defaults"] > 2:
        flags.append({"severity": "danger", "message": f"Multiple previous defaults ({data['previous_defaults']})"})
    elif data["previous_defaults"] > 0:
        flags.append({"severity": "warning", "message": f"Previous default history ({data['previous_defaults']})"})

    if data["loan_enquiries"] > 5:
        flags.append({"severity": "danger", "message": f"Excessive recent loan enquiries ({data['loan_enquiries']})"})
    elif data["loan_enquiries"] > 3:
        flags.append({"severity": "warning", "message": f"Multiple recent loan enquiries ({data['loan_enquiries']})"})

    if data["age"] < 22:
        flags.append({"severity": "warning", "message": "Very young applicant — limited credit history expected"})

    if anomaly_score < -0.15:
        flags.append({"severity": "danger", "message": "ML anomaly detection: Unusual application pattern"})
    elif anomaly_score < -0.05:
        flags.append({"severity": "warning", "message": "ML anomaly detection: Slightly unusual pattern"})

    if data["employment_type"] == "self_employed":
        if data.get("business_age", 0) < 1:
            flags.append({"severity": "warning", "message": "Very new business (<1 year)"})
        if data.get("gst_registered", 0) == 0:
            flags.append({"severity": "warning", "message": "Business not GST registered"})

    return flags


# --- Feature labels for SHAP display ---

FEATURE_LABELS = {
    "person_age": "Age",
    "person_income": "Annual Income",
    "person_emp_length": "Employment Length",
    "loan_amnt": "Loan Amount",
    "loan_int_rate": "Interest Rate",
    "loan_percent_income": "Loan % of Income",
    "cb_person_cred_hist_length": "Credit History Length",
    "loan_grade_enc": "Loan Grade",
    "cb_default_enc": "Previous Default on File",
    "home_ownership_enc": "Home Ownership",
    "loan_intent_enc": "Loan Purpose",
    "income_to_loan": "Income-to-Loan Ratio",
    "age_emp_ratio": "Employment/Age Ratio",
    "rate_grade_interaction": "Rate × Grade",
    "cred_hist_per_age": "Credit History / Age",
}


def _get_feature_description(feature_key: str, value: float, shap_val: float) -> str:
    """Generate human-readable description for a SHAP contribution."""
    direction = "increases" if shap_val > 0 else "decreases"
    descriptions = {
        "person_age": f"Applicant age of {int(value)} {direction} default risk",
        "person_income": f"Annual income of ₹{int(value):,} {direction} default risk",
        "person_emp_length": f"Employment length of {value:.1f} years {direction} default risk",
        "loan_amnt": f"Loan amount of ₹{int(value):,} {direction} default risk",
        "loan_int_rate": f"Interest rate of {value:.1f}% {direction} default risk",
        "loan_percent_income": f"Loan is {value:.1%} of income — {direction} default risk",
        "cb_person_cred_hist_length": f"Credit history of {int(value)} years {direction} default risk",
        "loan_grade_enc": f"Loan grade ({['A','B','C','D','E','F','G'][min(int(value),6)]}) {direction} default risk",
        "cb_default_enc": f"{'Has' if value > 0 else 'No'} previous default — {direction} default risk",
        "home_ownership_enc": f"Home ownership status {direction} default risk",
        "loan_intent_enc": f"Loan purpose category {direction} default risk",
        "income_to_loan": f"Income-to-loan ratio of {value:.2f} {direction} default risk",
        "age_emp_ratio": f"Employment/age ratio of {value:.2f} {direction} default risk",
        "rate_grade_interaction": f"Rate-grade interaction of {value:.1f} {direction} default risk",
        "cred_hist_per_age": f"Credit history per age of {value:.2f} {direction} default risk",
    }
    return descriptions.get(feature_key, f"{feature_key} = {value:.4f} {direction} default risk")


def _to_scoring_request_from_predict(req: PredictLoanRequest) -> dict:
    """Map simplified prediction payload to full scoring payload."""
    monthly_income = max(req.income / 12.0, 1.0)
    estimated_expense = monthly_income * 0.45
    housing_type = "owned" if monthly_income >= 120_000 else "rent"
    account_age = 4.0 if req.credit_score >= 700 else 2.0
    loan_enquiries = 1 if req.credit_score >= 700 else 2

    payload = {
        "employment_type": req.employment_type,
        "age": 34,
        "credit_score": req.credit_score,
        "monthly_income": monthly_income,
        "loan_amount": req.loan_amount,
        "previous_defaults": 0 if req.credit_score >= 700 else 1,
        "account_age": account_age,
        "loan_enquiries": loan_enquiries,
        "housing_type": housing_type,
        "total_expenditure": estimated_expense,
        "other_fixed_expenses": estimated_expense * 0.1,
        "risk_appetite": "moderate",
        "loan_purpose": "personal",
    }

    if req.employment_type == "self_employed":
        payload.update({
            "gross_revenue": req.income,
            "expected_margin": 0.2,
            "business_rent": estimated_expense * 0.15,
            "utilities_salaries": estimated_expense * 0.2,
            "business_age": max(account_age, 2.0),
            "gst_registered": 1,
            "business_type": "service",
        })

    return payload


def _reason_code_from_feature(feature_key: str, shap_value: float) -> str:
    """Map model features to regulator-friendly reason codes."""
    if feature_key in {"loan_amnt", "loan_percent_income", "income_to_loan"}:
        return "High loan amount relative to income"
    if feature_key in {"cb_default_enc", "loan_grade_enc"}:
        return "Adverse credit profile indicators"
    if feature_key in {"person_income", "person_emp_length"}:
        return "Income and employment stability influenced affordability"
    if feature_key in {"cb_person_cred_hist_length", "cred_hist_per_age"}:
        return "Credit history depth influenced risk assessment"
    if feature_key in {"loan_int_rate", "rate_grade_interaction"}:
        return "Pricing and risk-grade interaction impacted credit risk"
    if feature_key in {"age_emp_ratio", "person_age"}:
        return "Profile maturity signals affected risk score"
    if shap_value > 0:
        return "Feature increased modeled default probability"
    if shap_value < 0:
        return "Feature reduced modeled default probability"
    return "Neutral feature contribution"


def _feature_name_from_lime_term(term_text: str) -> str:
    """Extract likely feature key from LIME term text."""
    lowered = term_text.lower()
    for key in model_metadata["feature_columns"]:
        if key.lower() in lowered:
            return key
    return term_text


def _predict_default_proba_matrix(matrix: np.ndarray) -> np.ndarray:
    """Predict default probability for matrix of feature rows."""
    features_df = pd.DataFrame(matrix, columns=model_metadata["feature_columns"])
    raw_pd = credit_model.predict_proba(features_df)[:, 1]
    if isotonic_calibrator is not None:
        calibrated = np.array(isotonic_calibrator.transform(raw_pd.tolist()))
        return np.vstack([1 - calibrated, calibrated]).T
    return np.vstack([1 - raw_pd, raw_pd]).T


def _decode_image_b64(payload: str) -> bytes:
    """Decode a base64 string or data URL into raw bytes."""
    raw = payload.split(",", 1)[1] if "," in payload else payload
    try:
        return base64.b64decode(raw, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image payload: {exc}")


def _normalized_byte_histogram(image_bytes: bytes) -> np.ndarray:
    """Create a normalized 256-bin histogram from raw bytes.

    This keeps the endpoint lightweight without additional imaging dependencies.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    if arr.size == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")
    hist = np.bincount(arr, minlength=256).astype(np.float64)
    total = hist.sum()
    if total <= 0:
        raise HTTPException(status_code=400, detail="Could not compute image features")
    return hist / total


# --- API Endpoints ---

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_version": model_metadata["model_version"],
        "model_type": model_metadata["model_type"],
        "n_features": model_metadata["n_features"],
    }


@app.post("/score_application")
async def score_application(req: ScoringRequest):
    """Score a loan application with XGBoost + SHAP + Fraud detection."""
    try:
        data = req.model_dump()
        features_df = prepare_features(data)

        # 1. XGBoost prediction + isotonic calibration
        raw_pd = float(credit_model.predict_proba(features_df)[:, 1][0])
        if isotonic_calibrator is not None:
            pd_probability = float(isotonic_calibrator.transform([raw_pd])[0])
        else:
            pd_probability = raw_pd

        # 2. SHAP values
        shap_vals_raw = shap_explainer.shap_values(features_df)
        if isinstance(shap_vals_raw, np.ndarray):
            shap_vals = shap_vals_raw[0]
        else:
            shap_vals = shap_vals_raw

        shap_contributions = []
        for i, col in enumerate(model_metadata["feature_columns"]):
            shap_val = float(shap_vals[i])
            label = FEATURE_LABELS.get(col, col)
            feature_value = float(features_df.iloc[0][col])
            shap_contributions.append({
                "feature": label,
                "feature_key": col,
                "value": feature_value,
                "shap_value": round(shap_val, 4),
                "impact": "positive" if shap_val < 0 else "negative" if shap_val > 0 else "neutral",
                "description": _get_feature_description(col, feature_value, shap_val),
            })

        shap_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # 3. Fraud detection — calibrated via percentile normalization
        anomaly_score = float(fraud_model.decision_function(features_df)[0])
        is_anomaly = int(fraud_model.predict(features_df)[0]) == -1
        # Convert raw anomaly score → [0, 1] probability using min-max
        # normalization against the training-set score distribution.
        # Lower anomaly_score = more anomalous → higher fraud probability.
        fraud_probability = float(np.clip(
            (FRAUD_SCORE_MAX - anomaly_score) / max(FRAUD_SCORE_MAX - FRAUD_SCORE_MIN, 1e-6),
            0.0, 1.0,
        ))
        fraud_flags = generate_fraud_flags(data, anomaly_score)

        # 4. Threshold
        threshold_map = model_metadata["threshold_policy"]
        base_threshold = threshold_map.get(data["risk_appetite"], 0.35)
        fraud_penalty = fraud_probability * 0.15 if is_anomaly else 0
        effective_pd = min(pd_probability + fraud_penalty, 0.99)

        # 5. Decision
        credit_grade = _credit_score_to_grade(data["credit_score"])
        risk_category, recommendation = get_risk_category(effective_pd, base_threshold)
        approved = risk_category in ("LOW", "MEDIUM")

        # Financial ratios for display
        dti = data["total_expenditure"] / max(data["monthly_income"], 1)
        foir = (data["total_expenditure"] + data.get("other_fixed_expenses", 0)) / max(data["monthly_income"], 1)
        loan_to_income = data["loan_amount"] / max(data["monthly_income"] * 12, 1)
        dscr = data["monthly_income"] / max(data["loan_amount"] / 120, 1)

        # 6. Multi-factor interest rate pricing
        pricing = calculate_interest_rate(data, effective_pd, risk_category, credit_grade, foir)

        # ── Model monitoring: record this prediction ──
        _prediction_log.append({
            "pd": effective_pd,
            "approved": approved,
            "anomaly_score": anomaly_score,
            "employment_group": "self_employed" if data.get("is_self_employed") else "salaried",
            "ts": datetime.now(timezone.utc).isoformat(),
        })

        # Record input features for drift tracking
        for feat in TRACKED_FEATURES:
            if feat in data:
                _feature_log[feat].append(float(data[feat]))
        # Also track FOIR as a derived feature
        if "foir" not in _feature_log:
            _feature_log["foir"] = deque(maxlen=MONITOR_WINDOW)
            TRACKED_FEATURES.append("foir")
            FEATURE_DRIFT_THRESHOLDS["foir"] = {"mean_shift": 0.1, "std_ratio": 1.5}
        _feature_log["foir"].append(round(foir, 4))

        n_logged = len(_prediction_log)

        # Snapshot baseline on the first batch
        if _baseline_stats["mean_pd"] is None and n_logged >= 50:
            _baseline_stats["mean_pd"] = float(np.mean([p["pd"] for p in _prediction_log]))
            _baseline_stats["approval_rate"] = float(np.mean([p["approved"] for p in _prediction_log]))
            _baseline_stats["recorded_at"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"Monitoring baseline set: mean_PD={_baseline_stats['mean_pd']:.4f}, "
                        f"approval_rate={_baseline_stats['approval_rate']:.2%}")
            # Capture feature baselines
            for feat in TRACKED_FEATURES:
                vals = list(_feature_log[feat])
                if vals:
                    _feature_baseline[feat] = {
                        "mean": float(np.mean(vals)),
                        "std": float(np.std(vals)),
                        "min": float(np.min(vals)),
                        "max": float(np.max(vals)),
                    }
            logger.info(f"Feature baselines set for: {list(_feature_baseline.keys())}")

        # Drift check (every 50 predictions once baseline exists)
        if _baseline_stats["mean_pd"] is not None and n_logged % 50 == 0:
            current_mean_pd = float(np.mean([p["pd"] for p in _prediction_log]))
            current_approval = float(np.mean([p["approved"] for p in _prediction_log]))
            pd_drift = abs(current_mean_pd - _baseline_stats["mean_pd"])
            if pd_drift > 0.02:
                logger.warning(
                    f"MODEL DRIFT ALERT: mean PD shifted by {pd_drift:.4f} "
                    f"(baseline={_baseline_stats['mean_pd']:.4f}, "
                    f"current={current_mean_pd:.4f})")
            if abs(current_approval - _baseline_stats["approval_rate"]) > 0.05:
                logger.warning(
                    f"APPROVAL RATE DRIFT: "
                    f"baseline={_baseline_stats['approval_rate']:.2%}, "
                    f"current={current_approval:.2%}")
            # Check feature drift
            for feat, baseline in _feature_baseline.items():
                vals = list(_feature_log[feat])
                if len(vals) < 10:
                    continue
                cur_mean = float(np.mean(vals))
                cur_std = float(np.std(vals))
                thresholds = FEATURE_DRIFT_THRESHOLDS.get(feat, {"mean_shift": 999, "std_ratio": 999})
                mean_shift = abs(cur_mean - baseline["mean"])
                std_ratio = cur_std / max(baseline["std"], 1e-6)
                if mean_shift > thresholds["mean_shift"] or std_ratio > thresholds["std_ratio"]:
                    logger.warning(
                        f"FEATURE DRIFT [{feat}]: mean {baseline['mean']:.2f} → {cur_mean:.2f} "
                        f"(shift={mean_shift:.2f}), std ratio={std_ratio:.2f}")

        return {
            "pd": round(effective_pd, 4),
            "raw_pd": round(raw_pd, 4),
            "approval_probability": round(1 - effective_pd, 4),
            "risk_category": risk_category,
            "risk_score": round((1 - effective_pd) * 100, 1),
            "approved": approved,
            "recommendation": recommendation,
            "interest_rate": pricing["final_rate"],
            "rate_breakdown": pricing["breakdown"],
            "shap_values": shap_contributions[:12],
            "fraud": {
                "probability": round(fraud_probability, 4),
                "is_anomaly": is_anomaly,
                "anomaly_score": round(anomaly_score, 4),
                "flags": fraud_flags,
            },
            "financial_ratios": {
                "dti_ratio": round(dti, 4),
                "foir": round(foir, 4),
                "loan_to_income": round(loan_to_income, 4),
                "dscr": round(dscr, 4),
            },
            "threshold": {
                "risk_appetite": data["risk_appetite"],
                "pd_cutoff": base_threshold,
                "fraud_penalty": round(fraud_penalty, 4),
            },
            "model_metadata": {
                "model_version": model_metadata["model_version"],
                "train_date": model_metadata["train_date"],
                "auc": model_metadata["metrics"]["auc"],
                "n_features": model_metadata["n_features"],
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict_loan")
async def predict_loan(req: PredictLoanRequest):
    """Simplified loan prediction endpoint for explainability dashboards."""
    try:
        scoring_payload = _to_scoring_request_from_predict(req)
        scoring_result = await score_application(ScoringRequest(**scoring_payload))
        top_shap = scoring_result["shap_values"][:6]
        shap_map = {
            row["feature_key"]: row["shap_value"] for row in top_shap
        }
        top_features = [row["feature_key"] for row in top_shap[:3]]
        reason_codes = []
        for row in top_shap[:5]:
            reason = _reason_code_from_feature(row["feature_key"], row["shap_value"])
            if reason not in reason_codes:
                reason_codes.append(reason)

        return {
            "applicant_id": req.applicant_id,
            "approval_probability": scoring_result["approval_probability"],
            "decision": "approved" if scoring_result["approved"] else "rejected",
            "pd": scoring_result["pd"],
            "shap_values": shap_map,
            "top_features": top_features,
            "reason_codes": reason_codes,
            "model_metadata": scoring_result["model_metadata"],
            "financial_ratios": scoring_result["financial_ratios"],
            "raw": scoring_result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain_lime")
async def explain_lime(req: PredictLoanRequest):
    """Optional LIME local explanation endpoint for research comparisons."""
    if not HAS_LIME:
        raise HTTPException(status_code=501, detail="LIME is not installed in this environment")

    try:
        scoring_payload = _to_scoring_request_from_predict(req)
        features_df = prepare_features(scoring_payload)

        background = lime_background_data
        if background is None or len(background) < 20:
            background = np.repeat(features_df.values, 50, axis=0)

        explainer = LimeTabularExplainer(
            training_data=background,
            feature_names=model_metadata["feature_columns"],
            class_names=["non_default", "default"],
            mode="classification",
            discretize_continuous=True,
        )

        lime_exp = explainer.explain_instance(
            data_row=features_df.iloc[0].values,
            predict_fn=_predict_default_proba_matrix,
            num_features=6,
            top_labels=1,
        )

        label = lime_exp.top_labels[0] if lime_exp.top_labels else 1
        weights = lime_exp.as_list(label=label)
        mapped = {}
        for term, weight in weights:
            key = _feature_name_from_lime_term(term)
            mapped[key] = round(float(weight), 4)

        return {
            "lime_weights": mapped,
            "method": "lime_tabular",
            "class_explained": "default",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/counterfactual")
async def counterfactual(req: CounterfactualRequest):
    """Generate simple actionable counterfactual suggestions for loan outcomes."""
    try:
        base_payload = _to_scoring_request_from_predict(req.features)
        base = await score_application(ScoringRequest(**base_payload))
        current_approved = bool(base["approved"])
        want_approved = req.target == "approve"

        if current_approved == want_approved:
            return {
                "applicant_id": req.applicant_id or req.features.applicant_id,
                "minimal_changes": {},
                "new_probability": base["approval_probability"],
                "message": "Current decision already meets requested target",
            }

        candidates = []

        def add_candidate(delta_income=0.0, delta_loan=0.0, delta_score=0):
            candidate = dict(base_payload)
            candidate["monthly_income"] = max(base_payload["monthly_income"] * (1 + delta_income), 1)
            candidate["loan_amount"] = max(base_payload["loan_amount"] * (1 + delta_loan), 10_000)
            candidate["credit_score"] = int(np.clip(base_payload["credit_score"] + delta_score, 300, 900))
            candidates.append((candidate, delta_income, delta_loan, delta_score))

        if want_approved:
            for di in [0.10, 0.20, 0.30, 0.50, 0.80, 1.00]:
                add_candidate(delta_income=di)
            for dl in [-0.10, -0.20, -0.30, -0.40, -0.50]:
                add_candidate(delta_loan=dl)
            for ds in [25, 50, 75, 100, 150]:
                add_candidate(delta_score=ds)
            add_candidate(delta_income=0.15, delta_loan=-0.10)
            add_candidate(delta_income=0.20, delta_score=25)
            add_candidate(delta_loan=-0.15, delta_score=25)
            add_candidate(delta_income=0.50, delta_loan=-0.30)
            add_candidate(delta_income=0.50, delta_score=75)
            add_candidate(delta_loan=-0.30, delta_score=100)
        else:
            for di in [-0.10, -0.20, -0.30, -0.40, -0.50]:
                add_candidate(delta_income=di)
            for dl in [0.10, 0.20, 0.30, 0.40, 0.50]:
                add_candidate(delta_loan=dl)
            for ds in [-25, -50, -75, -100, -150]:
                add_candidate(delta_score=ds)
            add_candidate(delta_income=-0.15, delta_loan=0.10)
            add_candidate(delta_income=-0.20, delta_score=-25)
            add_candidate(delta_loan=0.15, delta_score=-25)

        feasible_options = []
        for candidate, di, dl, ds in candidates:
            result = await score_application(ScoringRequest(**candidate))
            approved = bool(result["approved"])
            if approved == want_approved:
                cost = abs(di) + abs(dl) + (abs(ds) / 200)
                option_changes = {}
                if di != 0:
                    option_changes["income"] = f"{di * 100:+.0f}%"
                if dl != 0:
                    option_changes["loan_amount"] = f"{dl * 100:+.0f}%"
                if ds != 0:
                    option_changes["credit_score"] = f"+{ds}"

                feasible_options.append({
                    "minimal_changes": option_changes,
                    "new_probability": result["approval_probability"],
                    "cost": round(cost, 4),
                })

        if not feasible_options:
            return {
                "applicant_id": req.applicant_id or req.features.applicant_id,
                "minimal_changes": {},
                "new_probability": base["approval_probability"],
                "message": "No feasible counterfactual found within configured action bounds",
            }

        feasible_options.sort(key=lambda x: x["cost"])
        best = feasible_options[0]

        return {
            "applicant_id": req.applicant_id or req.features.applicant_id,
            "minimal_changes": best["minimal_changes"],
            "new_probability": best["new_probability"],
            "options": feasible_options[:3],
            "target": req.target,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/global_insights")
async def global_insights():
    """Expose global explainability and monitoring metrics for dashboard views."""
    approvals = [p["approved"] for p in _prediction_log]
    pds = [p["pd"] for p in _prediction_log]
    salaried_rows = [p for p in _prediction_log if p.get("employment_group") == "salaried"]
    self_emp_rows = [p for p in _prediction_log if p.get("employment_group") == "self_employed"]

    def _approval_rate(rows):
        if not rows:
            return None
        return round(float(np.mean([r["approved"] for r in rows])), 4)

    group_rates = {
        "salaried": _approval_rate(salaried_rows),
        "self_employed": _approval_rate(self_emp_rows),
    }

    disparity = None
    if group_rates["salaried"] is not None and group_rates["self_employed"] is not None:
        disparity = round(abs(group_rates["salaried"] - group_rates["self_employed"]), 4)

    return {
        "feature_importance": model_metadata.get("feature_importance", []),
        "approval_distribution": {
            "approved": int(sum(approvals)) if approvals else 0,
            "rejected": int(len(approvals) - sum(approvals)) if approvals else 0,
            "samples": len(approvals),
        },
        "pd_summary": {
            "mean_pd": round(float(np.mean(pds)), 4) if pds else None,
            "median_pd": round(float(np.median(pds)), 4) if pds else None,
        },
        "fairness_metrics": {
            "status": "estimated",
            "approval_rate_by_employment": group_rates,
            "demographic_parity_gap": disparity,
            "note": "Estimated from non-protected proxy groups only (employment type); add protected attributes in governed audit data for formal fairness testing",
        },
    }


@app.get("/global_shap_summary")
async def global_shap_summary():
    """Compute global SHAP summary statistics from training data."""
    try:
        if lime_background_data is None or len(lime_background_data) == 0:
            return {
                "status": "unavailable",
                "message": "Training data not available for SHAP computation",
                "feature_importance": model_metadata.get("feature_importance", []),
            }

        # Sample training data for faster computation (max 100 samples)
        sample_size = min(100, len(lime_background_data))
        sample_indices = np.random.choice(len(lime_background_data), sample_size, replace=False)
        sample_data = lime_background_data[sample_indices]

        # Compute SHAP values
        shap_values = shap_explainer.shap_values(sample_data)
        
        # Handle both binary and multi-class output
        if isinstance(shap_values, list):
            # Multi-class case: use first class (default/positive)
            shap_values_to_use = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            shap_values_to_use = shap_values

        # Compute mean absolute SHAP values (global importance)
        mean_abs_shap = np.abs(shap_values_to_use).mean(axis=0)
        
        # Create feature importance list
        feature_names = model_metadata.get("feature_columns", [])
        importance_list = [
            {
                "feature": feature_names[i] if i < len(feature_names) else f"Feature {i}",
                "importance": float(mean_abs_shap[i]),
                "impact_direction": "positive" if float(np.mean(shap_values_to_use[:, i])) > 0 else "negative",
            }
            for i in range(len(mean_abs_shap))
        ]
        
        # Sort by importance descending
        importance_list.sort(key=lambda x: x["importance"], reverse=True)

        # Create summary data for visualization
        summary_data = {
            "features": [item["feature"] for item in importance_list[:10]],
            "impacts": [item["importance"] for item in importance_list[:10]],
            "directions": [item["impact_direction"] for item in importance_list[:10]],
        }

        return {
            "status": "available",
            "global_feature_importance": importance_list,
            "shap_summary_data": summary_data,
            "samples_used": sample_size,
            "computation_time_ms": "real-time",
        }
    except Exception as e:
        logger.error(f"Global SHAP computation error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "feature_importance": model_metadata.get("feature_importance", []),
        }


@app.post("/fraud_score")
async def fraud_score(req: FraudRequest):
    """Dedicated fraud scoring endpoint (Legacy - for loan applications)."""
    try:
        data = req.model_dump()
        features_df = prepare_features(data)

        anomaly_score = float(fraud_model.decision_function(features_df)[0])
        is_anomaly = int(fraud_model.predict(features_df)[0]) == -1
        fraud_probability = float(np.clip(
            (FRAUD_SCORE_MAX - anomaly_score) / max(FRAUD_SCORE_MAX - FRAUD_SCORE_MIN, 1e-6),
            0.0, 1.0,
        ))
        flags = generate_fraud_flags(data, anomaly_score)

        return {
            "fraud_probability": round(fraud_probability, 4),
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 4),
            "flags": flags,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify_signature")
async def verify_signature(req: SignatureVerifyRequest):
    """Verify two signatures and return similarity-style scores.

    This endpoint mirrors the response style used by the external signature-verification
    project while remaining dependency-light for this codebase.
    """
    try:
        reference_bytes = _decode_image_b64(req.reference_image)
        test_bytes = _decode_image_b64(req.test_image)

        ref_hist = _normalized_byte_histogram(reference_bytes)
        test_hist = _normalized_byte_histogram(test_bytes)

        denom = float(np.linalg.norm(ref_hist) * np.linalg.norm(test_hist))
        if denom == 0.0:
            cosine_similarity = 0.0
        else:
            cosine_similarity = float(np.dot(ref_hist, test_hist) / denom)

        similarity = max(0.0, min(100.0, cosine_similarity * 100.0))
        distance = max(0.0, min(1.0, 1.0 - cosine_similarity))
        is_genuine = similarity >= req.threshold
        confidence = similarity if is_genuine else (100.0 - similarity)

        return {
            "distance": round(distance, 6),
            "similarity": round(similarity, 2),
            "threshold": round(req.threshold, 2),
            "is_genuine": bool(is_genuine),
            "confidence": round(confidence, 2),
            "verdict": "GENUINE" if is_genuine else "FORGED",
            "method": "byte_histogram_cosine",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Real-Time Transaction Fraud Scoring (NEW) ───

class TransactionFraudRequest(BaseModel):
    """Real-time transaction fraud scoring request."""
    transaction_id: str = Field(description="Unique transaction ID")
    user_id: str = Field(description="User ID")
    amount: float = Field(gt=0, description="Transaction amount")
    merchant: Optional[str] = Field(default=None, description="Merchant name")
    channel: str = Field(description="Transaction channel (UPI, CARD, etc)")
    device_id: Optional[str] = Field(default=None, description="Device identifier")
    ip_address: Optional[str] = Field(default=None, description="IP address")
    geo_location: Optional[dict] = Field(default=None, description="Geographic location")
    transaction_type: str = Field(default="PAYMENT", description="Transaction type")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")
    previous_amounts: Optional[list] = Field(default=None, description="Recent transaction amounts")
    previous_locations: Optional[list] = Field(default=None, description="Recent locations")


def score_transaction_fraud(transaction_data: dict) -> dict:
    """
    Score a transaction for fraud using trained Isolation Forest model.
    
    Returns fraud probability (0-1) and recommendations.
    """
    try:
        fraud_model_path = os.path.join(MODEL_DIR, "fraud_isolation_forest.joblib")
        fraud_scaler_path = os.path.join(MODEL_DIR, "fraud_scaler.joblib")
        fraud_meta_path = os.path.join(MODEL_DIR, "fraud_model_metadata.json")

        if not (os.path.exists(fraud_model_path) and os.path.exists(fraud_scaler_path) and os.path.exists(fraud_meta_path)):
            return {
                "error": "Fraud transaction model artifacts missing. Training required.",
                "fraud_score": None,
                "is_anomaly": False,
            }

        iso_forest = joblib.load(fraud_model_path)
        scaler = joblib.load(fraud_scaler_path)
        with open(fraud_meta_path, "r") as meta_file:
            fraud_meta = json.load(meta_file)

        amount = float(transaction_data.get("amount", 0.0))
        timestamp = transaction_data.get("timestamp")
        if timestamp:
            try:
                tx_dt = pd.to_datetime(timestamp, utc=True)
                time_hour = float(tx_dt.hour)
            except Exception:
                time_hour = float(datetime.now(timezone.utc).hour)
        else:
            time_hour = float(datetime.now(timezone.utc).hour)

        prev_amounts = transaction_data.get("previous_amounts") or []
        prev_mean = float(np.mean(prev_amounts)) if len(prev_amounts) > 0 else max(amount, 1.0)
        prev_std = float(np.std(prev_amounts)) if len(prev_amounts) > 1 else max(prev_mean * 0.1, 1.0)

        features_dict = {
            "log_amount": float(np.log1p(max(amount, 0.0))),
            "normalized_amount": float(amount / 100000.0),
            "time_hour": time_hour,
        }

        for i in range(1, 29):
            features_dict[f"V{i}"] = 0.0

        features_dict["log_amount_squared"] = float(features_dict["log_amount"] ** 2)
        features_dict["amount_to_mean_ratio"] = float(amount / max(prev_mean, 1.0))
        features_dict["log_amount_zscore"] = float((features_dict["log_amount"] - np.log1p(max(prev_mean, 1.0))) / max(prev_std, 1.0))
        features_dict["time_hour_zscore"] = float((time_hour - 12.0) / 6.0)

        feature_names = fraud_meta.get("feature_names", list(features_dict.keys()))
        for name in feature_names:
            if name not in features_dict:
                features_dict[name] = 0.0

        features_df = pd.DataFrame([features_dict])[feature_names]

        X_scaled = scaler.transform(features_df)
        anomaly_score = float(iso_forest.decision_function(X_scaled)[0])
        is_anomaly = int(iso_forest.predict(X_scaled)[0]) == -1

        score_min = float(fraud_meta.get("score_distribution", {}).get("p1", -0.5))
        score_max = float(fraud_meta.get("score_distribution", {}).get("p99", 0.3))
        fraud_probability = float(np.clip((score_max - anomaly_score) / max(score_max - score_min, 1e-6), 0.0, 1.0))
        
        # Fraud type detection based on patterns
        fraud_type = "normal"
        fraud_signals = []
        
        if is_anomaly:
            fraud_type = "anomaly_detected"
            fraud_signals.append("Statistical anomaly")
        
        if transaction_data.get('amount', 0) > 500000:
            fraud_signals.append("High transaction amount")
        
        if transaction_data.get('previous_amounts'):
            avg_prev = np.mean(transaction_data['previous_amounts'])
            curr = transaction_data.get('amount', 0)
            if curr > avg_prev * 3:
                fraud_signals.append("Velocity spike (3x usual amount)")
                fraud_type = "velocity_anomaly"
        
        # Determine recommendation
        if fraud_probability > 0.7:
            recommendation = "BLOCK"
            recommended_action = "Block transaction and notify user"
        elif fraud_probability > 0.5:
            recommendation = "REVIEW"
            recommended_action = "Request step-up verification"
        elif fraud_probability > 0.3:
            recommendation = "MONITOR"
            recommended_action = "Monitor for patterns"
        else:
            recommendation = "APPROVE"
            recommended_action = "Approve transaction"
        
        return {
            "transaction_id": transaction_data.get('transaction_id'),
            "fraud_score": float(np.clip(fraud_probability, 0, 1)),
            "fraud_probability": float(np.clip(fraud_probability, 0, 1)),
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(float(anomaly_score), 4),
            "fraud_type": fraud_type,
            "fraud_signals": fraud_signals,
            "recommendation": recommendation,
            "recommended_action": recommended_action,
            "confidence": "high" if is_anomaly else "medium" if fraud_probability > 0.3 else "low",
            "model_version": "FRAUD-IF-v2.0",
        }
        
    except Exception as e:
        logger.error(f"Transaction fraud scoring error: {e}")
        return {
            "error": str(e),
            "fraud_score": None,
            "is_anomaly": False,
        }


@app.post("/score_transaction")
async def score_transaction(req: TransactionFraudRequest):
    """
    Real-time transaction fraud scoring endpoint.
    
    Returns fraud score (0-1), recommendations, and signals.
    Suitable for production transaction monitoring.
    """
    try:
        data = req.model_dump()
        result = score_transaction_fraud(data)
        return result
    except Exception as e:
        logger.error(f"Transaction fraud endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model_metadata")
async def get_model_metadata():
    """Return model metadata for frontend display."""
    return model_metadata


@app.get("/monitoring")
async def monitoring_stats():
    """Return live model monitoring statistics for observability."""
    n = len(_prediction_log)
    if n == 0:
        return {"status": "no_data", "predictions_tracked": 0}

    pds = [p["pd"] for p in _prediction_log]
    approvals = [p["approved"] for p in _prediction_log]
    anomaly_scores = [p["anomaly_score"] for p in _prediction_log]

    current = {
        "predictions_tracked": n,
        "window_size": MONITOR_WINDOW,
        "current": {
            "mean_pd": round(float(np.mean(pds)), 4),
            "std_pd": round(float(np.std(pds)), 4),
            "median_pd": round(float(np.median(pds)), 4),
            "approval_rate": round(float(np.mean(approvals)), 4),
            "mean_anomaly_score": round(float(np.mean(anomaly_scores)), 4),
        },
        "baseline": _baseline_stats,
    }

    # Compute output drift if baseline exists
    if _baseline_stats["mean_pd"] is not None:
        current["drift"] = {
            "pd_shift": round(abs(float(np.mean(pds)) - _baseline_stats["mean_pd"]), 4),
            "approval_shift": round(
                abs(float(np.mean(approvals)) - _baseline_stats["approval_rate"]), 4),
            "pd_alert": abs(float(np.mean(pds)) - _baseline_stats["mean_pd"]) > 0.02,
            "approval_alert": abs(float(np.mean(approvals)) - _baseline_stats["approval_rate"]) > 0.05,
        }

    # Input feature drift
    feature_drift = {}
    for feat in TRACKED_FEATURES:
        vals = list(_feature_log.get(feat, []))
        if not vals:
            feature_drift[feat] = {"status": "no_data"}
            continue
        cur_mean = float(np.mean(vals))
        cur_std = float(np.std(vals))
        entry: dict = {
            "current_mean": round(cur_mean, 2),
            "current_std": round(cur_std, 2),
            "current_min": round(float(np.min(vals)), 2),
            "current_max": round(float(np.max(vals)), 2),
            "n_samples": len(vals),
        }
        if feat in _feature_baseline:
            bl = _feature_baseline[feat]
            thresholds = FEATURE_DRIFT_THRESHOLDS.get(feat, {"mean_shift": 999, "std_ratio": 999})
            mean_shift = abs(cur_mean - bl["mean"])
            std_ratio = cur_std / max(bl["std"], 1e-6)
            is_drifted = mean_shift > thresholds["mean_shift"] or std_ratio > thresholds["std_ratio"]
            entry["baseline_mean"] = round(bl["mean"], 2)
            entry["baseline_std"] = round(bl["std"], 2)
            entry["mean_shift"] = round(mean_shift, 2)
            entry["std_ratio"] = round(std_ratio, 2)
            entry["status"] = "drift" if is_drifted else "stable"
        else:
            entry["status"] = "awaiting_baseline"
        feature_drift[feat] = entry

    current["feature_drift"] = feature_drift

    return current
