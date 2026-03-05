/**
 * Google Cloud Natural Language API Utility
 * Uses backend proxy (service account) with fallback to direct API key
 */

const getApiKey = () => import.meta.env.VITE_GOOGLE_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

const NL_API_BASE = 'https://language.googleapis.com/v1';

/**
 * Helper: call NL API via backend proxy first, fall back to direct API key.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callNlApi(featureType: string, text: string, extraBody?: Record<string, unknown>): Promise<any> {
  // Try backend proxy first
  try {
    const proxyRes = await fetch(`${BACKEND_URL}/api/nlp/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, features: featureType }),
    });
    if (proxyRes.ok) {
      return await proxyRes.json();
    }
  } catch {
    // Backend not available, fall back
  }

  // Fallback: direct API key
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set and backend proxy unavailable');

  const body: Record<string, unknown> = {
    document: { type: 'PLAIN_TEXT', content: text },
    ...extraBody,
  };

  const res = await fetch(`${NL_API_BASE}/documents:${featureType}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NL API error ${res.status}: ${errText}`);
  }

  return await res.json();
}

export interface SentimentResult {
  score: number;      // -1 (negative) to 1 (positive)
  magnitude: number;  // strength of sentiment
  label: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
}

export interface EntityResult {
  name: string;
  type: string;
  salience: number;
  sentiment?: { score: number; magnitude: number };
}

export interface ClassificationResult {
  categories: Array<{ name: string; confidence: number }>;
}

/**
 * Analyze sentiment of text.
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const data = await callNlApi('analyzeSentiment', text, { encodingType: 'UTF8' });
  const sentiment = data.documentSentiment || { score: 0, magnitude: 0 };

  let label: SentimentResult['label'] = 'Neutral';
  if (sentiment.score > 0.25) label = 'Positive';
  else if (sentiment.score < -0.25) label = 'Negative';
  else if (sentiment.magnitude > 0.5) label = 'Mixed';

  return {
    score: sentiment.score,
    magnitude: sentiment.magnitude,
    label,
  };
}

/**
 * Extract entities from text.
 */
export async function extractEntities(text: string): Promise<EntityResult[]> {
  const data = await callNlApi('analyzeEntities', text, { encodingType: 'UTF8' });
  return (data.entities || []).map((e: Record<string, unknown>) => ({
    name: e.name as string,
    type: e.type as string,
    salience: e.salience as number,
    sentiment: e.sentiment as { score: number; magnitude: number } | undefined,
  }));
}

/**
 * Classify content into categories.
 */
export async function classifyContent(text: string): Promise<ClassificationResult> {
  // NL API classifyText requires at least 20 tokens
  if (text.split(/\s+/).length < 20) {
    return { categories: [] };
  }

  const data = await callNlApi('classifyText', text);
  return {
    categories: (data.categories || []).map((c: { name: string; confidence: number }) => ({
      name: c.name,
      confidence: c.confidence,
    })),
  };
}

/**
 * Analyze entity sentiment in text.
 */
export async function analyzeEntitySentiment(text: string): Promise<EntityResult[]> {
  const data = await callNlApi('analyzeEntitySentiment', text, { encodingType: 'UTF8' });
  return (data.entities || []).map((e: Record<string, unknown>) => ({
    name: e.name as string,
    type: e.type as string,
    salience: e.salience as number,
    sentiment: e.sentiment as { score: number; magnitude: number } | undefined,
  }));
}
