"""
FinSecure AI — Credit Risk Model Training Pipeline v2.0
50K samples, 31 features, hyperparameter search, probability calibration,
fixed cross-validation, and stronger feature engineering.
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from datetime import datetime
from scipy import stats
from sklearn.model_selection import (
    train_test_split, StratifiedKFold, cross_val_score, RandomizedSearchCV,
)
from sklearn.preprocessing import LabelEncoder
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    classification_report, accuracy_score, brier_score_loss,
)
from sklearn.ensemble import IsolationForest
import xgboost as xgb
import joblib

warnings.filterwarnings("ignore", category=UserWarning)

SEED = 42
np.random.seed(SEED)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


# ──────────────────────────────────────────────────────────────
# STEP 1 — Synthetic data generation (50K, richer features)
# ──────────────────────────────────────────────────────────────

def generate_indian_credit_data(n_samples=50000):
    """
    Generate 50K realistic synthetic Indian credit applicants.
    Includes 7 new features: credit_utilization, payment_history_length,
    savings_ratio, employment_stability, income_volatility,
    loan_purpose (encoded), disposable_income_ratio.
    """
    data = []

    loan_purposes = ["home", "personal", "vehicle", "education", "business", "gold"]
    loan_purpose_probs = [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]

    for _ in range(n_samples):
        emp_type = np.random.choice(["salaried", "self_employed"], p=[0.6, 0.4])
        age = int(np.clip(np.random.normal(35, 8), 21, 65))
        credit_score = int(np.clip(np.random.normal(680, 80), 300, 900))

        max_account_age = max(1, age - 20)
        account_age = round(np.clip(np.random.exponential(4), 0.5, min(max_account_age, 30)), 1)

        previous_defaults = int(np.random.choice([0, 1, 2, 3, 4], p=[0.70, 0.15, 0.08, 0.05, 0.02]))
        loan_enquiries = int(np.random.choice(range(0, 10),
            p=[0.35, 0.25, 0.15, 0.10, 0.05, 0.04, 0.03, 0.01, 0.01, 0.01]))

        # --- NEW: credit utilization (0-1, how much of available credit is used) ---
        if credit_score >= 750:
            credit_utilization = round(np.clip(np.random.beta(2, 5), 0.01, 0.95), 3)
        elif credit_score >= 600:
            credit_utilization = round(np.clip(np.random.beta(3, 3), 0.05, 0.95), 3)
        else:
            credit_utilization = round(np.clip(np.random.beta(5, 2), 0.10, 0.99), 3)

        # --- NEW: payment history length in months (correlated with account age) ---
        payment_history_length = int(np.clip(account_age * 12 + np.random.normal(0, 6), 1, 360))

        # --- NEW: employment stability (years at current job/business) ---
        if emp_type == "salaried":
            employment_stability = round(np.clip(np.random.exponential(3), 0.1, min(age - 20, 30)), 1)
        else:
            employment_stability = 0  # will use business_age instead

        # --- NEW: income volatility (std-dev of income as fraction; lower = more stable) ---
        if emp_type == "salaried":
            income_volatility = round(np.clip(np.random.beta(2, 8), 0.01, 0.40), 3)
        else:
            income_volatility = round(np.clip(np.random.beta(4, 5), 0.05, 0.60), 3)

        # --- NEW: loan purpose ---
        loan_purpose = np.random.choice(loan_purposes, p=loan_purpose_probs)

        if emp_type == "salaried":
            monthly_income = round(np.clip(np.random.lognormal(10.7, 0.6), 15000, 500000))
            housing_type = np.random.choice(["rent", "owned"], p=[0.55, 0.45])
            office_rent = round(monthly_income * np.random.uniform(0.0, 0.15)) if housing_type == "rent" else 0
            expenditure_ratio = np.random.beta(3, 3) * 0.5 + 0.3
            total_expenditure = round(monthly_income * expenditure_ratio)
            other_fixed_expenses = round(monthly_income * np.random.uniform(0.05, 0.25))
            gross_revenue = 0
            expected_margin = 0
            business_rent = 0
            utilities_salaries = 0
            business_age = 0
            gst_registered = 0
            business_type = "none"
        else:
            business_type = np.random.choice(["trading", "manufacturing", "service"], p=[0.35, 0.30, 0.35])
            gross_revenue = round(np.clip(np.random.lognormal(11.5, 0.7), 50000, 2000000))
            margin_map = {"trading": (8, 15), "manufacturing": (12, 28), "service": (18, 40)}
            expected_margin = round(np.random.uniform(*margin_map[business_type]), 1)
            monthly_income = round(gross_revenue * expected_margin / 100)
            business_rent = round(gross_revenue * np.random.uniform(0.05, 0.20))
            utilities_salaries = round(gross_revenue * np.random.uniform(0.10, 0.35))
            business_age = round(np.clip(np.random.exponential(4), 0.5, 25), 1)
            gst_registered = int(np.random.choice([0, 1], p=[0.30, 0.70]))
            housing_type = np.random.choice(["rent", "owned"], p=[0.50, 0.50])
            office_rent = 0
            total_expenditure = round(monthly_income * np.random.uniform(0.3, 0.7))
            other_fixed_expenses = round(monthly_income * np.random.uniform(0.05, 0.20))
            employment_stability = business_age  # proxy

        loan_multiplier = np.random.lognormal(2.5, 0.5)
        loan_amount = round(np.clip(monthly_income * loan_multiplier, 50000, 10000000))

        # --- NEW: savings ratio (savings / income; higher = better) ---
        disposable = max(monthly_income - total_expenditure - other_fixed_expenses, 0)
        savings_ratio = round(np.clip(disposable / max(monthly_income, 1) + np.random.normal(0, 0.05), 0, 0.60), 3)

        # --- Derived financial ratios ---
        dti_ratio = round(total_expenditure / max(monthly_income, 1), 4)
        loan_to_income = round(loan_amount / max(monthly_income * 12, 1), 4)
        foir = round((total_expenditure + other_fixed_expenses) / max(monthly_income, 1), 4)
        dscr = round(monthly_income / max(loan_amount / 120, 1), 4)

        if emp_type == "self_employed" and gross_revenue > 0:
            expense_to_revenue = round((business_rent + utilities_salaries) / max(gross_revenue, 1), 4)
        else:
            expense_to_revenue = 0

        if emp_type == "salaried":
            rental_burden = round(office_rent / max(monthly_income, 1), 4)
        else:
            rental_burden = round(business_rent / max(gross_revenue, 1), 4) if gross_revenue > 0 else 0

        # --- NEW: disposable income ratio ---
        disposable_income_ratio = round(disposable / max(monthly_income, 1), 4)

        # ── Default label (richer, non-linear logic) ──────────────
        base_pd = 0.10

        # Credit score: smooth non-linear effect
        cs_effect = -0.15 * ((credit_score - 600) / 300) ** 1.3
        pd_adj = cs_effect

        # Credit utilization: strong non-linear (>0.7 very bad)
        if credit_utilization > 0.80:
            pd_adj += 0.14
        elif credit_utilization > 0.60:
            pd_adj += 0.06
        elif credit_utilization < 0.30:
            pd_adj -= 0.04

        # Previous defaults (exponential penalty)
        pd_adj += (previous_defaults ** 1.5) * 0.06

        # DTI ratio
        if dti_ratio > 0.65:
            pd_adj += 0.12
        elif dti_ratio > 0.50:
            pd_adj += 0.05

        # FOIR (RBI benchmark)
        if foir > 0.65:
            pd_adj += 0.10
        elif foir > 0.50:
            pd_adj += 0.04

        # Loan to income
        if loan_to_income > 5:
            pd_adj += 0.12
        elif loan_to_income > 3:
            pd_adj += 0.06

        # Loan enquiries
        pd_adj += min(loan_enquiries * 0.015, 0.12)

        # Account age
        if account_age >= 8:
            pd_adj -= 0.06
        elif account_age >= 4:
            pd_adj -= 0.03
        elif account_age < 1:
            pd_adj += 0.06

        # Age (non-linear)
        if age < 25:
            pd_adj += 0.05
        elif 30 <= age <= 45:
            pd_adj -= 0.02

        # NEW: savings ratio effect
        if savings_ratio > 0.30:
            pd_adj -= 0.06
        elif savings_ratio < 0.10:
            pd_adj += 0.05

        # NEW: employment stability
        if employment_stability >= 5:
            pd_adj -= 0.04
        elif employment_stability < 1:
            pd_adj += 0.05

        # NEW: income volatility
        if income_volatility > 0.30:
            pd_adj += 0.06
        elif income_volatility < 0.10:
            pd_adj -= 0.03

        # NEW: loan purpose risk
        purpose_risk = {"home": -0.03, "education": -0.02, "gold": -0.01,
                        "vehicle": 0.01, "personal": 0.04, "business": 0.03}
        pd_adj += purpose_risk.get(loan_purpose, 0)

        # NEW: payment history effect
        if payment_history_length > 120:
            pd_adj -= 0.04
        elif payment_history_length < 12:
            pd_adj += 0.05

        # NEW: disposable income ratio
        if disposable_income_ratio < 0.10:
            pd_adj += 0.06
        elif disposable_income_ratio > 0.30:
            pd_adj -= 0.03

        # Self-employed specific
        if emp_type == "self_employed":
            if business_age < 2:
                pd_adj += 0.06
            if expected_margin < 12:
                pd_adj += 0.05
            if not gst_registered:
                pd_adj += 0.03

        # Interaction effects (non-linear — helps model learn complex patterns)
        if credit_score < 600 and previous_defaults >= 2:
            pd_adj += 0.10  # compounding risk
        if credit_utilization > 0.70 and loan_enquiries >= 4:
            pd_adj += 0.08  # desperation signal
        if dti_ratio > 0.55 and savings_ratio < 0.10:
            pd_adj += 0.07  # no safety net

        final_pd = np.clip(base_pd + pd_adj, 0.02, 0.92)
        noise = np.random.normal(0, 0.04)
        final_pd = np.clip(final_pd + noise, 0.02, 0.92)

        defaulted = int(np.random.random() < final_pd)

        data.append({
            "employment_type": emp_type,
            "age": age,
            "credit_score": credit_score,
            "monthly_income": monthly_income,
            "loan_amount": loan_amount,
            "previous_defaults": previous_defaults,
            "account_age": account_age,
            "loan_enquiries": loan_enquiries,
            "housing_type": housing_type,
            "total_expenditure": total_expenditure,
            "other_fixed_expenses": other_fixed_expenses,
            "gross_revenue": gross_revenue,
            "expected_margin": expected_margin,
            "business_rent": business_rent,
            "utilities_salaries": utilities_salaries,
            "business_age": business_age,
            "gst_registered": gst_registered,
            "business_type": business_type,
            "loan_purpose": loan_purpose,
            # engineered
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
            "defaulted": defaulted,
        })

    df = pd.DataFrame(data)
    print(f"Generated {len(df)} samples")
    print(f"Default rate: {df['defaulted'].mean():.2%}")
    print(f"Employment split: {df['employment_type'].value_counts().to_dict()}")
    return df


# ──────────────────────────────────────────────────────────────
# STEP 2 — Preprocessing (31 features now)
# ──────────────────────────────────────────────────────────────

def preprocess_data(df):
    """Preprocess data for XGBoost training. Returns 31 features."""
    df = df.copy()

    le_emp = LabelEncoder()
    df["employment_type_enc"] = le_emp.fit_transform(df["employment_type"])

    le_housing = LabelEncoder()
    df["housing_type_enc"] = le_housing.fit_transform(df["housing_type"])

    le_business = LabelEncoder()
    df["business_type_enc"] = le_business.fit_transform(df["business_type"])

    le_purpose = LabelEncoder()
    df["loan_purpose_enc"] = le_purpose.fit_transform(df["loan_purpose"])

    feature_cols = [
        "age", "credit_score", "monthly_income", "loan_amount",
        "previous_defaults", "account_age", "loan_enquiries",
        "total_expenditure", "other_fixed_expenses",
        "gross_revenue", "expected_margin",
        "business_rent", "utilities_salaries", "business_age", "gst_registered",
        # new raw features
        "credit_utilization", "payment_history_length",
        "savings_ratio", "employment_stability", "income_volatility",
        "disposable_income_ratio",
        # derived ratios
        "dti_ratio", "loan_to_income", "foir", "dscr",
        "expense_to_revenue", "rental_burden",
        # encoded categoricals
        "employment_type_enc", "housing_type_enc", "business_type_enc",
        "loan_purpose_enc",
    ]

    X = df[feature_cols]
    y = df["defaulted"]

    encoders = {
        "employment_type": le_emp,
        "housing_type": le_housing,
        "business_type": le_business,
        "loan_purpose": le_purpose,
    }

    return X, y, feature_cols, encoders


# ──────────────────────────────────────────────────────────────
# STEP 3 — Train XGBoost with hyperparam search + calibration
# ──────────────────────────────────────────────────────────────

def train_credit_model(X, y, feature_cols):
    """Train XGBoost with RandomizedSearchCV, fixed CV scoring, and probability calibration."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos_weight = n_neg / n_pos

    print(f"\nTraining set: {len(X_train)} samples (default rate: {y_train.mean():.2%})")
    print(f"Test set: {len(X_test)} samples (default rate: {y_test.mean():.2%})")
    print(f"Scale pos weight: {scale_pos_weight:.2f}")

    # --- Hyperparameter search ---
    param_dist = {
        "n_estimators": [200, 300, 400, 500],
        "max_depth": [4, 5, 6, 7, 8],
        "learning_rate": [0.01, 0.03, 0.05, 0.08],
        "subsample": [0.7, 0.8, 0.9],
        "colsample_bytree": [0.6, 0.7, 0.8, 0.9],
        "min_child_weight": [1, 3, 5, 7],
        "gamma": [0, 0.05, 0.1, 0.2],
        "reg_alpha": [0, 0.05, 0.1, 0.5],
        "reg_lambda": [0.5, 1.0, 1.5, 2.0],
    }

    base_model = xgb.XGBClassifier(
        scale_pos_weight=scale_pos_weight,
        random_state=SEED,
        objective="binary:logistic",
        eval_metric="auc",
        use_label_encoder=False,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)

    print("\nRunning hyperparameter search (40 iterations, 5-fold CV)...")
    search = RandomizedSearchCV(
        base_model,
        param_distributions=param_dist,
        n_iter=40,
        scoring="roc_auc",
        cv=cv,
        random_state=SEED,
        n_jobs=-1,
        verbose=1,
    )
    search.fit(X_train, y_train)

    best_params = search.best_params_
    print(f"\nBest CV AUC from search: {search.best_score_:.4f}")
    print(f"Best params: {best_params}")

    # --- Retrain best model with early stopping ---
    model = xgb.XGBClassifier(
        **best_params,
        scale_pos_weight=scale_pos_weight,
        random_state=SEED,
        objective="binary:logistic",
        eval_metric="auc",
        early_stopping_rounds=30,
        use_label_encoder=False,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    best_n = model.best_iteration + 1
    print(f"Best iteration: {best_n}")

    # --- Probability calibration (manual isotonic regression) ---
    # Split training data: 80% for model, 20% for calibration
    print("\nCalibrating probabilities (isotonic regression on held-out set)...")
    X_model, X_cal, y_model, y_cal = train_test_split(
        X_train, y_train, test_size=0.2, random_state=SEED, stratify=y_train
    )

    cal_params = {**best_params, "n_estimators": best_n}
    cal_fitted = xgb.XGBClassifier(
        **cal_params,
        scale_pos_weight=scale_pos_weight,
        random_state=SEED,
        objective="binary:logistic",
        eval_metric="auc",
        use_label_encoder=False,
    )
    cal_fitted.fit(X_model, y_model)

    # Get raw probabilities on calibration set and fit isotonic regression
    raw_cal_proba = cal_fitted.predict_proba(X_cal)[:, 1]
    iso_reg = IsotonicRegression(y_min=0.001, y_max=0.999, out_of_bounds="clip")
    iso_reg.fit(raw_cal_proba, y_cal)

    # The "calibrated_model" is just the isotonic regressor applied on top of raw XGBoost
    calibrated_model = iso_reg

    # --- Evaluate both raw and calibrated ---
    y_raw_proba = model.predict_proba(X_test)[:, 1]
    y_cal_proba = iso_reg.transform(y_raw_proba)

    for label, proba in [("Raw XGBoost", y_raw_proba), ("Calibrated", y_cal_proba)]:
        y_pred = (proba >= 0.5).astype(int)
        auc = roc_auc_score(y_test, proba)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1_val = f1_score(y_test, y_pred, zero_division=0)
        acc = accuracy_score(y_test, y_pred)
        brier = brier_score_loss(y_test, proba)
        ks = stats.ks_2samp(proba[y_test == 1], proba[y_test == 0]).statistic

        print(f"\n{'='*50}")
        print(f"  {label} EVALUATION")
        print(f"{'='*50}")
        print(f"  ROC-AUC:    {auc:.4f}")
        print(f"  Precision:  {prec:.4f}")
        print(f"  Recall:     {rec:.4f}")
        print(f"  F1 Score:   {f1_val:.4f}")
        print(f"  Accuracy:   {acc:.4f}")
        print(f"  KS Stat:    {ks:.4f}")
        print(f"  Brier Loss: {brier:.4f}  (lower = better calibrated)")

    # --- Fixed cross-validation on full data ---
    print("\nRunning 5-fold CV on full dataset (fixed classifier scoring)...")
    cv_params = {**best_params, "n_estimators": best_n}
    cv_model = xgb.XGBClassifier(
        **cv_params,
        scale_pos_weight=scale_pos_weight,
        random_state=SEED,
        objective="binary:logistic",
        eval_metric="auc",
        use_label_encoder=False,
    )
    cv_scores = cross_val_score(cv_model, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    print(f"5-Fold CV AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Use calibrated probabilities for final metrics
    y_final = (y_cal_proba >= 0.5).astype(int)
    final_auc = roc_auc_score(y_test, y_cal_proba)
    final_ks = stats.ks_2samp(y_cal_proba[y_test == 1], y_cal_proba[y_test == 0]).statistic

    print(f"\nClassification Report (calibrated):")
    print(classification_report(y_test, y_final, target_names=["Non-Default", "Default"]))

    metrics = {
        "auc": round(final_auc, 4),
        "precision": round(precision_score(y_test, y_final, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_final, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_final, zero_division=0), 4),
        "accuracy": round(accuracy_score(y_test, y_final), 4),
        "ks_statistic": round(final_ks, 4),
        "brier_score": round(brier_score_loss(y_test, y_cal_proba), 4),
        "cv_auc_mean": round(float(cv_scores.mean()), 4),
        "cv_auc_std": round(float(cv_scores.std()), 4),
    }

    return model, calibrated_model, metrics, best_params, X_test, y_test


# ──────────────────────────────────────────────────────────────
# STEP 4 — Isolation Forest
# ──────────────────────────────────────────────────────────────

def train_fraud_model(X, y):
    """Train Isolation Forest for anomaly/fraud detection."""
    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.08,
        max_samples="auto",
        random_state=SEED,
    )
    iso_forest.fit(X)

    anomaly_labels = iso_forest.predict(X)
    n_anomalies = (anomaly_labels == -1).sum()
    print(f"\nFraud Model: Detected {n_anomalies} anomalies ({n_anomalies/len(X):.2%})")

    return iso_forest


# ──────────────────────────────────────────────────────────────
# STEP 5 — Save artifacts
# ──────────────────────────────────────────────────────────────

def save_artifacts(credit_model, calibrated_model, fraud_model, encoders,
                   feature_cols, metrics, best_params, df):
    """Save all model artifacts including calibrated model."""
    version = "RA-XGB-v2.0"
    train_date = datetime.now().strftime("%Y-%m-%d")

    credit_model.get_booster().save_model(os.path.join(MODEL_DIR, "credit_risk_model.bin"))
    joblib.dump(credit_model, os.path.join(MODEL_DIR, "credit_risk_model.pkl"))
    joblib.dump(calibrated_model, os.path.join(MODEL_DIR, "credit_risk_calibrated.pkl"))
    joblib.dump(fraud_model, os.path.join(MODEL_DIR, "fraud_detection_model.joblib"))
    joblib.dump(encoders, os.path.join(MODEL_DIR, "encoders.joblib"))

    importance = credit_model.feature_importances_
    feature_importance = sorted(
        zip(feature_cols, importance.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )

    metadata = {
        "model_version": version,
        "model_type": "XGBoost Classifier (Calibrated)",
        "train_date": train_date,
        "training_samples": len(df),
        "n_features": len(feature_cols),
        "feature_columns": feature_cols,
        "feature_importance": [{"feature": f, "importance": round(i, 4)} for f, i in feature_importance],
        "metrics": metrics,
        "default_rate": round(df["defaulted"].mean(), 4),
        "hyperparameters": best_params,
        "threshold_policy": {
            "conservative": 0.20,
            "moderate": 0.35,
            "aggressive": 0.50,
        },
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    df.sample(min(500, len(df)), random_state=SEED).to_csv(
        os.path.join(DATA_DIR, "training_sample.csv"), index=False
    )

    print(f"\n[OK] All artifacts saved to {MODEL_DIR}")
    print(f"   Model version: {version}")
    print(f"   Features: {len(feature_cols)}")
    print(f"   Top 7 features: {[f for f, _ in feature_importance[:7]]}")

    return metadata


# ──────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("FinSecure AI — Credit Risk Model Training Pipeline v2.0")
    print("=" * 60)

    print("\n[1/5] Generating 50K synthetic Indian credit data...")
    df = generate_indian_credit_data(n_samples=50000)
    df.to_csv(os.path.join(DATA_DIR, "credit_risk_dataset.csv"), index=False)

    print("\n[2/5] Preprocessing data (31 features)...")
    X, y, feature_cols, encoders = preprocess_data(df)

    print("\n[3/5] Training XGBoost + hyperparameter search + calibration...")
    credit_model, calibrated_model, metrics, best_params, X_test, y_test = \
        train_credit_model(X, y, feature_cols)

    print("\n[4/5] Training Isolation Forest fraud model...")
    fraud_model = train_fraud_model(X, y)

    print("\n[5/5] Saving model artifacts...")
    metadata = save_artifacts(
        credit_model, calibrated_model, fraud_model, encoders,
        feature_cols, metrics, best_params, df,
    )

    print("\n" + "=" * 60)
    print("[DONE] Training pipeline v2.0 complete!")
    print(f"   AUC:      {metrics['auc']}")
    print(f"   F1:       {metrics['f1']}")
    print(f"   KS:       {metrics['ks_statistic']}")
    print(f"   Accuracy: {metrics['accuracy']}")
    print(f"   Brier:    {metrics['brier_score']}")
    print(f"   CV AUC:   {metrics['cv_auc_mean']} (+/- {metrics['cv_auc_std']})")
    print("=" * 60)


if __name__ == "__main__":
    main()
