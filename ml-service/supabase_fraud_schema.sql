-- ============================================================
-- FinSecure AI — Fraud Detection Tables
-- Safe Full Setup Script (Supabase)
-- ============================================================


-- ------------------------------------------------------------
-- 0. CLEAN OLD TABLES (prevents column mismatch errors)
-- ------------------------------------------------------------

DROP VIEW IF EXISTS fraud_alerts_summary;

DROP TABLE IF EXISTS fraud_rules_log CASCADE;
DROP TABLE IF EXISTS geo_anomalies CASCADE;
DROP TABLE IF EXISTS device_fingerprints CASCADE;
DROP TABLE IF EXISTS fraud_model_performance CASCADE;
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;



-- ------------------------------------------------------------
-- 1. TRANSACTIONS TABLE
-- ------------------------------------------------------------

CREATE TABLE transactions (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID NOT NULL,
  
  amount NUMERIC NOT NULL,
  
  merchant TEXT,
  merchant_category TEXT,
  
  channel TEXT NOT NULL CHECK (
    channel IN ('UPI','NEFT','RTGS','CARD','WALLET','ATM','OTHER')
  ),

  device_id TEXT,
  
  device_info JSONB DEFAULT '{}',
  
  ip_address INET,

  geo_location JSONB DEFAULT '{}',

  transaction_type TEXT CHECK (
    transaction_type IN ('PAYMENT','TRANSFER','WITHDRAWAL','DEPOSIT','OTHER')
  ),

  status TEXT DEFAULT 'completed' CHECK (
    status IN ('pending','completed','failed','disputed')
  ),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  metadata JSONB DEFAULT '{}'

);



CREATE INDEX idx_transactions_user_id
ON transactions(user_id);

CREATE INDEX idx_transactions_created_at
ON transactions(created_at);

CREATE INDEX idx_transactions_device_id
ON transactions(device_id);

CREATE INDEX idx_transactions_status
ON transactions(status);



-- ------------------------------------------------------------
-- 2. FRAUD ALERTS TABLE
-- ------------------------------------------------------------

CREATE TABLE fraud_alerts (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  user_id UUID NOT NULL,


  fraud_type TEXT NOT NULL,

  fraud_score NUMERIC NOT NULL CHECK (
    fraud_score >= 0 AND fraud_score <= 1
  ),

  fraud_probability NUMERIC DEFAULT 0,

  fraud_signals TEXT[] DEFAULT '{}',

  is_anomaly BOOLEAN DEFAULT false,


  model_source TEXT DEFAULT 'isolation_forest',

  model_version TEXT,


  status TEXT DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'under_investigation',
      'confirmed_fraud',
      'false_positive',
      'reported',
      'closed'
    )
  ),


  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  first_action_at TIMESTAMPTZ,

  closed_at TIMESTAMPTZ,


  analyst_action TEXT,

  analyst_notes TEXT,

  analyst_id UUID,

  confirmed_fraud BOOLEAN DEFAULT false,


  top_features JSONB DEFAULT '[]',

  related_risk_assessment_id UUID,


  is_early_warning_signal BOOLEAN DEFAULT false,

  is_red_flagged_account BOOLEAN DEFAULT false,


  reported_to_cfr BOOLEAN DEFAULT false,

  reported_to_fmr BOOLEAN DEFAULT false,

  report_reference TEXT,


  metadata JSONB DEFAULT '{}'

);



CREATE INDEX idx_fraud_alerts_user_id
ON fraud_alerts(user_id);

CREATE INDEX idx_fraud_alerts_transaction_id
ON fraud_alerts(transaction_id);

CREATE INDEX idx_fraud_alerts_status
ON fraud_alerts(status);

CREATE INDEX idx_fraud_alerts_created_at
ON fraud_alerts(created_at);

CREATE INDEX idx_fraud_alerts_updated_at
ON fraud_alerts(updated_at);

CREATE INDEX idx_fraud_alerts_fraud_score
ON fraud_alerts(fraud_score DESC);

CREATE INDEX idx_fraud_alerts_is_anomaly
ON fraud_alerts(is_anomaly);



-- ------------------------------------------------------------
-- 3. FRAUD RULES LOG
-- ------------------------------------------------------------

CREATE TABLE fraud_rules_log (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  fraud_alert_id UUID NOT NULL
  REFERENCES fraud_alerts(id)
  ON DELETE CASCADE,

  rule_name TEXT NOT NULL,

  rule_description TEXT,

  triggered BOOLEAN DEFAULT false,

  severity TEXT CHECK (
    severity IN ('low','medium','high')
  ),

  details JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()

);


CREATE INDEX idx_fraud_rules_log_alert_id
ON fraud_rules_log(fraud_alert_id);

