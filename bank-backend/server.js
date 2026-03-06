import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───
const PORT = 3002;
const PROJECT_ID = 'shirokuma-487907';
const GEMINI_MODEL = 'gemini-2.5-flash';
const CREDENTIALS_PATH = resolve(__dirname, '..', 'bank-frontend', 'credentials.json');

// Load service account credentials
let credentials;
try {
  credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  console.log(`✅ Loaded service account: ${credentials.client_email}`);
} catch (err) {
  console.error('❌ Could not load credentials.json:', err.message);
  process.exit(1);
}

// Google Auth client (service account → OAuth2 access token)
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

// ─── Express Server ───
const app = express();
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '20mb' }));

// Rate limiting: 60 requests per minute per IP
const apiLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ 
      status: 'ok', 
      serviceAccount: credentials.client_email, 
      project: PROJECT_ID,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── Gemini API Proxy ───
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, systemInstruction, useSearch, responseType } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const token = await getAccessToken();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    if (systemInstruction) {
      payload.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    if (useSearch) {
      payload.tools = [{ google_search: {} }];
    }

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Gemini API error:', JSON.stringify(data, null, 2));
      return res.status(apiRes.status).json({ error: data.error?.message || 'Gemini API error', details: data });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini', raw: data });
    }

    // If caller wants JSON, try to parse
    if (responseType === 'json') {
      try {
        const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ text, parsed });
      } catch {
        return res.json({ text, parsed: null, parseError: 'Could not parse JSON from response' });
      }
    }

    res.json({ text });
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Cloud Vision API Proxy ───
app.post('/api/vision/ocr', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) is required' });

    const token = await getAccessToken();
    const url = 'https://vision.googleapis.com/v1/images:annotate';

    const payload = {
      requests: [{
        image: { content: image },
        features: [
          { type: 'TEXT_DETECTION', maxResults: 1 },
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'IMAGE_PROPERTIES' }
        ]
      }]
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error?.message || 'Vision API error', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Vision proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Cloud Natural Language API Proxy ───
app.post('/api/nlp/analyze', async (req, res) => {
  try {
    const { text, features } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const token = await getAccessToken();
    const featureType = features || 'analyzeSentiment';
    const url = `https://language.googleapis.com/v1/documents:${featureType}`;

    const payload = {
      document: { type: 'PLAIN_TEXT', content: text },
      encodingType: 'UTF8'
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error?.message || 'NLP API error', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('NLP proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ML Risk Assessment API Proxy ───
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Score a loan application (proxies to Python ML service)
app.post('/api/risk/score', async (req, res) => {
  try {
    const apiRes = await fetch(`${ML_SERVICE_URL}/score_application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.detail || 'ML scoring error', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('ML scoring proxy error:', err);
    res.status(500).json({ error: 'ML service unavailable. Is the Python service running on port 8000?' });
  }
});

// Fraud scoring endpoint
app.post('/api/risk/fraud', async (req, res) => {
  try {
    const apiRes = await fetch(`${ML_SERVICE_URL}/fraud_score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.detail || 'Fraud scoring error', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Fraud scoring proxy error:', err);
    res.status(500).json({ error: 'ML service unavailable' });
  }
});

// Model metadata
app.get('/api/risk/model-metadata', async (_req, res) => {
  try {
    const apiRes = await fetch(`${ML_SERVICE_URL}/model_metadata`);
    const data = await apiRes.json();
    res.json(data);
  } catch (err) {
    console.error('Model metadata error:', err);
    res.status(500).json({ error: 'ML service unavailable' });
  }
});

// ML service health check
app.get('/api/risk/health', async (_req, res) => {
  try {
    const apiRes = await fetch(`${ML_SERVICE_URL}/health`);
    const data = await apiRes.json();
    res.json({ ...data, proxy: true });
  } catch (err) {
    res.status(503).json({ status: 'ml_service_down', error: err.message });
  }
});

// ML model monitoring (drift detection, PD stats)
app.get('/api/risk/monitoring', async (_req, res) => {
  try {
    const apiRes = await fetch(`${ML_SERVICE_URL}/monitoring`);
    const data = await apiRes.json();
    res.json(data);
  } catch (err) {
    console.error('Monitoring endpoint error:', err);
    res.status(500).json({ error: 'ML service unavailable' });
  }
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`\n🚀 FinSecure AI Backend running on http://localhost:${PORT}`);
  console.log(`   Service Account: ${credentials.client_email}`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`\n   Endpoints:`);
  console.log(`   GET  /api/health            — Check connection`);
  console.log(`   POST /api/gemini            — Gemini AI proxy`);
  console.log(`   POST /api/vision/ocr        — Cloud Vision OCR`);
  console.log(`   POST /api/nlp/analyze       — NLP analysis`);
  console.log(`   POST /api/risk/score        — ML risk scoring`);
  console.log(`   POST /api/risk/fraud        — ML fraud detection`);
  console.log(`   GET  /api/risk/model-metadata — Model info`);
  console.log(`   GET  /api/risk/health       — ML service health`);
  console.log(`   GET  /api/risk/monitoring   — Model drift monitoring`);
  console.log('');
});
