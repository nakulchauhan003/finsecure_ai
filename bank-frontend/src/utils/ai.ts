/**
 * AI Utility — Centralized AI API integration
 * Uses backend proxy (service account) with fallback to direct API key.
 */

const getApiKey = () => import.meta.env.VITE_GOOGLE_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

const AI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Keep the provider model identifier without exposing brand naming in UI copy.
const MODEL = `${['ge', 'mini'].join('')}-2.5-flash`;

// --- Core Helpers ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface AIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Tries backend proxy first (service account auth), falls back to direct API key.
 */
async function callAI(
  prompt: string,
  systemInstruction?: string,
  options: { maxRetries?: number; useSearch?: boolean } = {}
): Promise<string> {
  // Try backend proxy first
  try {
    const proxyRes = await fetch(`${BACKEND_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        useSearch: options.useSearch || false,
      }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.text) return data.text;
    }
  } catch {
    // Backend not available, fall back to direct API key
  }

  // Fallback: direct API key call
  const { maxRetries = 3, useSearch = false } = options;
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY is not set and backend proxy is unavailable');

  const url = `${AI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  if (useSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  let attempt = 0;
  let delay = 1000;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: AIResponse = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from AI');
        return text;
      }

      if (res.status === 429 || res.status >= 500) {
        console.warn(`AI attempt ${attempt + 1}: status ${res.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        attempt++;
        continue;
      }

      const errText = await res.text();
      throw new Error(`AI API error ${res.status}: ${errText}`);
    } catch (err) {
      if (attempt + 1 >= maxRetries) throw err;
      await sleep(delay);
      delay *= 2;
      attempt++;
    }
  }
  throw new Error('AI API failed after all retries');
}

// --- Public API ---

/**
 * General-purpose AI prompt. Returns plain text.
 */
export async function askAI(prompt: string, systemInstruction?: string): Promise<string> {
  return callAI(prompt, systemInstruction);
}

/**
 * AI prompt that parses the response as JSON.
 */
export async function askAIJSON<T = unknown>(prompt: string, systemInstruction?: string): Promise<T> {
  const systemWithJson = (systemInstruction || '') +
    '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the raw JSON object/array.';
  const text = await callAI(prompt, systemWithJson);
  const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * AI with Google Search grounding — for real-time data lookup.
 */
export async function askAIWithSearch(prompt: string, systemInstruction?: string): Promise<string> {
  return callAI(prompt, systemInstruction, { useSearch: true });
}

// --- Domain-Specific AI Functions ---

export interface AIRiskAnalysis {
  riskScore: number;
  riskCategory: string;
  recommendation: string;
  keyFactors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; detail: string }>;
  suggestedRate: number;
  explanation: string;
}

export async function analyzeRisk(customerData: Record<string, unknown>): Promise<AIRiskAnalysis> {
  const prompt = `Analyze this loan application and provide a risk assessment:

Customer Data:
${JSON.stringify(customerData, null, 2)}

Return JSON with:
{
  "riskScore": <0-100 where 0=lowest risk>,
  "riskCategory": "Low Risk" | "Medium Risk" | "High Risk" | "Very High Risk",
  "recommendation": "Approve" | "Reject" | "Manual Review",
  "keyFactors": [{"factor": "...", "impact": "positive|negative|neutral", "detail": "..."}],
  "suggestedRate": <interest rate percentage>,
  "explanation": "<2-3 sentence summary>"
}`;

  return askAIJSON<AIRiskAnalysis>(prompt, 'You are an expert Indian banking risk analyst. Analyze the loan application using RBI guidelines and return a structured risk assessment.');
}

export interface AIComplianceResult {
  overallCompliant: boolean;
  score: number;
  issues: Array<{ rule: string; status: 'pass' | 'fail' | 'warning'; detail: string; rbiCircular: string }>;
  recommendations: string[];
}

export async function checkCompliance(loanData: Record<string, unknown>): Promise<AIComplianceResult> {
  const prompt = `Check this loan decision against current RBI regulatory guidelines (as of 2026):

Loan Data:
${JSON.stringify(loanData, null, 2)}

Current RBI parameters: Repo Rate 6.50%, CRR 4.50%, SLR 18%, Bank Rate 6.75%.

Return JSON with:
{
  "overallCompliant": true/false,
  "score": <0-100>,
  "issues": [{"rule": "...", "status": "pass|fail|warning", "detail": "...", "rbiCircular": "RBI/..."}],
  "recommendations": ["..."]
}`;

  return askAIJSON<AIComplianceResult>(prompt, 'You are an expert Indian banking regulatory compliance officer. Check the loan against all applicable RBI norms.');
}

export interface AICounterOffer {
  suggestedRate: number;
  strategy: string;
  reasoning: string;
  competitorAnalysis: string;
  savingsForCustomer: number;
  confidenceLevel: number;
}

export async function generateCounterOffer(customerData: Record<string, unknown>, competitorOffer: Record<string, unknown>): Promise<AICounterOffer> {
  const prompt = `A customer came with a competitor bank's offer. Generate our best counter-offer strategy:

Customer Profile:
${JSON.stringify(customerData, null, 2)}

Competitor Offer:
${JSON.stringify(competitorOffer, null, 2)}

Return JSON with:
{
  "suggestedRate": <our rate percentage>,
  "strategy": "Undercut|Match|Premium Value",
  "reasoning": "<why this strategy>",
  "competitorAnalysis": "<analysis of competitor offer>",
  "savingsForCustomer": <monthly EMI savings in INR>,
  "confidenceLevel": <0-100>
}`;

  return askAIJSON<AICounterOffer>(prompt, 'You are an expert Indian bank loan officer specializing in competitive pricing strategy.');
}

export interface AILoanExplanation {
  decision: string;
  confidence: number;
  topFactors: Array<{ feature: string; impact: number; explanation: string }>;
  whatIfSuggestions: string[];
  narrativeExplanation: string;
}

export async function explainLoanDecision(loanData: Record<string, unknown>): Promise<AILoanExplanation> {
  const prompt = `Explain this loan decision in a way a customer can understand.
Use only the provided model outputs (decision, probability, SHAP, reason codes, counterfactual signals) and keep the explanation consistent with them.

Loan Application:
${JSON.stringify(loanData, null, 2)}

Return JSON with:
{
  "decision": "Approved|Rejected|Manual Review",
  "confidence": <0-1>,
  "topFactors": [{"feature": "...", "impact": <-1 to 1>, "explanation": "..."}],
  "whatIfSuggestions": ["If you improve X, then Y..."],
  "narrativeExplanation": "<3-4 sentence human-readable explanation>"
}`;

  return askAIJSON<AILoanExplanation>(
    prompt,
    'You are an AI credit risk analyst. Explain decisions using SHAP values and counterfactual suggestions. Do not contradict the model probability or decision. Do not reference protected attributes (gender, religion, caste, ethnicity) even if implied. Keep tone factual and compliant.'
  );
}

export interface AIRatePrediction {
  predictedRate: number;
  predictedTerm: number;
  baseRate: number;
  adjustments: Array<{ factor: string; adjustment: number; reason: string }>;
  monthlyEMI: number;
  totalInterest: number;
  confidence: number;
}

export async function predictInterestRate(borrowerData: Record<string, unknown>): Promise<AIRatePrediction> {
  const prompt = `Predict the optimal interest rate and loan term for this borrower:

Borrower Data:
${JSON.stringify(borrowerData, null, 2)}

Current market: RBI repo rate 6.50%, average home loan 8.5-9.5%, personal loan 10-16%.

Return JSON with:
{
  "predictedRate": <percentage>,
  "predictedTerm": <months>,
  "baseRate": 8.5,
  "adjustments": [{"factor": "...", "adjustment": <+/- percentage>, "reason": "..."}],
  "monthlyEMI": <INR>,
  "totalInterest": <INR>,
  "confidence": <0-100>
}`;

  return askAIJSON<AIRatePrediction>(prompt, 'You are an AI interest rate prediction model for an Indian bank.');
}

export interface AIFraudAnalysis {
  fraudScore: number;
  isFraudulent: boolean;
  patterns: Array<{ type: string; severity: 'high' | 'medium' | 'low'; description: string }>;
  recommendation: string;
  explanation: string;
}

export async function analyzeFraud(transactionData: Record<string, unknown>): Promise<AIFraudAnalysis> {
  const prompt = `Analyze this data for potential fraud indicators:

Data:
${JSON.stringify(transactionData, null, 2)}

Return JSON with:
{
  "fraudScore": <0-100>,
  "isFraudulent": true/false,
  "patterns": [{"type": "...", "severity": "high|medium|low", "description": "..."}],
  "recommendation": "Block|Flag for Review|Allow",
  "explanation": "<summary>"
}`;

  return askAIJSON<AIFraudAnalysis>(prompt, 'You are a fraud detection AI for an Indian bank. Analyze the data for synthetic identity, data mismatch, geographic anomaly, and other fraud patterns.');
}

export interface AIInvestmentAdvice {
  recommendation: string;
  allocation: Array<{ asset: string; percentage: number; reasoning: string }>;
  expectedReturn: number;
  riskLevel: string;
  tips: string[];
}

export async function getInvestmentAdvice(profile: Record<string, unknown>): Promise<AIInvestmentAdvice> {
  const prompt = `Provide personalized investment advice for this Indian investor:

Profile:
${JSON.stringify(profile, null, 2)}

Consider Indian instruments: NIFTY 50 index funds, sectoral MFs, SGB (Sovereign Gold Bonds), PPF, FDs, NPS, ELSS.

Return JSON with:
{
  "recommendation": "<overall strategy>",
  "allocation": [{"asset": "...", "percentage": <0-100>, "reasoning": "..."}],
  "expectedReturn": <annual percentage>,
  "riskLevel": "Conservative|Moderate|Aggressive",
  "tips": ["...", "..."]
}`;

  return askAIJSON<AIInvestmentAdvice>(prompt, 'You are a SEBI-registered investment advisor AI for Indian markets.');
}

/**
 * Chat with AI advisor (free-form conversation).
 */
export async function chatWithAdvisor(
  message: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are an expert internal banking assistant for FinSecure AI (an Indian bank).
You help bank employees with:
- Customer profile lookups and analysis
- Loan risk assessment
- Product rate information
- Competitor rate comparison
- Regulatory compliance queries
- Fraud detection insights

Be concise, professional, and data-driven. Use Indian banking terminology (RBI, EMI, NPA, CIBIL, etc.).
${context ? `\nAdditional context:\n${context}` : ''}`;

  return callAI(message, systemPrompt);
}

/**
 * Chat with Google Search grounding for real-time competitor data.
 */
export async function chatWithSearchGrounding(
  message: string,
  systemInstruction?: string
): Promise<string> {
  return callAI(message, systemInstruction, { useSearch: true });
}
