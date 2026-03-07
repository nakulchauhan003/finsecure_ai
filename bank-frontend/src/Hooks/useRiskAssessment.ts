import { useState, useCallback } from 'react';
import {
  scoreApplication,
  getModelMetadata,
  type ScoringRequest,
  type ScoringResponse,
  type ModelMetadataFull,
} from '../services/riskAssessmentApi';
import { analyzeRisk, type AIRiskAnalysis } from '../utils/ai';
import { supabase } from '../lib/supabase';

export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';
export type WizardStage = 'employment' | 'input' | 'processing' | 'results';
export type EmploymentType = 'salaried' | 'self_employed';
export type BusinessType = 'trading' | 'manufacturing' | 'service';

interface UseRiskAssessmentReturn {
  // State
  stage: WizardStage;
  scoring: ScoringResponse | null;
  modelMeta: ModelMetadataFull | null;
  aiInsight: AIRiskAnalysis | null;
  riskAppetite: RiskAppetite;
  isLoading: boolean;
  isAiLoading: boolean;
  error: string | null;
  processingStep: number;

  // Actions
  submitAssessment: (data: ScoringRequest) => Promise<void>;
  fetchModelMetadata: () => Promise<void>;
  setRiskAppetite: (appetite: RiskAppetite) => void;
  setStage: (stage: WizardStage) => void;
  resetAssessment: () => void;
}

/** Persist a completed assessment to Supabase (fire-and-forget). */
async function persistAssessment(
  request: ScoringRequest,
  result: ScoringResponse,
  aiInsight: AIRiskAnalysis | null,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('risk_assessments').insert({
      applicant_name: null,
      employment_type: request.employment_type,
      age: request.age,
      credit_score: request.credit_score,
      monthly_income: request.monthly_income,
      loan_amount: request.loan_amount,
      previous_defaults: request.previous_defaults,
      account_age: request.account_age,
      loan_enquiries: request.loan_enquiries,
      housing_type: request.housing_type,
      total_expenditure: request.total_expenditure,
      other_fixed_expenses: request.other_fixed_expenses ?? 0,
      business_type: request.business_type ?? null,
      gross_revenue: request.gross_revenue ?? 0,
      expected_margin: request.expected_margin ?? 0,
      business_rent: request.business_rent ?? 0,
      utilities_salaries: request.utilities_salaries ?? 0,
      business_age: request.business_age ?? 0,
      gst_registered: request.gst_registered === 1,
      pd_score: result.pd,
      risk_score: result.risk_score,
      risk_category: result.risk_category,
      approved: result.approved,
      recommendation: result.recommendation,
      interest_rate: result.interest_rate,
      model_version: result.model_metadata.model_version,
      shap_values: result.shap_values,
      fraud_probability: result.fraud.probability,
      fraud_is_anomaly: result.fraud.is_anomaly,
      fraud_flags: result.fraud.flags,
      dti_ratio: result.financial_ratios.dti_ratio,
      foir: result.financial_ratios.foir,
      loan_to_income: result.financial_ratios.loan_to_income,
      dscr: result.financial_ratios.dscr,
      risk_appetite: request.risk_appetite,
      ai_analysis: aiInsight ?? null,
      assessed_by: user?.id ?? null,
    });
  } catch (err) {
    // Non-blocking — log but don't fail the assessment flow
    console.warn('Supabase persistence failed (non-blocking):', err);
  }
}

export function useRiskAssessment(): UseRiskAssessmentReturn {
  const [stage, setStage] = useState<WizardStage>('employment');
  const [scoring, setScoring] = useState<ScoringResponse | null>(null);
  const [modelMeta, setModelMeta] = useState<ModelMetadataFull | null>(null);
  const [aiInsight, setAiInsight] = useState<AIRiskAnalysis | null>(null);
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('moderate');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  const submitAssessment = useCallback(async (data: ScoringRequest) => {
    setIsLoading(true);
    setError(null);
    setStage('processing');
    setProcessingStep(0);

    // Simulate pipeline steps for UX
    const stepInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev >= 6) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    try {
      // Real ML scoring call
      const result = await scoreApplication({ ...data, risk_appetite: riskAppetite });
      clearInterval(stepInterval);
      setProcessingStep(7);
      setScoring(result);
      setStage('results');

      // Fire AI analysis in background (non-blocking)
      setIsAiLoading(true);
      analyzeRisk({
        ...data,
        localRiskScore: result.risk_score,
        localCategory: result.risk_category,
      }).then(aiResult => {
        setAiInsight(aiResult);
        setIsAiLoading(false);
        // Persist full assessment (with AI insight) to Supabase
        persistAssessment(data, result, aiResult);
      }).catch(err => {
        console.error('AI analysis failed:', err);
        setIsAiLoading(false);
        // Still persist even if AI fails
        persistAssessment(data, result, null);
      });

    } catch (err) {
      clearInterval(stepInterval);
      const message = err instanceof Error ? err.message : 'Scoring failed';
      setError(message);
      setStage('input');
    } finally {
      setIsLoading(false);
    }
  }, [riskAppetite]);

  const fetchModelMetadata = useCallback(async () => {
    try {
      const meta = await getModelMetadata();
      setModelMeta(meta);
    } catch (err) {
      console.error('Failed to fetch model metadata:', err);
    }
  }, []);

  const resetAssessment = useCallback(() => {
    setStage('employment');
    setScoring(null);
    setAiInsight(null);
    setError(null);
    setProcessingStep(0);
  }, []);

  return {
    stage,
    scoring,
    modelMeta,
    aiInsight,
    riskAppetite,
    isLoading,
    isAiLoading,
    error,
    processingStep,
    submitAssessment,
    fetchModelMetadata,
    setRiskAppetite,
    setStage,
    resetAssessment,
  };
}
