"""
Merge two fraud detection datasets into unified training dataset.

Dataset 1: Credit card fraud (284K+ records)
  - Features: V1-V28 (anonymized), Time, Amount
  - Label: Class (0=non-fraud, 1=fraud)

Dataset 2: Bank transaction fraud
  - Features: step, type, amount, transaction metadata
  - Label: isFraud (0=non-fraud, 1=fraud)

Output: Unified dataset with standardized features suitable for:
  - Isolation Forest (unsupervised anomaly)
  - XGBoost (supervised binary classification)
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data2')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'data')

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("FRAUD DATASET MERGING & PREPROCESSING")
print("=" * 70)

# ────────────────────────────────────────────────────────────────
# 1. Load Dataset 1: Credit Card Fraud
# ────────────────────────────────────────────────────────────────

print("\n[1/4] Loading Credit Card Fraud Dataset...")
cc_path = os.path.join(DATA_DIR, 'creditcard.csv')
if not os.path.exists(cc_path):
    print(f"❌ Not found: {cc_path}")
    exit(1)

df_cc = pd.read_csv(cc_path)
print(f"  Loaded: {len(df_cc)} records")
print(f"  Columns: {df_cc.columns.tolist()}")
print(f"  Fraud rate: {df_cc['Class'].mean():.2%}")
print(f"  Features: V1-V28 (PCA-transformed), Time, Amount")

# ────────────────────────────────────────────────────────────────
# 2. Load Dataset 2: Bank Transaction Fraud
# ────────────────────────────────────────────────────────────────

print("\n[2/4] Loading Bank Transaction Fraud Dataset...")
bank_path = os.path.join(DATA_DIR, 'PS_20174392719_1491204439457_log.csv')
if not os.path.exists(bank_path):
    print(f"❌ Not found: {bank_path}")
    exit(1)

df_bank = pd.read_csv(bank_path)
print(f"  Loaded: {len(df_bank)} records")
print(f"  Columns: {df_bank.columns.tolist()}")
print(f"  Fraud rate: {df_bank['isFraud'].mean():.2%}")
print(f"  Transaction types: {df_bank['type'].unique().tolist()}")

# ────────────────────────────────────────────────────────────────
# 3. Normalize & Merge Datasets
# ────────────────────────────────────────────────────────────────

print("\n[3/4] Normalizing & Merging Datasets...")

# --- Normalize Credit Card Dataset ---
df_cc_norm = df_cc.copy()
df_cc_norm['dataset'] = 'credit_card'
df_cc_norm['is_fraud'] = df_cc_norm['Class'].astype(int)

# PCA features V1-V28 are already standardized (mean≈0, std≈1)
# Amount needs log transformation (right-skewed)
df_cc_norm['log_amount'] = np.log1p(df_cc_norm['Amount'])
df_cc_norm['normalized_amount'] = (df_cc_norm['Amount'] - df_cc_norm['Amount'].min()) / \
                                  (df_cc_norm['Amount'].max() - df_cc_norm['Amount'].min())

# Time is in seconds — convert to hours
df_cc_norm['time_hour'] = (df_cc_norm['Time'] / 3600) % 24

# Select features for credit card
cc_features = [f'V{i}' for i in range(1, 29)] + ['log_amount', 'time_hour']
df_cc_norm_subset = df_cc_norm[cc_features + ['is_fraud', 'dataset']].copy()

print(f"  Credit Card dataset: {len(df_cc_norm_subset)} records → {len(cc_features)} features")

# --- Normalize Bank Transaction Dataset ---
df_bank_norm = df_bank.copy()
df_bank_norm['dataset'] = 'bank_transfer'
df_bank_norm['is_fraud'] = df_bank_norm['isFraud'].astype(int)

# Extract features from bank data
df_bank_norm['log_amount'] = np.log1p(df_bank_norm['amount'])
df_bank_norm['normalized_amount'] = (df_bank_norm['amount'] - df_bank_norm['amount'].min()) / \
                                    (df_bank_norm['amount'].max() - df_bank_norm['amount'].min())

# Transaction velocity (number of transactions per step)
df_bank_norm['transaction_velocity'] = df_bank_norm.groupby('nameOrig')['step'].transform('count')
df_bank_norm['transaction_velocity'] = np.log1p(df_bank_norm['transaction_velocity'])

# Balance change ratio
df_bank_norm['balance_change_ratio'] = (df_bank_norm['newbalanceOrig'] - df_bank_norm['oldbalanceOrg']) / \
                                       np.maximum(df_bank_norm['oldbalanceOrg'], 1)

# Destination balance change
df_bank_norm['dest_balance_change'] = (df_bank_norm['newbalanceDest'] - df_bank_norm['oldbalanceDest']) / \
                                      np.maximum(df_bank_norm['oldbalanceDest'], 1)

# Transaction type encoding
type_map = {t: i for i, t in enumerate(df_bank_norm['type'].unique())}
df_bank_norm['transaction_type_enc'] = df_bank_norm['type'].map(type_map)

# Time of day
df_bank_norm['time_hour'] = (df_bank_norm['step'] % 24).astype(float)

# Bank features to use
bank_features = [
    'log_amount',
    'normalized_amount',
    'transaction_velocity',
    'balance_change_ratio',
    'dest_balance_change',
    'transaction_type_enc',
    'time_hour'
]

df_bank_norm_subset = df_bank_norm[bank_features + ['is_fraud', 'dataset']].copy()

# Pad credit card features to match bank features
for col in bank_features:
    if col not in df_cc_norm_subset.columns:
        df_cc_norm_subset[col] = 0

# Pad bank features to match credit card features
for col in cc_features:
    if col not in df_bank_norm_subset.columns:
        df_bank_norm_subset[col] = 0

print(f"  Bank dataset: {len(df_bank_norm_subset)} records")

# --- Merge Both Datasets ---
# Create unified feature set (intersection of both)
common_features = ['log_amount', 'normalized_amount', 'time_hour', 'is_fraud', 'dataset']

# Add PCA features for credit card (fill with 0 for bank)
pca_features = [f'V{i}' for i in range(1, 29)]
for col in pca_features:
    if col not in df_cc_norm_subset.columns:
        print(f"Warning: {col} missing from credit card data")

df_cc_final = df_cc_norm_subset[common_features + pca_features].copy()
df_bank_final = df_bank_norm_subset.copy()

# Ensure bank has all PCA columns (pad with 0)
for col in pca_features:
    if col not in df_bank_final.columns:
        df_bank_final[col] = 0

# Reorder columns
final_columns = common_features + pca_features
df_cc_final = df_cc_final[final_columns]
df_bank_final = df_bank_final[final_columns]

# Merge
df_merged = pd.concat([df_cc_final, df_bank_final], ignore_index=True)

print(f"\n  ✅ Merged: {len(df_merged)} total records")
print(f"     Credit Card: {len(df_cc_final)} records")
print(f"     Bank:        {len(df_bank_final)} records")
print(f"  Overall fraud rate: {df_merged['is_fraud'].mean():.2%}")
print(f"  Fraud cases: {df_merged['is_fraud'].sum()}")
print(f"  Non-fraud:   {(df_merged['is_fraud'] == 0).sum()}")

# ────────────────────────────────────────────────────────────────
# 4. Feature Engineering & Final Preprocessing
# ────────────────────────────────────────────────────────────────

print("\n[4/4] Feature Engineering & Final Preprocessing...")

# Shuffle
df_merged = df_merged.sample(frac=1, random_state=42).reset_index(drop=True)

# Remove rows with missing values
initial_count = len(df_merged)
df_merged = df_merged.dropna()
removed_count = initial_count - len(df_merged)
if removed_count > 0:
    print(f"  Removed {removed_count} rows with missing values")

# Log & statistical features
df_merged['log_amount_squared'] = df_merged['log_amount'] ** 2
df_merged['amount_to_mean_ratio'] = df_merged['normalized_amount'] / \
                                    (df_merged.groupby('dataset')['normalized_amount'].transform('mean') + 1e-6)

# Outlier detection (for fraud likelihood)
for col in ['log_amount', 'time_hour']:
    mean = df_merged[col].mean()
    std = df_merged[col].std()
    df_merged[f'{col}_zscore'] = np.abs((df_merged[col] - mean) / (std + 1e-6))

print(f"  Final features: {len([c for c in df_merged.columns if c not in ['is_fraud', 'dataset']])} engineered")

# Summary
print(f"\n  ✅ Final merged dataset:")
print(f"     Total records: {len(df_merged)}")
print(f"     Features: {df_merged.shape[1] - 2} (excluding is_fraud, dataset)")
print(f"     Fraud rate: {df_merged['is_fraud'].mean():.2%}")
print(f"     Memory: {df_merged.memory_usage(deep=True).sum() / 1e6:.2f} MB")

# Save merged dataset
output_path = os.path.join(OUTPUT_DIR, 'fraud_merged_dataset.csv')
df_merged.to_csv(output_path, index=False)
print(f"\n✅ Saved: {output_path}")

# Save train/test split info
train_size = int(len(df_merged) * 0.8)
print(f"\nRecommended split (80/20):")
print(f"  Training:   {train_size} records")
print(f"  Testing:    {len(df_merged) - train_size} records")

print("\n" + "=" * 70)
print("MERGE COMPLETE ✅")
print("=" * 70)
