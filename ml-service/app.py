"""
FinSecure AI — ML Scoring API v2.0
FastAPI service: calibrated XGBoost + SHAP + Isolation Forest + 31 features.
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

    # Try loading isotonic calibrator (v2.0), fall back to raw
    cal_path = os.path.join(MODEL_DIR, "credit_risk_calibrated.pkl")
    if os.path.exists(cal_path):
        isotonic_calibrator = joblib.load(cal_path)
        print("[OK] Isotonic calibrator loaded")
    else:
        isotonic_calibrator = None
        print("[WARN] No calibrator found, using raw XGBoost probabilities")

    # Load background data for SHAP
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    bg_data = pd.read_csv(os.path.join(data_dir, "training_sample.csv"))

    from train_model import preprocess_data
    bg_X, _, _, _ = preprocess_data(bg_data)
    bg_sample = bg_X.sample(min(100, len(bg_X)), random_state=42)

    shap_explainer = shap.TreeExplainer(credit_model.get_booster())
    print("[OK] All models and SHAP explainer loaded successfully")

except Exception as e:
    print(f"Failed to load models: {e}")
    print("Run train_model.py first to generate model artifacts.")
    raise SystemExit(1)


# --- Pydantic Schemas ---

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

    # New v2.0 features (optional — API auto-estimates if missing)
    credit_utilization: Optional[float] = Field(default=None, ge=0, le=1)
    payment_history_length: Optional[int] = Field(default=None, ge=0)
    savings_ratio: Optional[float] = Field(default=None, ge=0, le=1)
    employment_stability: Optional[float] = Field(default=None, ge=0)
    income_volatility: Optional[float] = Field(default=None, ge=0, le=1)
    loan_purpose: Optional[Literal["home", "personal", "vehicle", "education", "business", "gold"]] = Field(default=None)
    disposable_income_ratio: Optional[float] = Field(default=None, ge=0, le=1)

    # Risk appetite
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
    title="FinSecure AI — Risk Scoring API",
    description="Real XGBoost + SHAP + Isolation Forest credit risk scoring service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def prepare_features(data: dict) -> pd.DataFrame:
    """Convert request data to model-ready feature DataFrame (31 features for v2.0)."""
    monthly_income = data["monthly_income"]
    loan_amount = data["loan_amount"]
    total_expenditure = data["total_expenditure"]
    other_fixed_expenses = data.get("other_fixed_expenses", 0)
    gross_revenue = data.get("gross_revenue", 0)
    business_rent = data.get("business_rent", 0)
    utilities_salaries = data.get("utilities_salaries", 0)
    office_rent = 0

    if data["employment_type"] == "salaried":
        office_rent = data.get("business_rent", 0)

    # Compute derived ratios
    dti_ratio = round(total_expenditure / max(monthly_income, 1), 4)
    loan_to_income = round(loan_amount / max(monthly_income * 12, 1), 4)
    foir = round((total_expenditure + other_fixed_expenses) / max(monthly_income, 1), 4)
    dscr = round(monthly_income / max(loan_amount / 120, 1), 4)

    if data["employment_type"] == "self_employed" and gross_revenue > 0:
        expense_to_revenue = round((business_rent + utilities_salaries) / max(gross_revenue, 1), 4)
    else:
        expense_to_revenue = 0

    if data["employment_type"] == "salaried":
        rental_burden = round(office_rent / max(monthly_income, 1), 4)
    else:
        rental_burden = round(business_rent / max(gross_revenue, 1) if gross_revenue > 0 else 0, 4)

    # --- New v2.0 features (auto-estimate if not provided) ---
    credit_score = data["credit_score"]
    account_age = data["account_age"]

    credit_utilization = data.get("credit_utilization")
    if credit_utilization is None:
        # Estimate: higher credit score → lower utilization
        credit_utilization = round(max(0.05, min(0.90, 0.80 - (credit_score - 300) / 800)), 3)

    payment_history_length = data.get("payment_history_length")
    if payment_history_length is None:
        payment_history_length = int(account_age * 12)

    disposable = max(monthly_income - total_expenditure - other_fixed_expenses, 0)
    savings_ratio = data.get("savings_ratio")
    if savings_ratio is None:
        savings_ratio = round(min(disposable / max(monthly_income, 1), 0.60), 3)

    employment_stability = data.get("employment_stability")
    if employment_stability is None:
        if data["employment_type"] == "salaried":
            employment_stability = round(min(account_age * 0.6, 20), 1)
        else:
            employment_stability = data.get("business_age", 0)

    income_volatility = data.get("income_volatility")
    if income_volatility is None:
        income_volatility = 0.25 if data["employment_type"] == "self_employed" else 0.10

    loan_purpose = data.get("loan_purpose") or "personal"

    disposable_income_ratio = data.get("disposable_income_ratio")
    if disposable_income_ratio is None:
        disposable_income_ratio = round(disposable / max(monthly_income, 1), 4)

    # Encode categoricals
    emp_enc = encoders["employment_type"].transform([data["employment_type"]])[0]
    housing_enc = encoders["housing_type"].transform([data["housing_type"]])[0]
    business_type_val = data.get("business_type", "none")
    try:
        business_enc = encoders["business_type"].transform([business_type_val])[0]
    except ValueError:
        business_enc = encoders["business_type"].transform(["none"])[0]

    # loan_purpose encoder (v2.0)
    if "loan_purpose" in encoders:
        try:
            purpose_enc = encoders["loan_purpose"].transform([loan_purpose])[0]
        except ValueError:
            purpose_enc = encoders["loan_purpose"].transform(["personal"])[0]
    else:
        purpose_enc = 0

    feature_row = {
        "age": data["age"],
        "credit_score": credit_score,
        "monthly_income": monthly_income,
        "loan_amount": loan_amount,
        "previous_defaults": data["previous_defaults"],
        "account_age": account_age,
        "loan_enquiries": data["loan_enquiries"],
        "total_expenditure": total_expenditure,
        "other_fixed_expenses": other_fixed_expenses,
        "gross_revenue": gross_revenue,
        "expected_margin": data.get("expected_margin", 0),
        "business_rent": business_rent,
        "utilities_salaries": utilities_salaries,
        "business_age": data.get("business_age", 0),
        "gst_registered": data.get("gst_registered", 0),
        # new v2.0 raw features
        "credit_utilization": credit_utilization,
        "payment_history_length": payment_history_length,
        "savings_ratio": savings_ratio,
        "employment_stability": employment_stability,
        "income_volatility": income_volatility,
        "disposable_income_ratio": disposable_income_ratio,
        # derived ratios
        "dti_ratio": dti_ratio,
        "loan_to_income": loan_to_income,
        "foir": foir,
        "dscr": dscr,
        "expense_to_revenue": expense_to_revenue,
        "rental_burden": rental_burden,
        # encoded categoricals
        "employment_type_enc": emp_enc,
        "housing_type_enc": housing_enc,
        "business_type_enc": business_enc,
        "loan_purpose_enc": purpose_enc,
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

    # Rule-based flags
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

    # ML-based anomaly flag
    if anomaly_score < -0.15:
        flags.append({"severity": "danger", "message": "ML anomaly detection: Unusual application pattern"})
    elif anomaly_score < -0.05:
        flags.append({"severity": "warning", "message": "ML anomaly detection: Slightly unusual pattern"})

    # Self-employed specific
    if data["employment_type"] == "self_employed":
        if data.get("business_age", 0) < 1:
            flags.append({"severity": "warning", "message": "Very new business (<1 year)"})
        if data.get("gst_registered", 0) == 0:
            flags.append({"severity": "warning", "message": "Business not GST registered"})

    return flags


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

        # 1. XGBoost prediction — apply isotonic calibration if available
        raw_pd = float(credit_model.predict_proba(features_df)[:, 1][0])
        if isotonic_calibrator is not None:
            pd_probability = float(isotonic_calibrator.transform([raw_pd])[0])
        else:
            pd_probability = raw_pd

        # 2. SHAP values — real explainability
        shap_vals_raw = shap_explainer.shap_values(features_df)
        # TreeExplainer with booster returns raw margin SHAP values
        if isinstance(shap_vals_raw, np.ndarray):
            shap_vals = shap_vals_raw[0]
        else:
            shap_vals = shap_vals_raw

        # Map SHAP values to feature names with human-readable labels
        feature_labels = {
            "age": "Age",
            "credit_score": "Credit Score",
            "monthly_income": "Monthly Income",
            "loan_amount": "Loan Amount",
            "previous_defaults": "Previous Defaults",
            "account_age": "Account Age",
            "loan_enquiries": "Loan Enquiries",
            "total_expenditure": "Total Expenditure",
            "other_fixed_expenses": "Other Fixed Expenses",
            "gross_revenue": "Gross Revenue",
            "expected_margin": "Expected Margin",
            "business_rent": "Business Rent",
            "utilities_salaries": "Utilities & Salaries",
            "business_age": "Business Age",
            "gst_registered": "GST Registration",
            "dti_ratio": "Debt-to-Income Ratio",
            "loan_to_income": "Loan-to-Income Ratio",
            "foir": "Fixed Obligation to Income Ratio",
            "dscr": "Debt Service Coverage Ratio",
            "expense_to_revenue": "Expense-to-Revenue Ratio",
            "rental_burden": "Rental Burden",
            "employment_type_enc": "Employment Type",
            "housing_type_enc": "Housing Type",
            "business_type_enc": "Business Type",
            "credit_utilization": "Credit Utilization",
            "payment_history_length": "Payment History Length",
            "savings_ratio": "Savings Ratio",
            "employment_stability": "Employment Stability",
            "income_volatility": "Income Volatility",
            "disposable_income_ratio": "Disposable Income Ratio",
            "loan_purpose_enc": "Loan Purpose",
        }

        shap_contributions = []
        for i, col in enumerate(model_metadata["feature_columns"]):
            shap_val = float(shap_vals[i])
            label = feature_labels.get(col, col)
            feature_value = float(features_df.iloc[0][col])
            shap_contributions.append({
                "feature": label,
                "feature_key": col,
                "value": feature_value,
                "shap_value": round(shap_val, 4),
                "impact": "positive" if shap_val < 0 else "negative" if shap_val > 0 else "neutral",
                "description": _get_feature_description(col, feature_value, shap_val),
            })

        # Sort by absolute SHAP value (most important first)
        shap_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # 3. Fraud detection
        anomaly_score = float(fraud_model.decision_function(features_df)[0])
        is_anomaly = int(fraud_model.predict(features_df)[0]) == -1
        fraud_probability = max(0, min(1, 0.5 - anomaly_score))
        fraud_flags = generate_fraud_flags(data, anomaly_score)

        # 4. Adaptive threshold based on risk appetite
        threshold_map = model_metadata["threshold_policy"]
        base_threshold = threshold_map.get(data["risk_appetite"], 0.35)

        # Adjust for fraud
        fraud_penalty = fraud_probability * 0.15 if is_anomaly else 0
        effective_pd = min(pd_probability + fraud_penalty, 0.99)

        # 5. Decision
        risk_category, interest_rate, recommendation = get_risk_category(effective_pd, base_threshold)
        approved = risk_category in ("LOW", "MEDIUM")

        # Compute financial ratios for display
        dti = data["total_expenditure"] / max(data["monthly_income"], 1)
        foir = (data["total_expenditure"] + data.get("other_fixed_expenses", 0)) / max(data["monthly_income"], 1)
        loan_to_income = data["loan_amount"] / max(data["monthly_income"] * 12, 1)

        return {
            "pd": round(effective_pd, 4),
            "raw_pd": round(raw_pd, 4),
            "approval_probability": round(1 - effective_pd, 4),
            "risk_category": risk_category,
            "risk_score": round((1 - effective_pd) * 100, 1),
            "approved": approved,
            "recommendation": recommendation,
            "interest_rate": interest_rate,
            "shap_values": shap_contributions[:12],  # Top 12 features
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
                "dscr": round(data["monthly_income"] / max(data["loan_amount"] / 120, 1), 4),
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


def _get_feature_description(feature_key: str, value: float, shap_val: float) -> str:
    """Generate human-readable description for a SHAP contribution."""
    direction = "increases" if shap_val > 0 else "decreases"

    descriptions = {
        "credit_score": f"Credit score of {int(value)} {direction} default risk",
        "monthly_income": f"Monthly income of ₹{int(value):,} {direction} default risk",
        "loan_amount": f"Loan amount of ₹{int(value):,} {direction} default risk",
        "previous_defaults": f"{int(value)} previous default(s) {direction} default risk",
        "account_age": f"Account age of {value:.1f} years {direction} default risk",
        "loan_enquiries": f"{int(value)} recent enquiries {direction} default risk",
        "dti_ratio": f"DTI ratio of {value:.1%} {direction} default risk",
        "loan_to_income": f"Loan-to-income ratio of {value:.2f}x {direction} default risk",
        "foir": f"FOIR of {value:.1%} {direction} default risk",
        "dscr": f"DSCR of {value:.2f} {direction} default risk",
        "age": f"Applicant age of {int(value)} {direction} default risk",
        "expected_margin": f"Business margin of {value:.1f}% {direction} default risk",
        "business_age": f"Business age of {value:.1f} years {direction} default risk",
        "gst_registered": f"GST {'registered' if value else 'not registered'} {direction} default risk",
        "expense_to_revenue": f"Expense-to-revenue ratio of {value:.1%} {direction} default risk",
        "rental_burden": f"Rental burden of {value:.1%} {direction} default risk",
        "total_expenditure": f"Expenditure of ₹{int(value):,} {direction} default risk",
        "gross_revenue": f"Revenue of ₹{int(value):,} {direction} default risk",
        "credit_utilization": f"Credit utilization of {value:.1%} {direction} default risk",
        "payment_history_length": f"Payment history of {int(value)} months {direction} default risk",
        "savings_ratio": f"Savings ratio of {value:.1%} {direction} default risk",
        "employment_stability": f"Employment stability score of {value:.2f} {direction} default risk",
        "income_volatility": f"Income volatility of {value:.2f} {direction} default risk",
        "disposable_income_ratio": f"Disposable income ratio of {value:.1%} {direction} default risk",
        "loan_purpose_enc": f"Loan purpose category ({int(value)}) {direction} default risk",
    }

    return descriptions.get(feature_key, f"{feature_key}={value:.2f} {direction} default risk")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
