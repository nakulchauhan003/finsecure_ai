import pandas as pd

df = pd.read_csv('data/credit_risk_dataset..csv')
print('Shape:', df.shape)
print('Columns:', list(df.columns))
print()
print(df.dtypes)
print()
print(df.head(5).to_string())
print()
print(df.describe().to_string())
print()
print('Nulls:')
print(df.isnull().sum())
print()
for c in df.columns:
    print(f'{c}: {df[c].nunique()} unique', end='')
    if df[c].nunique() <= 20:
        print(f' -> {sorted(df[c].dropna().unique())}')
    else:
        print()
print()
print('Correlations with loan_status:')
num_cols = df.select_dtypes(include='number').columns
print(df[num_cols].corr()['loan_status'].sort_values(ascending=False))
