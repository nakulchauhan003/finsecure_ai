/**
 * FinSecure AI — Risk Assessment API Service
 * Calls the real ML backend for scoring, fraud detection, and model metadata.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// --- Types ---

export interface ShapContribution {
  feature: string;
  feature_key: string;
  value: number;
  shap_value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface FraudFlag {
  severity: 'warning' | 'danger';
  message: string;
}

export interface FraudResult {
  probability: number;
  is_anomaly: boolean;
  anomaly_score: number;
  flags: FraudFlag[];
}

export interface FinancialRatios {
  dti_ratio: number;
  foir: number;
  loan_to_income: number;
  dscr: number;
}

export interface ThresholdInfo {
  risk_appetite: string;
  pd_cutoff: number;
  fraud_penalty: number;
}

export interface ModelMetadataShort {
  model_version: string;
  train_date: string;
  auc: number;
  n_features: number;
}

export interface ScoringResponse {
  pd: number;
  raw_pd: number;
  approval_probability: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  approved: boolean;
  recommendation: string;
  interest_rate: number | null;
  shap_values: ShapContribution[];
  fraud: FraudResult;
  financial_ratios: FinancialRatios;
  threshold: ThresholdInfo;
  model_metadata: ModelMetadataShort;
}

export interface ScoringRequest {
  employment_type: 'salaried' | 'self_employed';
  age: number;
  credit_score: number;
  monthly_income: number;
  loan_amount: number;
  previous_defaults: number;
  account_age: number;
  loan_enquiries: number;
  housing_type: 'rent' | 'owned';
  total_expenditure: number;
  other_fixed_expenses?: number;
  gross_revenue?: number;
  expected_margin?: number;
  business_rent?: number;
  utilities_salaries?: number;
  business_age?: number;
  gst_registered?: number;
  business_type?: string;
  loan_purpose?: 'personal' | 'education' | 'home' | 'vehicle' | 'business' | 'medical';
  risk_appetite: 'conservative' | 'moderate' | 'aggressive';
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ModelMetadataFull {
  model_version: string;
  model_type: string;
  train_date: string;
  training_samples: number;
  n_features: number;
  feature_columns: string[];
  feature_importance: FeatureImportance[];
  metrics: {
    auc: number;
    precision: number;
    recall: number;
    f1: number;
    ks_statistic: number;
    cv_auc_mean: number;
    cv_auc_std: number;
  };
  default_rate: number;
  hyperparameters: Record<string, number>;
  threshold_policy: Record<string, number>;
}

// --- API Calls ---

export async function scoreApplication(data: ScoringRequest): Promise<ScoringResponse> {
  const res = await fetch(`${API_BASE}/api/risk/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Scoring failed (${res.status})`);
  }

  return res.json();
}

export async function getFraudScore(data: Omit<ScoringRequest, 'risk_appetite'>): Promise<FraudResult> {
  const res = await fetch(`${API_BASE}/api/risk/fraud`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Fraud scoring failed (${res.status})`);
  }

  return res.json();
}

export async function getModelMetadata(): Promise<ModelMetadataFull> {
  const res = await fetch(`${API_BASE}/api/risk/model-metadata`);

  if (!res.ok) {
    throw new Error(`Failed to fetch model metadata (${res.status})`);
  }

  return res.json();
}

export async function checkMLServiceHealth(): Promise<{ status: string; model_version: string }> {
  const res = await fetch(`${API_BASE}/api/risk/health`);
  return res.json();
}
