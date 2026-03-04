/**
 * Google Cloud Natural Language API Utility
 * Provides sentiment analysis, entity extraction, and content classification
 */

const getApiKey = () => import.meta.env.VITE_GOOGLE_API_KEY || '';

const NL_API_BASE = 'https://language.googleapis.com/v1';

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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set');

  const res = await fetch(`${NL_API_BASE}/documents:analyzeSentiment?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: { type: 'PLAIN_TEXT', content: text },
      encodingType: 'UTF8',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NL API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set');

  const res = await fetch(`${NL_API_BASE}/documents:analyzeEntities?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: { type: 'PLAIN_TEXT', content: text },
      encodingType: 'UTF8',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NL API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set');

  // NL API classifyText requires at least 20 tokens
  if (text.split(/\s+/).length < 20) {
    return { categories: [] };
  }

  const res = await fetch(`${NL_API_BASE}/documents:classifyText?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: { type: 'PLAIN_TEXT', content: text },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NL API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set');

  const res = await fetch(`${NL_API_BASE}/documents:analyzeEntitySentiment?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: { type: 'PLAIN_TEXT', content: text },
      encodingType: 'UTF8',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NL API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.entities || []).map((e: Record<string, unknown>) => ({
    name: e.name as string,
    type: e.type as string,
    salience: e.salience as number,
    sentiment: e.sentiment as { score: number; magnitude: number } | undefined,
  }));
}
