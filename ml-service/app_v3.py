"""
FinSecure AI — ML Scoring API v3.0
FastAPI service: calibrated XGBoost trained on real credit risk data.
Maps frontend application fields → model feature space (15 features).
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal

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
    print("[OK] All models and SHAP explainer loaded successfully")
    print(f"     Model version: {model_metadata['model_version']}")
    print(f"     Features: {model_metadata['n_features']}")

except Exception as e:
    print(f"Failed to load models: {e}")
    print("Run train_model.py first to generate model artifacts.")
    raise SystemExit(1)


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


def prepare_features(data: dict) -> pd.DataFrame:
    """Map frontend request fields → model's 15-feature space."""
    credit_score = data["credit_score"]
    monthly_income = data["monthly_income"]
    loan_amount = data["loan_amount"]
    account_age = data["account_age"]

    # 1. person_age → direct
    person_age = data["age"]

    # 2. person_income → annual (frontend sends monthly)
    person_income = monthly_income * 12

    # 3. person_emp_length → use account_age as proxy for employment length
    emp_stability = data.get("employment_stability")
    if emp_stability is not None and emp_stability > 0:
        person_emp_length = emp_stability
    elif data["employment_type"] == "self_employed":
        person_emp_length = data.get("business_age", 0) or account_age
    else:
        person_emp_length = account_age

    # 4. loan_amnt → direct
    loan_amnt = loan_amount

    # 5. loan_grade → derived from credit score
    grade = _credit_score_to_grade(credit_score)
    grade_map = encoders["grade_map"]
    loan_grade_enc = grade_map.get(grade, 2)

    # 6. loan_int_rate → from grade mapping
    loan_int_rate = GRADE_INT_RATE.get(grade, 13.47)

    # 7. loan_percent_income → computed
    loan_percent_income = loan_amount / max(person_income, 1)

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
    """Determine risk category and interest rate."""
    if pd_value < threshold * 0.5:
        return "LOW", 8.5, "Approved — Standard interest rate"
    elif pd_value < threshold:
        return "MEDIUM", 10.5, "Approved with conditions — Slightly higher rate"
    elif pd_value < threshold * 1.5:
        return "HIGH", 13.5, "Manual review required — High interest rate"
    else:
        return "CRITICAL", None, "Loan rejected — High probability of default"


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

        # 3. Fraud detection
        anomaly_score = float(fraud_model.decision_function(features_df)[0])
        is_anomaly = int(fraud_model.predict(features_df)[0]) == -1
        fraud_probability = max(0, min(1, 0.5 - anomaly_score))
        fraud_flags = generate_fraud_flags(data, anomaly_score)

        # 4. Threshold
        threshold_map = model_metadata["threshold_policy"]
        base_threshold = threshold_map.get(data["risk_appetite"], 0.35)
        fraud_penalty = fraud_probability * 0.15 if is_anomaly else 0
        effective_pd = min(pd_probability + fraud_penalty, 0.99)

        # 5. Decision
        risk_category, interest_rate, recommendation = get_risk_category(effective_pd, base_threshold)
        approved = risk_category in ("LOW", "MEDIUM")

        # Financial ratios for display
        dti = data["total_expenditure"] / max(data["monthly_income"], 1)
        foir = (data["total_expenditure"] + data.get("other_fixed_expenses", 0)) / max(data["monthly_income"], 1)
        loan_to_income = data["loan_amount"] / max(data["monthly_income"] * 12, 1)
        dscr = data["monthly_income"] / max(data["loan_amount"] / 120, 1)

        return {
            "pd": round(effective_pd, 4),
            "raw_pd": round(raw_pd, 4),
            "approval_probability": round(1 - effective_pd, 4),
            "risk_category": risk_category,
            "risk_score": round((1 - effective_pd) * 100, 1),
            "approved": approved,
            "recommendation": recommendation,
            "interest_rate": interest_rate,
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
        fraud_probability = max(0, min(1, 0.5 - anomaly_score))
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