CREATE INDEX idx_fraud_rules_log_triggered
ON fraud_rules_log(triggered);



-- ------------------------------------------------------------
-- 4. DEVICE FINGERPRINTS
-- ------------------------------------------------------------

CREATE TABLE device_fingerprints (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  device_id TEXT NOT NULL UNIQUE,

  first_user_id UUID NOT NULL,

  last_user_id UUID,

  user_count INT DEFAULT 1,

  transaction_count INT DEFAULT 0,

  flagged BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),

  last_seen_at TIMESTAMPTZ DEFAULT now()

);


CREATE INDEX idx_device_fingerprints_device_id
ON device_fingerprints(device_id);

CREATE INDEX idx_device_fingerprints_flagged
ON device_fingerprints(flagged);



-- ------------------------------------------------------------
-- 5. GEO ANOMALIES
-- ------------------------------------------------------------

CREATE TABLE geo_anomalies (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL,

  location_from JSONB NOT NULL,

  location_to JSONB NOT NULL,

  distance_km NUMERIC,

  time_seconds NUMERIC,

  velocity_kmh NUMERIC,

  is_possible BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT now()

);


CREATE INDEX idx_geo_anomalies_user_id
ON geo_anomalies(user_id);

CREATE INDEX idx_geo_anomalies_is_possible
ON geo_anomalies(is_possible);



-- ------------------------------------------------------------
-- 6. FRAUD MODEL PERFORMANCE
-- ------------------------------------------------------------

CREATE TABLE fraud_model_performance (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  model_version TEXT NOT NULL,

  metric_type TEXT NOT NULL CHECK (
    metric_type IN (
      'precision',
      'recall',
      'f1',
      'auc',
      'fraud_rate',
      'alert_volume'
    )
  ),

  metric_value NUMERIC NOT NULL,

  measurement_window TEXT,

  total_transactions INT,

  total_alerts INT,

  confirmed_frauds INT,

  false_positives INT,

  created_at TIMESTAMPTZ DEFAULT now()

);


CREATE INDEX idx_model_perf_version
ON fraud_model_performance(model_version);

CREATE INDEX idx_model_perf_created_at
ON fraud_model_performance(created_at);


-- ------------------------------------------------------------
-- 7. FRAUD SYSTEM LOGS
-- ------------------------------------------------------------

CREATE TABLE fraud_system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_fraud_system_logs_created_at
ON fraud_system_logs(created_at DESC);

CREATE INDEX idx_fraud_system_logs_event_type
ON fraud_system_logs(event_type);



-- ------------------------------------------------------------
-- 8. ALERT SUMMARY VIEW (DASHBOARD)
-- ------------------------------------------------------------

CREATE VIEW fraud_alerts_summary AS

SELECT

  COUNT(*) AS total_alerts,

  SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_alerts,

  SUM(CASE WHEN status='confirmed_fraud' THEN 1 ELSE 0 END) AS confirmed_frauds,

  SUM(CASE WHEN status='false_positive' THEN 1 ELSE 0 END) AS false_positives,

  SUM(CASE WHEN is_early_warning_signal THEN 1 ELSE 0 END) AS ews_signals,

  SUM(CASE WHEN is_red_flagged_account THEN 1 ELSE 0 END) AS rfa_accounts,

  AVG(fraud_score) AS avg_fraud_score,

  MAX(fraud_score) AS max_fraud_score,

  DATE(created_at) AS alert_date

FROM fraud_alerts

GROUP BY DATE(created_at);



-- ------------------------------------------------------------
-- 9. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_rules_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_system_logs ENABLE ROW LEVEL SECURITY;



-- ------------------------------------------------------------
-- 10. TESTING POLICIES (Allow all for development)
-- ------------------------------------------------------------

CREATE POLICY "allow_all_select_fraud_alerts"
ON fraud_alerts FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_fraud_alerts"
ON fraud_alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_fraud_alerts"
ON fraud_alerts FOR UPDATE USING (true);



CREATE POLICY "allow_all_select_transactions"
ON transactions FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_transactions"
ON transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_transactions"
ON transactions FOR UPDATE USING (true);



CREATE POLICY "allow_all_rules_log"
ON fraud_rules_log FOR ALL USING (true);

CREATE POLICY "allow_all_devices"
ON device_fingerprints FOR ALL USING (true);

CREATE POLICY "allow_all_geo"
ON geo_anomalies FOR ALL USING (true);

CREATE POLICY "allow_all_model_perf"
ON fraud_model_performance FOR ALL USING (true);

CREATE POLICY "allow_all_system_logs"
ON fraud_system_logs FOR ALL USING (true);