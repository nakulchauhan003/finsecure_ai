import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleAuth } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID, createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3002;
const PROJECT_ID = 'shirokuma-487907';
const GEMINI_MODEL = 'gemini-2.5-flash';
const CREDENTIALS_PATH = resolve(__dirname, '..', 'bank-frontend', 'credentials.json');
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function getEnvValueFromFile(key) {
  try {
    const envPath = resolve(__dirname, '..', 'bank-frontend', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const line = envContent
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`));
    if (!line) return '';
    let value = line.slice(key.length + 1).trim();
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  } catch {
    return '';
  }
}

function toUuid(value) {
  const asString = `${value || ''}`.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(asString)) return asString;

  const hex = createHash('md5').update(asString || randomUUID()).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function logFraudEvent(supabase, eventType, message, payload = {}, severity = 'info') {
  try {
    await supabase.from('fraud_system_logs').insert([{ 
      event_type: eventType,
      severity,
      message,
      payload,
      created_at: new Date().toISOString(),
    }]);
  } catch {
    // Log table may not exist yet, skip silently to avoid breaking main flow.
  }
}

let credentials;
try {
  credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  console.log(`Loaded service account: ${credentials.client_email}`);
} catch (err) {
  console.error('Could not load credentials.json:', err.message);
  process.exit(1);
}

const auth = new GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/generative-language',
  ],
});

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

const SUPABASE_URL = process.env.SUPABASE_URL || getEnvValueFromFile('VITE_SUPABASE_URL') || 'https://bvsvixkgcbslhrgdkikm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnvValueFromFile('VITE_SUPABASE_SERVICE_KEY') || process.env.SUPABASE_ANON_KEY || getEnvValueFromFile('VITE_SUPABASE_ANON_KEY');

console.log('[Supabase Init] URL:', SUPABASE_URL);
console.log('[Supabase Init] KEY length:', SUPABASE_KEY?.length || 0);
console.log('[Supabase Init] KEY prefix:', SUPABASE_KEY?.substring(0, 20) || 'none');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'invalid-key');

const app = express();
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '20mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try {
    const token = await getAccessToken();
    const { error } = await supabase.from('fraud_alerts').select('id').limit(1);

    res.json({
      status: 'ok',
      serviceAccount: credentials.client_email,
      project: PROJECT_ID,
      hasToken: !!token,
      supabaseOk: !error,
      supabaseError: error?.message || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, systemInstruction, useSearch, responseType } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const token = await getAccessToken();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    if (systemInstruction) payload.system_instruction = { parts: [{ text: systemInstruction }] };
    if (useSearch) payload.tools = [{ google_search: {} }];

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error?.message || 'Gemini API error', details: data });
    }

    await logFraudEvent(supabase, 'gemini_analysis', 'Gemini AI analysis executed', {
      useSearch: Boolean(useSearch),
      responseType: responseType || 'text',
    }, 'info');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini', raw: data });

    if (responseType === 'json') {
      try {
        const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();
        return res.json({ text, parsed: JSON.parse(cleaned) });
      } catch {
        return res.json({ text, parsed: null, parseError: 'Could not parse JSON from response' });
      }
    }

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vision/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) is required' });

    const token = await getAccessToken();
    const url = 'https://vision.googleapis.com/v1/images:annotate';

    const payload = {
      requests: [{
        image: { content: image },
        features: [
          { type: 'TEXT_DETECTION', maxResults: 1 },
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'IMAGE_PROPERTIES' },
        ],
      }],
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'Vision API error', details: data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nlp/analyze', async (req, res) => {
  try {
    const { text, features } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const token = await getAccessToken();
    const featureType = features || 'analyzeSentiment';
    const url = `https://language.googleapis.com/v1/documents:${featureType}`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document: { type: 'PLAIN_TEXT', content: text },
        encodingType: 'UTF8',
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'NLP API error', details: data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/risk/score', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/score_application`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      12000,
    );

    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'ML scoring error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.post('/api/risk/predict-loan', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/predict_loan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      12000,
    );

    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Predict loan error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.post('/api/risk/explain-lime', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/explain_lime`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      15000,
    );

    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'LIME explanation error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.post('/api/risk/counterfactual', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/counterfactual`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      15000,
    );

    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Counterfactual error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.get('/api/risk/global-insights', async (_req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(`${ML_SERVICE_URL}/global_insights`, {}, 10000);
    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Global insights error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.get('/api/risk/global-shap-summary', async (_req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(`${ML_SERVICE_URL}/global_shap_summary`, {}, 15000);
    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Global SHAP error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable. Retrying may help.' });
  }
});

app.post('/api/risk/fraud', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/fraud_score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      12000,
    );

    if (!response.ok) return res.status(response.status).json({ error: data.detail || 'Fraud scoring error', details: data });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

app.post('/api/signature/verify', async (req, res) => {
  try {
    const { response, data } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/verify_signature`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      15000,
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.error || 'Signature verification error',
        details: data,
      });
    }

    return res.json(data);
  } catch {
    return res.status(503).json({ error: 'Signature verification service unavailable' });
  }
});

app.get('/api/risk/model-metadata', async (_req, res) => {
  try {
    const { data } = await fetchWithTimeout(`${ML_SERVICE_URL}/model_metadata`, {}, 8000);
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

app.get('/api/risk/health', async (_req, res) => {
  try {
    const { data } = await fetchWithTimeout(`${ML_SERVICE_URL}/health`, {}, 8000);
    res.json({ ...data, proxy: true });
  } catch (err) {
    res.status(503).json({ status: 'ml_service_down', error: err.message });
  }
});

app.get('/api/risk/monitoring', async (_req, res) => {
  try {
    const { data } = await fetchWithTimeout(`${ML_SERVICE_URL}/monitoring`, {}, 8000);
    res.json(data);
  } catch {
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

function getSeverity(score) {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  return 'LOW';
}

app.post('/api/fraud/score-transaction', async (req, res) => {
  try {
    const {
      transaction_id,
      user_id,
      amount,
      device_id,
      channel,
      transaction_type,
      merchant,
      location,
      ip_address,
      geo_location,
      previous_amounts,
      previous_locations,
    } = req.body;

    if (!user_id || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: user_id, amount' });
    }

    const externalTransactionId = transaction_id || `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const canonicalUserId = toUuid(user_id);

    const { response, data: fraudScore } = await fetchWithTimeout(
      `${ML_SERVICE_URL}/score_transaction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: externalTransactionId,
          user_id: canonicalUserId,
          amount,
          device_id: device_id || null,
          channel: channel || 'UPI',
          transaction_type: transaction_type || 'TRANSFER',
          merchant: merchant || null,
          geo_location: geo_location || (location ? { city: location } : null),
          ip_address: ip_address || null,
          previous_amounts: previous_amounts || null,
          previous_locations: previous_locations || null,
        }),
      },
      12000,
    );

    if (!response.ok || fraudScore?.error) {
      await logFraudEvent(supabase, 'model_error', 'Transaction scoring failed', { responseStatus: response.status, fraudScore }, 'error');
      return res.status(503).json({
        error: 'Fraud system temporarily unavailable. Retrying connection...',
        details: fraudScore?.error || fraudScore,
      });
    }

    const transactionPayload = {
      user_id: canonicalUserId,
      amount,
      merchant: merchant || null,
      channel: channel || 'UPI',
      device_id: device_id || null,
      ip_address: ip_address || null,
      geo_location: geo_location || (location ? { city: location } : {}),
      transaction_type: transaction_type || 'TRANSFER',
      status: 'completed',
      metadata: { external_transaction_id: externalTransactionId, external_user_id: user_id },
    };

    const { data: txRow, error: txError } = await supabase
      .from('transactions')
      .insert([transactionPayload])
      .select('id, created_at, channel, amount, device_id, geo_location, merchant')
      .single();

    if (txError) {
      await logFraudEvent(supabase, 'db_error', 'Transaction insert failed', { txError: txError.message }, 'error');
      return res.status(500).json({ error: 'Failed to persist transaction', details: txError.message });
    }

    let createdAlert = null;
    if ((fraudScore.fraud_score || 0) >= 0.3) {
      const alertPayload = {
        transaction_id: txRow.id,
        user_id: canonicalUserId,
        fraud_score: fraudScore.fraud_score,
        fraud_probability: fraudScore.fraud_probability || fraudScore.fraud_score,
        fraud_type: fraudScore.fraud_type || 'ANOMALY',
        fraud_signals: fraudScore.fraud_signals || [],
        status: 'pending',
        is_anomaly: fraudScore.is_anomaly || false,
        analyst_notes: `Auto-flagged: ${fraudScore.recommendation || 'REVIEW'}`,
        model_source: 'isolation_forest',
        model_version: fraudScore.model_version || 'FRAUD-IF-v2.0',
        metadata: {
          recommendation: fraudScore.recommendation,
          recommended_action: fraudScore.recommended_action,
          confidence: fraudScore.confidence,
          external_transaction_id: externalTransactionId,
          external_user_id: user_id,
        },
      };

      const { data: alertRow, error: alertError } = await supabase
        .from('fraud_alerts')
        .insert([alertPayload])
        .select('*')
        .single();

      if (alertError) {
        await logFraudEvent(supabase, 'db_error', 'Fraud alert insert failed', { alertError: alertError.message }, 'error');
      } else {
        createdAlert = alertRow;
        await logFraudEvent(supabase, 'alert_created', 'New fraud alert created', {
          alert_id: alertRow.id,
          transaction_id: txRow.id,
          user_id: canonicalUserId,
          fraud_score: alertRow.fraud_score,
          severity: getSeverity(alertRow.fraud_score),
        }, 'warning');

        if (String(fraudScore.recommendation || '').toUpperCase() === 'BLOCK') {
          await logFraudEvent(supabase, 'model_block', 'Model triggered BLOCK recommendation', {
            alert_id: alertRow.id,
            fraud_score: alertRow.fraud_score,
            recommendation: fraudScore.recommendation,
          }, 'error');
        }
      }
    }

    res.json({
      ...fraudScore,
      severity: getSeverity(fraudScore.fraud_score || 0),
      transaction: txRow,
      alert: createdAlert,
      external_transaction_id: externalTransactionId,
      external_user_id: user_id,
    });
  } catch (err) {
    await logFraudEvent(supabase, 'api_failure', 'Score transaction endpoint error', { error: err.message }, 'error');
    res.status(500).json({ error: 'Fraud scoring failed', details: err.message });
  }
});

app.get('/api/fraud/alerts', async (req, res) => {
  try {
    const {
      status = 'pending',
      fraudType,
      minFraudScore,
      maxFraudScore,
      sortBy = 'highest_score',
      page = 1,
      limit = 20,
      minAmount,
      maxAmount,
      channel,
      location,
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

    let query = supabase
      .from('fraud_alerts')
      .select('*, transactions(amount, channel, device_id, geo_location, merchant, created_at)', { count: 'exact' });

    if (status !== 'all') query = query.eq('status', status);
    if (fraudType) query = query.eq('fraud_type', fraudType);
    if (minFraudScore !== undefined) query = query.gte('fraud_score', Number(minFraudScore));
    if (maxFraudScore !== undefined) query = query.lte('fraud_score', Number(maxFraudScore));

    const sortMap = {
      highest_score: { column: 'fraud_score', ascending: false },
      newest: { column: 'created_at', ascending: false },
      oldest: { column: 'created_at', ascending: true },
    };
    const selectedSort = sortMap[sortBy] || sortMap.highest_score;
    query = query.order(selectedSort.column, { ascending: selectedSort.ascending });

    const { data, error, count } = await query;
    if (error) {
      await logFraudEvent(supabase, 'db_error', 'Fetch alerts failed', { error: error.message }, 'error');
      return res.status(500).json({ error: 'Failed to fetch alerts', details: error.message });
    }

    let filtered = data || [];
    if (channel) filtered = filtered.filter((a) => a.transactions?.channel === channel);
    if (location) filtered = filtered.filter((a) => (a.transactions?.geo_location?.city || '').toLowerCase().includes(String(location).toLowerCase()));
    if (minAmount !== undefined) filtered = filtered.filter((a) => Number(a.transactions?.amount || 0) >= Number(minAmount));
    if (maxAmount !== undefined) filtered = filtered.filter((a) => Number(a.transactions?.amount || 0) <= Number(maxAmount));

    if (sortBy === 'largest_amount') {
      filtered.sort((a, b) => Number(b.transactions?.amount || 0) - Number(a.transactions?.amount || 0));
    }

    const start = (parsedPage - 1) * parsedLimit;
    const end = start + parsedLimit;
    const paginated = filtered.slice(start, end);

    res.json({
      alerts: paginated,
      count: filtered.length,
      totalRawCount: count || filtered.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(Math.ceil(filtered.length / parsedLimit), 1),
    });
  } catch (err) {
    await logFraudEvent(supabase, 'api_failure', 'Fetch alerts endpoint error', { error: err.message }, 'error');
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/fraud/alerts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .select('*, transactions(*)')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Alert not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

app.get('/api/fraud/alerts/:id/investigation', async (req, res) => {
  try {
    const { data: alert, error } = await supabase
      .from('fraud_alerts')
      .select('*, transactions(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !alert) return res.status(404).json({ error: 'Alert not found' });

    const { data: userTxns } = await supabase
      .from('transactions')
      .select('id, amount, channel, device_id, created_at, geo_location, merchant')
      .eq('user_id', alert.user_id)
      .order('created_at', { ascending: false })
      .limit(30);

    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const lastHour = (userTxns || []).filter((t) => t.created_at >= oneHourAgo).length;
    const lastDay = (userTxns || []).filter((t) => t.created_at >= oneDayAgo).length;

    const deviceId = alert.transactions?.device_id || null;
    let deviceStats = { device_id: deviceId, user_count: 0, transaction_count: 0, flagged: false };

    if (deviceId) {
      const { data: sameDeviceTxns } = await supabase
        .from('transactions')
        .select('user_id')
        .eq('device_id', deviceId)
        .limit(1000);

      const distinctUsers = new Set((sameDeviceTxns || []).map((x) => x.user_id));
      deviceStats = {
        device_id: deviceId,
        user_count: distinctUsers.size,
        transaction_count: (sameDeviceTxns || []).length,
        flagged: distinctUsers.size > 1,
      };
    }

    res.json({
      alert,
      transaction_details: {
        id: alert.transactions?.id,
        amount: alert.transactions?.amount,
        channel: alert.transactions?.channel,
        merchant: alert.transactions?.merchant,
        location: alert.transactions?.geo_location,
        device_id: alert.transactions?.device_id,
        created_at: alert.transactions?.created_at,
      },
      account_history: {
        transactions_last_hour: lastHour,
        transactions_last_day: lastDay,
        recent_transactions: (userTxns || []).slice(0, 10),
      },
      device_information: deviceStats,
      model_explanation: {
        fraud_type: alert.fraud_type,
        fraud_score: alert.fraud_score,
        severity: getSeverity(alert.fraud_score),
        risk_factors: alert.fraud_signals || [],
        recommendation: alert.metadata?.recommendation || 'REVIEW',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build investigation view', details: err.message });
  }
});

app.patch('/api/fraud/alerts/:id', async (req, res) => {
  try {
    const { status, analyst_notes, confirmed_fraud, analyst_id } = req.body;
    const normalizedStatus = status || 'closed';

    const updateData = {
      status: normalizedStatus,
      analyst_notes: analyst_notes || '',
      analyst_id: analyst_id ? toUuid(analyst_id) : null,
      confirmed_fraud: Boolean(confirmed_fraud),
      first_action_at: new Date().toISOString(),
      closed_at: normalizedStatus === 'closed' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('fraud_alerts')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update alert', details: error.message });

    await logFraudEvent(supabase, 'alert_resolved', 'Fraud alert resolved by analyst', {
      alert_id: req.params.id,
      status: normalizedStatus,
      confirmed_fraud: Boolean(confirmed_fraud),
      analyst_notes: analyst_notes || '',
      analyst_id: updateData.analyst_id,
    }, 'info');

    res.json(data);
  } catch (err) {
    await logFraudEvent(supabase, 'api_failure', 'Resolve alert endpoint error', { error: err.message }, 'error');
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

app.get('/api/fraud/activity', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { data, error } = await supabase
      .from('fraud_system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: 'Failed to fetch activity', details: error.message });
    res.json({ activity: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity', details: err.message });
  }
});

app.get('/api/fraud/patterns', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .select('fraud_signals, fraud_score, transactions(device_id, geo_location)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) return res.status(500).json({ error: 'Failed to fetch patterns', details: error.message });

    const signalCounts = {};
    const locationCounts = {};
    const deviceCounts = {};

    (data || []).forEach((row) => {
      (row.fraud_signals || []).forEach((signal) => {
        signalCounts[signal] = (signalCounts[signal] || 0) + 1;
      });

      const city = row.transactions?.geo_location?.city;
      if (city) locationCounts[city] = (locationCounts[city] || 0) + 1;

      const device = row.transactions?.device_id;
      if (device) deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const toSorted = (obj) => Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      topSignals: toSorted(signalCounts),
      topLocations: toSorted(locationCounts),
      topDevices: toSorted(deviceCounts),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pattern visualization', details: err.message });
  }
});

app.get('/api/fraud/model-health', async (_req, res) => {
  try {
    const [{ data: riskHealth }, { data: monitoring }] = await Promise.all([
      fetchWithTimeout(`${ML_SERVICE_URL}/health`, {}, 8000),
      fetchWithTimeout(`${ML_SERVICE_URL}/monitoring`, {}, 8000),
    ]);

    const { data: todayAlerts } = await supabase
      .from('fraud_alerts')
      .select('fraud_score, status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const avgFraudScoreToday = (todayAlerts || []).length
      ? (todayAlerts.reduce((sum, row) => sum + Number(row.fraud_score || 0), 0) / todayAlerts.length)
      : 0;

    const alertRate = (todayAlerts || []).length;

    res.json({
      modelName: 'Isolation Forest',
      status: riskHealth?.status === 'ok' ? 'Active' : 'Degraded',
      averageFraudScoreToday: Number(avgFraudScoreToday.toFixed(4)),
      alertRate,
      lastRetrain: riskHealth?.model_version || 'unknown',
      monitoring: monitoring?.current || null,
    });
  } catch (err) {
    res.status(503).json({
      status: 'Degraded',
      error: 'Fraud system temporarily unavailable. Retrying connection...',
      details: err.message,
    });
  }
});

app.get('/api/fraud/stats', async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ count: totalTransactions }, { count: pendingAlerts }, { count: resolvedToday }, { data: avgData }] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('fraud_alerts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('fraud_alerts').select('*', { count: 'exact', head: true }).eq('status', 'closed').gte('closed_at', todayStart.toISOString()),
      supabase.from('fraud_alerts').select('fraud_score').eq('status', 'pending'),
    ]);

    const avgFraudScore = (avgData || []).length
      ? (avgData.reduce((sum, row) => sum + Number(row.fraud_score || 0), 0) / avgData.length)
      : 0;

    const alertRate = totalTransactions ? Number((((pendingAlerts || 0) / totalTransactions) * 100).toFixed(2)) : 0;

    res.json({
      totalTransactions: totalTransactions || 0,
      flaggedCases: pendingAlerts || 0,
      resolvedToday: resolvedToday || 0,
      averageFraudScore: Number(avgFraudScore.toFixed(4)),
      alertRate,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// ─── PDF Explainability Report Generation ───
app.post('/api/risk/generate_xai_report', async (req, res) => {
  try {
    const {
      applicant_name,
      applicant_id,
      decision,
      approval_probability,
      pd,
      shap_values,
      reason_codes,
      counterfactual_suggestions,
      global_insights,
      model_metadata,
      financial_ratios,
      lime_weights,
      gemini_explanation,
    } = req.body;

    if (!applicant_name || !applicant_id || !decision) {
      return res.status(400).json({ error: 'Missing required fields: applicant_name, applicant_id, decision' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const filename = `XAI_Report_${applicant_id}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Explainable Loan Decision Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Applicant Section
    doc.fontSize(14).font('Helvetica-Bold').text('Applicant Information', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${applicant_name}`, { indent: 10 });
    doc.text(`ID: ${applicant_id}`, { indent: 10 });
    doc.moveDown(0.5);

    // Decision Section
    const decisionColor = decision.toLowerCase() === 'approved' ? '#22c55e' : '#ef4444';
    doc.fontSize(14).font('Helvetica-Bold').text('Loan Decision', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(decisionColor).text(decision.toUpperCase());
    doc.fillColor('black').moveDown(0.2);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Approval Probability: ${((approval_probability || 0) * 100).toFixed(2)}%`, { indent: 10 });
    doc.text(`Probability of Default (PD): ${((pd || 0) * 100).toFixed(2)}%`, { indent: 10 });
    doc.moveDown(0.5);

    // Reasons Section
    if (reason_codes && reason_codes.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Top Reasons', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      reason_codes.slice(0, 5).forEach((reason, idx) => {
        doc.text(`${idx + 1}. ${reason}`, { indent: 10 });
      });
      doc.moveDown(0.5);
    }

    // Financial Ratios
    if (financial_ratios) {
      doc.fontSize(14).font('Helvetica-Bold').text('Financial Metrics', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      if (financial_ratios.foir) doc.text(`Ratio of EMI to Monthly Income: ${financial_ratios.foir.toFixed(2)}`, { indent: 10 });
      if (financial_ratios.dti_ratio) doc.text(`Debt-to-Income Ratio: ${financial_ratios.dti_ratio.toFixed(2)}`, { indent: 10 });
      if (financial_ratios.loan_to_income) doc.text(`Loan-to-Income Ratio: ${financial_ratios.loan_to_income.toFixed(4)}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    // SHAP Explanation
    if (shap_values && Object.keys(shap_values).length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Feature Contributions (SHAP)', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text('Top factors influencing this decision:', { italic: true });
      Object.entries(shap_values)
        .slice(0, 6)
        .forEach(([feature, value]) => {
          const direction = value > 0 ? '↑' : '↓';
          const impact = value > 0 ? 'increases' : 'decreases';
          doc.text(`${direction} ${feature}: ${impact} approval probability by ${Math.abs(value).toFixed(4)}`, { indent: 10 });
        });
      doc.moveDown(0.5);
    }

    // Counterfactual Suggestions
    if (counterfactual_suggestions && Object.keys(counterfactual_suggestions).length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Counterfactual Suggestions', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      doc.text('To improve approval probability, consider the following changes:', { italic: true });
      doc.moveDown(0.2);
      Object.entries(counterfactual_suggestions).forEach(([field, change]) => {
        doc.fontSize(10).text(`• ${field}: ${change}`, { indent: 10 });
      });
      doc.moveDown(0.5);
    }

    // Model Information
    if (model_metadata) {
      doc.fontSize(14).font('Helvetica-Bold').text('Model Card', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Model Version: ${model_metadata.model_version || 'N/A'}`, { indent: 10 });
      doc.text(`Training Date: ${model_metadata.train_date || 'N/A'}`, { indent: 10 });
      doc.text(`AUC-ROC Score: ${(model_metadata.auc || 0).toFixed(4)}`, { indent: 10 });
      doc.text(`Number of Features: ${model_metadata.n_features || 'N/A'}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    // Gemini Explanation
    if (gemini_explanation) {
      doc.fontSize(14).font('Helvetica-Bold').text('Decision Summary', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(gemini_explanation, { align: 'left', width: 500 });
      doc.moveDown(0.5);
    }

    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('#808080');
    doc.text('This report is generated by the FinSecure AI Explainable Loan System.', { align: 'center' });
    doc.text('For questions, contact: support@finsecure.ai', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FinSecure AI Backend running on http://localhost:${PORT}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Supabase key loaded: ${SUPABASE_KEY ? 'yes' : 'no'}`);
});
