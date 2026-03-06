"""
FinSecure AI — Credit Risk Model Training Pipeline v3.0
Trains on REAL credit_risk_dataset (32K+ records, 12 features).
Includes outlier cleaning, null imputation, feature engineering,
hyperparameter search, probability calibration, and SHAP support.
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from datetime import datetime
from scipy import stats
from sklearn.model_selection import (
    train_test_split, StratifiedKFold, ParameterSampler,
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


# ──────────────────────────────────────────────────────────────
# STEP 1 — Load & Clean Real Dataset
# ──────────────────────────────────────────────────────────────

def load_and_clean_data():
    """Load the real credit risk dataset and clean outliers/nulls."""
    csv_path = os.path.join(DATA_DIR, "credit_risk_dataset..csv")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records with {len(df.columns)} columns")
    print(f"Default rate (raw): {df['loan_status'].mean():.2%}")

    # --- Outlier removal ---
    n_before = len(df)
    df = df[df["person_age"] <= 80]           # Remove unrealistic ages (max was 144)
    df = df[df["person_income"] <= 500_000]   # Remove extreme income outliers
    df = df[df["person_emp_length"] <= 50]    # Remove unrealistic employment length
    print(f"Removed {n_before - len(df)} outlier rows ({n_before} → {len(df)})")

    # --- Null imputation ---
    # person_emp_length: fill with median
    median_emp = df["person_emp_length"].median()
    df["person_emp_length"] = df["person_emp_length"].fillna(median_emp)
    print(f"Filled {df['person_emp_length'].isna().sum()} emp_length nulls with median={median_emp}")

    # loan_int_rate: fill with grade-based median
    grade_medians = df.groupby("loan_grade")["loan_int_rate"].median()
    for grade, med_rate in grade_medians.items():
        mask = df["loan_int_rate"].isna() & (df["loan_grade"] == grade)
        df.loc[mask, "loan_int_rate"] = med_rate
    # Any remaining nulls
    df["loan_int_rate"] = df["loan_int_rate"].fillna(df["loan_int_rate"].median())
    print(f"Filled int_rate nulls with grade-based medians")

    print(f"Final dataset: {len(df)} records, default rate: {df['loan_status'].mean():.2%}")
    return df


# ──────────────────────────────────────────────────────────────
# STEP 2 — Feature Engineering & Encoding
# ──────────────────────────────────────────────────────────────

def preprocess_data(df):
    """Encode categoricals, engineer features, return X, y, metadata."""
    df = df.copy()

    # --- Ordinal encode loan_grade (A=0 best → G=6 worst) ---
    grade_map = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6}
    df["loan_grade_enc"] = df["loan_grade"].map(grade_map)

    # --- Binary encode cb_person_default_on_file ---
    df["cb_default_enc"] = (df["cb_person_default_on_file"] == "Y").astype(int)

    # --- Label encode home_ownership & loan_intent ---
    le_home = LabelEncoder()
    df["home_ownership_enc"] = le_home.fit_transform(df["person_home_ownership"])

    le_intent = LabelEncoder()
    df["loan_intent_enc"] = le_intent.fit_transform(df["loan_intent"])

    # --- Feature engineering ---
    df["income_to_loan"] = df["person_income"] / np.maximum(df["loan_amnt"], 1)
    df["age_emp_ratio"] = df["person_emp_length"] / np.maximum(df["person_age"], 1)
    df["rate_grade_interaction"] = df["loan_int_rate"] * df["loan_grade_enc"]
    df["cred_hist_per_age"] = df["cb_person_cred_hist_length"] / np.maximum(df["person_age"], 1)

    feature_cols = [
        # Original numeric
        "person_age",
        "person_income",
        "person_emp_length",
        "loan_amnt",
        "loan_int_rate",
        "loan_percent_income",
        "cb_person_cred_hist_length",
        # Encoded categoricals
        "loan_grade_enc",
        "cb_default_enc",
        "home_ownership_enc",
        "loan_intent_enc",
        # Engineered
        "income_to_loan",
        "age_emp_ratio",
        "rate_grade_interaction",
        "cred_hist_per_age",
    ]

    X = df[feature_cols]
    y = df["loan_status"]

    encoders = {
        "home_ownership": le_home,
        "loan_intent": le_intent,
        "grade_map": grade_map,
    }

    return X, y, feature_cols, encoders


# ──────────────────────────────────────────────────────────────
# STEP 3 — Train XGBoost + Hyperparam Search + Calibration
# ──────────────────────────────────────────────────────────────

def train_credit_model(X, y, feature_cols):
    """Train XGBoost with manual hyperparameter search + isotonic calibration."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos_weight = n_neg / n_pos

    print(f"\nTraining set: {len(X_train)} (default rate: {y_train.mean():.2%})")
    print(f"Test set:     {len(X_test)} (default rate: {y_test.mean():.2%})")
    print(f"Scale pos weight: {scale_pos_weight:.2f}")

    # --- Hyperparameter search (manual to avoid sklearn/xgboost tag issue) ---
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

    print("\nRunning hyperparameter search (40 combos × 3-fold CV)...")
    cv_search = StratifiedKFold(n_splits=3, shuffle=True, random_state=SEED)
    param_list = list(ParameterSampler(param_dist, n_iter=40, random_state=SEED))

    best_score = 0
    best_params = param_list[0]

    for idx, params in enumerate(param_list, 1):
        fold_aucs = []
        for tr_idx, val_idx in cv_search.split(X_train, y_train):
            xtr, xval = X_train.iloc[tr_idx], X_train.iloc[val_idx]
            ytr, yval = y_train.iloc[tr_idx], y_train.iloc[val_idx]
            m = xgb.XGBClassifier(
                **params,
                scale_pos_weight=scale_pos_weight,
                random_state=SEED,
                objective="binary:logistic",
                eval_metric="auc",
                use_label_encoder=False,
            )
            m.fit(xtr, ytr, verbose=0)
            p = m.predict_proba(xval)[:, 1]
            fold_aucs.append(roc_auc_score(yval, p))
        mean_auc = np.mean(fold_aucs)
        if mean_auc > best_score:
            best_score = mean_auc
            best_params = params
        if idx % 10 == 0:
            print(f"  Tested {idx}/40 combos, best AUC: {best_score:.4f}")

    print(f"\nBest CV AUC from search: {best_score:.4f}")
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
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)

    best_n = model.best_iteration + 1
    print(f"Best iteration: {best_n}")

    # --- Isotonic calibration on held-out set ---
    print("\nCalibrating probabilities (isotonic regression)...")
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
    cal_fitted.fit(X_model, y_model, verbose=0)

    raw_cal_proba = cal_fitted.predict_proba(X_cal)[:, 1]
    iso_reg = IsotonicRegression(y_min=0.001, y_max=0.999, out_of_bounds="clip")
    iso_reg.fit(raw_cal_proba, y_cal)

    # --- Evaluate ---
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
        print(f"  Brier Loss: {brier:.4f}")

    # --- 5-fold CV ---
    print("\nRunning 5-fold CV on full dataset...")
    cv_final = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    final_params = {**best_params, "n_estimators": best_n}
    cv_aucs = []
    for fold_idx, (tr_idx, val_idx) in enumerate(cv_final.split(X, y), 1):
        X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]
        cv_m = xgb.XGBClassifier(
            **final_params,
            scale_pos_weight=scale_pos_weight,
            random_state=SEED,
            objective="binary:logistic",
            eval_metric="auc",
            use_label_encoder=False,
        )
        cv_m.fit(X_tr, y_tr, verbose=0)
        fold_proba = cv_m.predict_proba(X_val)[:, 1]
        fold_auc = roc_auc_score(y_val, fold_proba)
        cv_aucs.append(fold_auc)
        print(f"  Fold {fold_idx}: AUC = {fold_auc:.4f}")
    cv_arr = np.array(cv_aucs)
    print(f"5-Fold CV AUC: {cv_arr.mean():.4f} (+/- {cv_arr.std():.4f})")

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
        "cv_auc_mean": round(float(cv_arr.mean()), 4),
        "cv_auc_std": round(float(cv_arr.std()), 4),
    }

    return model, iso_reg, metrics, best_params, X_test, y_test


