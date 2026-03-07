const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface PredictLoanRequest {
  credit_score: number;
  income: number;
  loan_amount: number;
  term: number;
  employment_type: 'salaried' | 'self_employed';
  applicant_id?: string;
}

export interface PredictLoanResponse {
  applicant_id?: string;
  approval_probability: number;
  decision: 'approved' | 'rejected';
  pd: number;
  shap_values: Record<string, number>;
  top_features: string[];
  reason_codes: string[];
  model_metadata: {
    model_version: string;
    train_date: string;
    auc: number;
    n_features: number;
  };
  financial_ratios: {
    dti_ratio: number;
    foir: number;
    loan_to_income: number;
    dscr: number;
  };
  raw: {
    approved: boolean;
    risk_category: string;
    recommendation: string;
    model_metadata: {
      model_version: string;
      train_date: string;
      auc: number;
      n_features: number;
    };
    shap_values: Array<{
      feature: string;
      feature_key: string;
      value: number;
      shap_value: number;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  };
}

export interface LimeResponse {
  lime_weights: Record<string, number>;
  method: string;
  class_explained: string;
}

export interface CounterfactualResponse {
  applicant_id?: string;
  minimal_changes: Record<string, string>;
  new_probability: number;
  options?: Array<{
    minimal_changes: Record<string, string>;
    new_probability: number;
    cost: number;
  }>;
  target?: 'approve' | 'reject';
  message?: string;
}

export interface GlobalInsightsResponse {
  feature_importance: Array<{ feature: string; importance: number }>;
  approval_distribution: {
    approved: number;
    rejected: number;
    samples: number;
  };
  pd_summary: {
    mean_pd: number | null;
    median_pd: number | null;
  };
  fairness_metrics: {
    status: string;
    note: string;
  };
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export async function predictLoan(req: PredictLoanRequest): Promise<PredictLoanResponse> {
  const res = await fetch(`${API_BASE}/api/risk/predict-loan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return parseOrThrow(res);
}

export async function explainLoanLime(req: PredictLoanRequest): Promise<LimeResponse> {
  const res = await fetch(`${API_BASE}/api/risk/explain-lime`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return parseOrThrow(res);
}

export async function getCounterfactual(req: {
  applicant_id?: string;
  target: 'approve' | 'reject';
  features: PredictLoanRequest;
}): Promise<CounterfactualResponse> {
  const res = await fetch(`${API_BASE}/api/risk/counterfactual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return parseOrThrow(res);
}

export async function getGlobalInsights(): Promise<GlobalInsightsResponse> {
  const res = await fetch(`${API_BASE}/api/risk/global-insights`);
  return parseOrThrow(res);
}
