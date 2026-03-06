import requests

profiles = [
    {"name": "Strong", "data": {"employment_type": "salaried", "age": 40, "credit_score": 800, "monthly_income": 200000, "loan_amount": 100000, "previous_defaults": 0, "account_age": 15, "loan_enquiries": 0, "housing_type": "owned", "total_expenditure": 50000, "other_fixed_expenses": 10000, "risk_appetite": "moderate"}},
    {"name": "Good", "data": {"employment_type": "salaried", "age": 35, "credit_score": 720, "monthly_income": 75000, "loan_amount": 500000, "previous_defaults": 0, "account_age": 5, "loan_enquiries": 2, "housing_type": "rent", "total_expenditure": 35000, "other_fixed_expenses": 10000, "risk_appetite": "moderate"}},
    {"name": "Mid", "data": {"employment_type": "salaried", "age": 30, "credit_score": 650, "monthly_income": 50000, "loan_amount": 300000, "previous_defaults": 1, "account_age": 3, "loan_enquiries": 3, "housing_type": "rent", "total_expenditure": 30000, "other_fixed_expenses": 5000, "risk_appetite": "moderate"}},
    {"name": "Weak", "data": {"employment_type": "salaried", "age": 22, "credit_score": 550, "monthly_income": 25000, "loan_amount": 500000, "previous_defaults": 2, "account_age": 1, "loan_enquiries": 5, "housing_type": "rent", "total_expenditure": 20000, "other_fixed_expenses": 5000, "risk_appetite": "moderate"}},
]

for p in profiles:
    r = requests.post("http://localhost:8000/score_application", json=p["data"]).json()
    print(f"{p['name']:8s}: PD={r['pd']:.4f}  raw_PD={r['raw_pd']:.4f}  Cat={r['risk_category']:8s}  Score={r['risk_score']:5.1f}  Approved={r['approved']}")
    # Show top 3 SHAP factors
    for sv in r["shap_values"][:3]:
        print(f"         {sv['feature']:25s} val={sv['value']:.2f}  shap={sv['shap_value']:+.4f}")
    print()
