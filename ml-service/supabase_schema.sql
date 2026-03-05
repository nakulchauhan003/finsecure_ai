-- ============================================================
-- FinSecure AI — Risk Assessment Tables
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Risk Assessments table — stores every application score
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Applicant info
  applicant_name TEXT,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('salaried', 'self_employed')),
  age INTEGER,
  credit_score INTEGER CHECK (credit_score BETWEEN 300 AND 900),
  monthly_income NUMERIC NOT NULL,
  loan_amount NUMERIC NOT NULL,
  previous_defaults INTEGER DEFAULT 0,
  account_age NUMERIC DEFAULT 0,
  loan_enquiries INTEGER DEFAULT 0,
  housing_type TEXT CHECK (housing_type IN ('rent', 'owned')),

  -- Self-employed specific
  business_type TEXT,
  gross_revenue NUMERIC DEFAULT 0,
  expected_margin NUMERIC DEFAULT 0,
  business_rent NUMERIC DEFAULT 0,
  utilities_salaries NUMERIC DEFAULT 0,
  business_age NUMERIC DEFAULT 0,
  gst_registered BOOLEAN DEFAULT false,

  -- Salaried specific
  total_expenditure NUMERIC DEFAULT 0,
  other_fixed_expenses NUMERIC DEFAULT 0,

  -- ML model results
  pd_score NUMERIC,                     -- probability of default
  risk_score NUMERIC,                   -- 0-100 score
  risk_category TEXT,                   -- LOW, MEDIUM, HIGH, CRITICAL
  approved BOOLEAN,
  recommendation TEXT,
  interest_rate NUMERIC,
  model_version TEXT,

  -- SHAP explanations (stored as JSONB)
  shap_values JSONB,

  -- Fraud detection results
  fraud_probability NUMERIC,
  fraud_is_anomaly BOOLEAN DEFAULT false,
  fraud_flags JSONB,

  -- Financial ratios
  dti_ratio NUMERIC,
  foir NUMERIC,
  loan_to_income NUMERIC,
  dscr NUMERIC,

  -- Risk appetite used
  risk_appetite TEXT DEFAULT 'moderate' CHECK (risk_appetite IN ('conservative', 'moderate', 'aggressive')),

  -- Gemini AI analysis (optional)
  ai_analysis JSONB,

  -- User who ran the assessment (no FK to auth.users — Supabase manages auth separately)
  assessed_by UUID
);

-- 2. Model metadata table — tracks model versions
CREATE TABLE IF NOT EXISTS risk_model_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_version TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL,
  train_date DATE NOT NULL,
  training_samples INTEGER,
  n_features INTEGER,
  auc NUMERIC,
  precision_score NUMERIC,
  recall_score NUMERIC,
  f1_score NUMERIC,
  ks_statistic NUMERIC,
  cv_auc_mean NUMERIC,
  feature_importance JSONB,
  hyperparameters JSONB,
  threshold_policy JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Risk appetite profiles — configurable credit policies
CREATE TABLE IF NOT EXISTS risk_appetite_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  pd_cutoff NUMERIC NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default risk appetite profiles
INSERT INTO risk_appetite_profiles (name, label, pd_cutoff, description, is_default) VALUES
  ('conservative', 'Conservative', 0.20, 'Strict lending criteria. Lower risk tolerance. Suitable for risk-averse portfolio management.', false),
  ('moderate', 'Moderate', 0.35, 'Balanced approach. Standard RBI-aligned thresholds. Default policy.', true),
  ('aggressive', 'Aggressive', 0.50, 'Higher risk tolerance. Growth-focused lending. Requires enhanced monitoring.', false)
ON CONFLICT (name) DO NOTHING;

-- 4. Add assessed_by column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'risk_assessments' AND column_name = 'assessed_by'
  ) THEN
    ALTER TABLE risk_assessments ADD COLUMN assessed_by UUID;
  END IF;
END
$$;

-- 5. Enable Row Level Security
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_appetite_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent re-runs)
DROP POLICY IF EXISTS "Users can view their own assessments" ON risk_assessments;
DROP POLICY IF EXISTS "Users can insert assessments" ON risk_assessments;
DROP POLICY IF EXISTS "Authenticated users can view model metadata" ON risk_model_metadata;
DROP POLICY IF EXISTS "Authenticated users can view risk profiles" ON risk_appetite_profiles;

-- RLS Policies — authenticated users can read/write their own assessments
CREATE POLICY "Users can view their own assessments"
  ON risk_assessments FOR SELECT
  USING (auth.uid() = assessed_by);

CREATE POLICY "Users can insert assessments"
  ON risk_assessments FOR INSERT
  WITH CHECK (auth.uid() = assessed_by);

-- Model metadata is readable by all authenticated users
CREATE POLICY "Authenticated users can view model metadata"
  ON risk_model_metadata FOR SELECT
  USING (auth.role() = 'authenticated');

-- Risk appetite profiles are readable by all authenticated users
CREATE POLICY "Authenticated users can view risk profiles"
  ON risk_appetite_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_by ON risk_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_category ON risk_assessments(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_model_metadata_active ON risk_model_metadata(is_active) WHERE is_active = true;