# ──────────────────────────────────────────────────────────────
# STEP 4 — Isolation Forest (Fraud Detection)
# ──────────────────────────────────────────────────────────────

def train_fraud_model(X):
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
# STEP 5 — Save Artifacts
# ──────────────────────────────────────────────────────────────

def save_artifacts(credit_model, calibrator, fraud_model, encoders,
                   feature_cols, metrics, best_params, df):
    """Save all model artifacts."""
    version = "RA-XGB-v3.0"
    train_date = datetime.now().strftime("%Y-%m-%d")

    credit_model.get_booster().save_model(os.path.join(MODEL_DIR, "credit_risk_model.bin"))
    joblib.dump(credit_model, os.path.join(MODEL_DIR, "credit_risk_model.pkl"))
    joblib.dump(calibrator, os.path.join(MODEL_DIR, "credit_risk_calibrated.pkl"))
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
        "default_rate": round(df["loan_status"].mean(), 4),
        "hyperparameters": {k: v for k, v in best_params.items()},
        "threshold_policy": {
            "conservative": 0.20,
            "moderate": 0.35,
            "aggressive": 0.50,
        },
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    # Save background sample for SHAP
    df.sample(min(500, len(df)), random_state=SEED).to_csv(
        os.path.join(DATA_DIR, "training_sample.csv"), index=False
    )

    print(f"\n[OK] All artifacts saved to {MODEL_DIR}")
    print(f"   Model version: {version}")
    print(f"   Features: {len(feature_cols)}")
    print(f"   Top 5 features: {[f for f, _ in feature_importance[:5]]}")

    return metadata


# ──────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("FinSecure AI — Credit Risk Training Pipeline v3.0")
    print("Training on REAL credit risk dataset (32K+ records)")
    print("=" * 60)

    print("\n[1/5] Loading & cleaning real dataset...")
    df = load_and_clean_data()

    print("\n[2/5] Preprocessing (15 features: 7 numeric + 4 encoded + 4 engineered)...")
    X, y, feature_cols, encoders = preprocess_data(df)
    print(f"  Features: {feature_cols}")

    print("\n[3/5] Training XGBoost + hyperparam search + calibration...")
    credit_model, calibrator, metrics, best_params, X_test, y_test = \
        train_credit_model(X, y, feature_cols)

    print("\n[4/5] Training Isolation Forest fraud model...")
    fraud_model = train_fraud_model(X)

    print("\n[5/5] Saving model artifacts...")
    save_artifacts(
        credit_model, calibrator, fraud_model, encoders,
        feature_cols, metrics, best_params, df,
    )

    print("\n" + "=" * 60)
    print("[DONE] Training pipeline v3.0 complete!")
    print(f"   AUC:      {metrics['auc']}")
    print(f"   F1:       {metrics['f1']}")
    print(f"   KS:       {metrics['ks_statistic']}")
    print(f"   Accuracy: {metrics['accuracy']}")
    print(f"   Brier:    {metrics['brier_score']}")
    print(f"   CV AUC:   {metrics['cv_auc_mean']} (+/- {metrics['cv_auc_std']})")
    print("=" * 60)


if __name__ == "__main__":
    main()
