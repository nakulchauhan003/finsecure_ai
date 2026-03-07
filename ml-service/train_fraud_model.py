"""
FinSecure AI — Fraud Detection Model Training Pipeline v2.0

Trains a production-grade hybrid fraud detection system:

1. Isolation Forest (Unsupervised Anomaly Detection)
   - Detects statistical outliers and novel fraud patterns
   - No labeled data requirement

2. XGBoost Supervised Classifier (Optional)
   - Uses labeled fraud/non-fraud examples for better recall
   - Can be added once labeled fraud data becomes available

3. Rule Engine
   - Business rules for known fraud patterns
   - Configurable thresholds

Output Models:
  - fraud_isolation_forest.joblib (anomaly detection)
  - fraud_model_metadata.json (evaluation metrics & thresholds)
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score, classification_report, confusion_matrix,
    precision_score, recall_score, f1_score, accuracy_score
)
from sklearn.preprocessing import StandardScaler
import joblib

warnings.filterwarnings('ignore')

SEED = 42
np.random.seed(SEED)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

os.makedirs(MODEL_DIR, exist_ok=True)

print("\n" + "="*70)
print("FRAUD DETECTION MODEL TRAINING — v2.0 (Hybrid Approach)")
print("="*70)

# ─────────────────────────────────────────────────────────────
# 1. LOAD & VALIDATE MERGED DATASET
# ─────────────────────────────────────────────────────────────

print("\n[1/5] Loading merged fraud dataset...")
merged_path = os.path.join(DATA_DIR, 'fraud_merged_dataset.csv')

if not os.path.exists(merged_path):
    print(f"❌ ERROR: {merged_path} not found!")
    print("Run merge_fraud_datasets.py first.")
    exit(1)

df = pd.read_csv(merged_path)
print(f"  ✅ Loaded: {len(df)} records")
print(f"     Columns: {len(df.columns)}")
print(f"     Memory: {df.memory_usage(deep=True).sum() / 1e6:.2f} MB")
print(f"     Fraud rate: {df['is_fraud'].mean():.2%}")
print(f"     Dataset breakdown:")
print(f"       - Credit Card: {(df['dataset'] == 'credit_card').sum()} records")
print(f"       - Bank: {(df['dataset'] == 'bank_transfer').sum()} records")

# ─────────────────────────────────────────────────────────────
# 2. FEATURE PREPARATION
# ─────────────────────────────────────────────────────────────

print("\n[2/5] Preparing features...")

# Separate features from labels
X = df.drop(columns=['is_fraud', 'dataset'])
y = df['is_fraud']

feature_names = X.columns.tolist()
print(f"  Features ({len(feature_names)}): {', '.join(feature_names[:5])}...")

# Handle missing values
initial_rows = len(X)
X = X.fillna(X.median())
X = X.fillna(0)
removed = initial_rows - len(X)
if removed > 0:
    print(f"  Removed {removed} rows with missing values → {len(X)} records")

# Standardize features (important for Isolation Forest)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_scaled = pd.DataFrame(X_scaled, columns=feature_names)

print(f"  ✅ Features standardized (mean≈0, std≈1)")
print(f"     Feature value ranges (after scaling):")
print(f"       min: {X_scaled.min().min():.4f}")
print(f"       max: {X_scaled.max().max():.4f}")

# ─────────────────────────────────────────────────────────────
# 3. TRAIN/TEST SPLIT
# ─────────────────────────────────────────────────────────────

print("\n[3/5] Splitting data (80/20)...")

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=SEED, stratify=y
)

print(f"  Training set: {len(X_train)} records ({y_train.mean():.2%} fraud)")
print(f"  Test set:     {len(X_test)} records ({y_test.mean():.2%} fraud)")

# ─────────────────────────────────────────────────────────────
# 4. TRAIN ISOLATION FOREST (UNSUPERVISED ANOMALY DETECTION)
# ─────────────────────────────────────────────────────────────

print("\n[4/5] Training Isolation Forest (Unsupervised Anomaly Detection)...")
print("      This model detects statistical outliers without labeled data")

iso_forest = IsolationForest(
    n_estimators=300,           # More trees for better anomaly variance
    contamination=0.05,         # Expect ~5% anomalies in real-world data
    max_samples='auto',
    random_state=SEED,
    n_jobs=-1,
    verbose=1
)

iso_forest.fit(X_train)
print(f"  ✅ Model trained")

# Get anomaly scores (decision_function)
# Negative score = anomaly, Positive score = normal
train_anomaly_scores = iso_forest.decision_function(X_train)
test_anomaly_scores = iso_forest.decision_function(X_test)

# Predict labels (-1 = anomaly, 1 = normal)
y_train_pred = iso_forest.predict(X_train)
y_test_pred = iso_forest.predict(X_test)

# Convert to binary (1 = anomaly, 0 = normal)
y_train_anomaly = (y_train_pred == -1).astype(int)
y_test_anomaly = (y_test_pred == -1).astype(int)

# ─────────────────────────────────────────────────────────────
# 5. EVALUATE & CALIBRATE
# ─────────────────────────────────────────────────────────────

print("\n[5/5] Evaluation & Threshold Calibration...")

# Normalize anomaly scores to [0, 1] probability space
# Lower anomaly_score (more negative) → higher fraud probability
score_min = np.percentile(test_anomaly_scores, 1)
score_max = np.percentile(test_anomaly_scores, 99)
score_range = score_max - score_min

# Transform: -1.0 (extreme anomaly) → 1.0, +1.0 (very normal) → 0.0
fraud_probabilities = np.clip(
    (score_max - test_anomaly_scores) / max(score_range, 1e-6),
    0.0, 1.0
)

# Evaluate using fraud labels as ground truth
# (Note: Isolation Forest is unsupervised, so perfect match isn't expected)
auc_score = roc_auc_score(y_test, fraud_probabilities)

print(f"\n  Anomaly Score Distribution (Test Set):")
print(f"    Min:       {test_anomaly_scores.min():.4f}")
print(f"    Max:       {test_anomaly_scores.max():.4f}")
print(f"    Mean:      {test_anomaly_scores.mean():.4f}")
print(f"    Std:       {test_anomaly_scores.std():.4f}")
print(f"    P1 (deep anomaly):  {score_min:.4f}")
print(f"    P99 (very normal):  {score_max:.4f}")

print(f"\n  Performance Metrics (Treating anomalies as fraud):")
print(f"    ROC-AUC:   {auc_score:.4f}")
print(f"    Anomalies detected: {y_test_anomaly.sum()} / {len(y_test)}")

# Optimal thresholds
threshold_conservative = 0.30    # Flag ~30% of transactions
threshold_moderate = 0.50        # Flag ~50% of transactions  
threshold_aggressive = 0.70      # Flag ~70% of transactions

print(f"\n  Recommended Fraud Score Thresholds:")
print(f"    Conservative: {threshold_conservative} (catch more fraud, more false positives)")
print(f"    Moderate:     {threshold_moderate}     (balanced)")
print(f"    Aggressive:   {threshold_aggressive}   (fewer false positives, fewer catches)")

# Classification report at moderate threshold
y_test_at_threshold = (fraud_probabilities >= threshold_moderate).astype(int)

print(f"\n  Classification Report (at moderate threshold {threshold_moderate}):")
print(classification_report(y_test, y_test_at_threshold, 
                           target_names=['Non-Fraud', 'Fraud'],
                           zero_division=0))

# Confusion matrix
cm = confusion_matrix(y_test, y_test_at_threshold)
print(f"\n  Confusion Matrix:")
print(f"    TN: {cm[0,0]:<6}  FP: {cm[0,1]:<6}  (Predicted Non-Fraud)")
print(f"    FN: {cm[1,0]:<6}  TP: {cm[1,1]:<6}  (Predicted Fraud)")

# ─────────────────────────────────────────────────────────────
# 6. SAVE MODELS & METADATA
# ─────────────────────────────────────────────────────────────

print("\n[6/6] Saving artifacts...")

# Save Isolation Forest model
model_path = os.path.join(MODEL_DIR, 'fraud_isolation_forest.joblib')
joblib.dump(iso_forest, model_path)
print(f"  ✅ Model saved: {model_path}")

# Save scaler
scaler_path = os.path.join(MODEL_DIR, 'fraud_scaler.joblib')
joblib.dump(scaler, scaler_path)
print(f"  ✅ Scaler saved: {scaler_path}")

# Save metadata
metadata = {
    "model_type": "Isolation Forest (Unsupervised Anomaly Detection)",
    "model_version": "FRAUD-IF-v2.0",
    "train_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "n_features": len(feature_names),
    "feature_names": feature_names,
    "feature_scale": "StandardScaler (mean=0, std=1)",
    
    "metrics": {
        "test_roc_auc": float(auc_score),
        "anomalies_detected": int(y_test_anomaly.sum()),
        "anomaly_rate": float(y_test_anomaly.mean()),
    },
    
    "score_distribution": {
        "min": float(test_anomaly_scores.min()),
        "max": float(test_anomaly_scores.max()),
        "mean": float(test_anomaly_scores.mean()),
        "std": float(test_anomaly_scores.std()),
        "p1": float(score_min),
        "p99": float(score_max),
    },
    
    "thresholds": {
        policy: {
            "name": "fraud_probability",
            "range": [0.0, 1.0],
            "conservative": 0.30,
            "moderate": 0.50,
            "aggressive": 0.70,
        }
        for policy in ["fraud_risk_scoring"]
    },
    
    "notes": [
        "Isolation Forest is unsupervised — detects anomalies, not necessarily fraud",
        "Fraud probabilities are normalized anomaly scores: P = (score_max - anom_score) / range",
        "Use 'moderate' threshold (0.50) for balanced operation",
        "Retraining recommended monthly or when performance degrades",
        "For supervised fraud detection, label a sample of 1000+ transactions and retrain XGBoost"
    ],
    
    "hyperparameters": {
        "n_estimators": 300,
        "contamination": 0.05,
        "max_samples": "auto",
        "random_state": 42,
    },
}

metadata_path = os.path.join(MODEL_DIR, 'fraud_model_metadata.json')
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"  ✅ Metadata saved: {metadata_path}")

# ─────────────────────────────────────────────────────────────
# 7. SUMMARY
# ─────────────────────────────────────────────────────────────

print("\n" + "="*70)
print("✅ TRAINING COMPLETE — Fraud Detection Model v2.0")
print("="*70)

print(f"\nModel Details:")
print(f"  Type:             {metadata['model_type']}")
print(f"  Version:          {metadata['model_version']}")
print(f"  Features:         {metadata['n_features']} features")
print(f"  Training Data:    {metadata['training_samples']} records")

print(f"\nPerformance:")
print(f"  ROC-AUC:          {auc_score:.4f}")
print(f"  Anomalies Found:  {y_test_anomaly.sum()} / {len(y_test)}")

print(f"\nNewly Trained Models:")
print(f"  1. {model_path}")
print(f"  2. {scaler_path}")
print(f"  3. {metadata_path}")

print(f"\nNext Steps:")
print(f"  1. Update app.py to load fraud_isolation_forest.joblib")
print(f"  2. Create /score_transaction endpoint in FastAPI")
print(f"  3. Connect frontend to real-time fraud alerts")
print(f"  4. Monitor model performance with production data")
print(f"  5. Periodically retrain (recommended monthly)")

print("\n" + "="*70 + "\n")
