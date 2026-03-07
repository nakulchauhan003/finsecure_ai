import type { ScoringResponse } from '../../services/riskAssessmentApi';
import type { AIRiskAnalysis } from '../../utils/ai';
import type { RiskAppetite, WizardStage, EmploymentType, BusinessType } from '../../Hooks/useRiskAssessment';

export type { RiskAppetite, WizardStage, EmploymentType, BusinessType };

export interface BaseFormData {
  name: string;
  age: string;
  creditScore: number;
  loanAmount: string;
  previousDefaults: string;
  accountAge: string;
}

export interface SalariedFormData extends BaseFormData {
  employmentType: 'salaried';
  monthlySalary: string;
  housingType: 'rent' | 'owned';
  officeRent: string;
  otherFixedExpenses: string;
  totalExpenditure: string;
  loanEnquiries: string;
  applicationDuration: string;
  loanPurpose: 'personal' | 'education' | 'home' | 'vehicle' | 'business' | 'medical';
}

export interface SelfEmployedFormData extends BaseFormData {
  employmentType: 'self_employed';
  businessType: BusinessType;
  grossRevenue: string;
  expectedMargin: string;
  businessRent: string;
  utilitiesSalaries: string;
  businessAge: string;
  gstRegistered: 'yes' | 'no';
  loanEnquiries: string;
  applicationPeriod: string;
  loanPurpose: 'personal' | 'education' | 'home' | 'vehicle' | 'business' | 'medical';
}

export type FormData = SalariedFormData | SelfEmployedFormData;

export interface RiskAssessmentProps {
  stage: WizardStage;
  scoring: ScoringResponse | null;
  aiInsight: AIRiskAnalysis | null;
  riskAppetite: RiskAppetite;
  isAiLoading: boolean;
  error: string | null;
  processingStep: number;
}
