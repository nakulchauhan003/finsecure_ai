import { useState, useCallback } from 'react';
import {
  scoreApplication,
  getModelMetadata,
  type ScoringRequest,
  type ScoringResponse,
  type ModelMetadataFull,
} from '../services/riskAssessmentApi';
import { analyzeRisk, type AIRiskAnalysis } from '../utils/gemini';

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

      // Fire Gemini AI analysis in background (non-blocking)
      setIsAiLoading(true);
      analyzeRisk({
        ...data,
        localRiskScore: result.risk_score,
        localCategory: result.risk_category,
      }).then(aiResult => {
        setAiInsight(aiResult);
        setIsAiLoading(false);
      }).catch(err => {
        console.error('Gemini AI analysis failed:', err);
        setIsAiLoading(false);
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
