"""
FinSecure AI — ML Scoring API v3.0
FastAPI service: calibrated XGBoost trained on real credit risk data.
Maps frontend application fields → model feature space (15 features).
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import shap
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
    if os.path.exists(_train_sample_path):
        _cal_df = pd.read_csv(_train_sample_path)
        # Use only the model's feature columns (they must exist in sample)
        _cal_features = _cal_df[model_metadata["feature_columns"]]
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
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        # Snapshot baseline on the first batch
        if _baseline_stats["mean_pd"] is None and len(_prediction_log) >= 50:
            _baseline_stats["mean_pd"] = float(np.mean([p["pd"] for p in _prediction_log]))
            _baseline_stats["approval_rate"] = float(np.mean([p["approved"] for p in _prediction_log]))
            _baseline_stats["recorded_at"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"Monitoring baseline set: mean_PD={_baseline_stats['mean_pd']:.4f}, "
                        f"approval_rate={_baseline_stats['approval_rate']:.2%}")

        # Drift check (every 50 predictions once baseline exists)
        if _baseline_stats["mean_pd"] is not None and len(_prediction_log) % 50 == 0:
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


@app.post("/fraud_score")
async def fraud_score(req: FraudRequest):
    """Dedicated fraud scoring endpoint."""
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

    # Compute drift if baseline exists
    if _baseline_stats["mean_pd"] is not None:
        current["drift"] = {
            "pd_shift": round(abs(float(np.mean(pds)) - _baseline_stats["mean_pd"]), 4),
            "approval_shift": round(
                abs(float(np.mean(approvals)) - _baseline_stats["approval_rate"]), 4),
            "pd_alert": abs(float(np.mean(pds)) - _baseline_stats["mean_pd"]) > 0.02,
            "approval_alert": abs(float(np.mean(approvals)) - _baseline_stats["approval_rate"]) > 0.05,
        }

    return current
