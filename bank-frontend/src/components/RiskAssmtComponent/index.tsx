import React, { useState, useCallback, useEffect } from 'react';
import { Shield, Settings, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useRiskAssessment } from '../../Hooks/useRiskAssessment';
import type { ScoringRequest } from '../../services/riskAssessmentApi';
import type {
  FormData, SalariedFormData, SelfEmployedFormData,
  EmploymentType, BusinessType, RiskAppetite,
} from './types';

import EmploymentStep from './components/EmploymentStep';
import BusinessTypeStep from './components/BusinessTypeStep';
import SalariedForm from './components/SalariedForm';
import SelfEmployedForm from './components/SelfEmployedForm';
import ProcessingStep from './components/ProcessingStep';
import ResultsView from './components/ResultsView';

// --- Zod Schemas ---
const baseSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  age: z.string().refine(v => { const n = Number(v); return n >= 18 && n <= 80; }, 'Age must be 18–80'),
  creditScore: z.number().min(300, 'Min 300').max(900, 'Max 900'),
  loanAmount: z.string().refine(v => Number(v) >= 10000, 'Min ₹10,000'),
  previousDefaults: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
  accountAge: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
});

const salariedSchema = baseSchema.extend({
  monthlySalary: z.string().refine(v => Number(v) >= 1000, 'Min ₹1,000'),
  housingType: z.enum(['rent', 'owned']),
  officeRent: z.string(),
  otherFixedExpenses: z.string(),
  totalExpenditure: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
  loanEnquiries: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
  applicationDuration: z.string().refine(v => Number(v) >= 1, 'Min 1 month'),
});

const selfEmployedSchema = baseSchema.extend({
  grossRevenue: z.string().refine(v => Number(v) >= 1000, 'Min ₹1,000'),
  expectedMargin: z.string().refine(v => { const n = Number(v); return n >= 1 && n <= 100; }, 'Must be 1–100%'),
  businessRent: z.string(),
  utilitiesSalaries: z.string(),
  businessAge: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
  gstRegistered: z.enum(['yes', 'no']),
  loanEnquiries: z.string().refine(v => Number(v) >= 0, 'Cannot be negative'),
  applicationPeriod: z.string().refine(v => Number(v) >= 1, 'Min 1 month'),
});

// --- Initial Form States ---
const INITIAL_SALARIED: SalariedFormData = {
  employmentType: 'salaried',
  name: '', age: '', creditScore: 750, loanAmount: '', previousDefaults: '0', accountAge: '24',
  monthlySalary: '', housingType: 'rent', officeRent: '0', otherFixedExpenses: '0',
  totalExpenditure: '', loanEnquiries: '1', applicationDuration: '36',
};

const INITIAL_SELF_EMPLOYED: SelfEmployedFormData = {
  employmentType: 'self_employed',
  businessType: 'trading',
  name: '', age: '', creditScore: 750, loanAmount: '', previousDefaults: '0', accountAge: '24',
  grossRevenue: '', expectedMargin: '20', businessRent: '0', utilitiesSalaries: '0',
  businessAge: '3', gstRegistered: 'yes', loanEnquiries: '1', applicationPeriod: '36',
};

// --- Helpers ---

function buildScoringRequest(data: FormData): ScoringRequest {
  const base = {
    age: Number(data.age),
    credit_score: data.creditScore,
    loan_amount: Number(data.loanAmount),
    previous_defaults: Number(data.previousDefaults),
    account_age: Number(data.accountAge),
    risk_appetite: 'moderate' as const, // overridden by hook
  };

  if (data.employmentType === 'salaried') {
    const s = data as SalariedFormData;
    return {
      ...base,
      employment_type: 'salaried',
      monthly_income: Number(s.monthlySalary),
      housing_type: s.housingType,
      total_expenditure: Number(s.totalExpenditure),
      other_fixed_expenses: Number(s.officeRent) + Number(s.otherFixedExpenses),
      loan_enquiries: Number(s.loanEnquiries),
    };
  }

  const se = data as SelfEmployedFormData;
  const margin = Number(se.expectedMargin) / 100;
  const monthlyNet = (Number(se.grossRevenue) * margin) / 12;

  return {
    ...base,
    employment_type: 'self_employed',
    monthly_income: monthlyNet,
    housing_type: 'owned',
    total_expenditure: Number(se.businessRent) + Number(se.utilitiesSalaries),
    loan_enquiries: Number(se.loanEnquiries),
    gross_revenue: Number(se.grossRevenue),
    expected_margin: margin,
    business_rent: Number(se.businessRent),
    utilities_salaries: Number(se.utilitiesSalaries),
    business_age: Number(se.businessAge),
    gst_registered: se.gstRegistered === 'yes' ? 1 : 0,
    business_type: se.businessType,
  };
}

// --- Main Component ---

export default function RiskAssessmentComponent() {
  const {
    stage, scoring, aiInsight, riskAppetite, isAiLoading,
    error, processingStep,
    submitAssessment, setRiskAppetite, setStage, resetAssessment,
  } = useRiskAssessment();

  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('trading');
  const [salariedData, setSalariedData] = useState<SalariedFormData>(INITIAL_SALARIED);
  const [selfEmployedData, setSelfEmployedData] = useState<SelfEmployedFormData>(INITIAL_SELF_EMPLOYED);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formData: FormData | null = employmentType === 'salaried' ? salariedData
    : employmentType === 'self_employed' ? selfEmployedData
    : null;

  // Handle employment type selection
  const handleEmploymentSelect = useCallback((type: EmploymentType) => {
    setEmploymentType(type);
    setFormErrors({});
    if (type === 'self_employed') {
      setStage('employment'); // go to business type step
    } else {
      setStage('input');
    }
  }, [setStage]);

  // Handle business type selection
  const handleBusinessTypeSelect = useCallback((bt: BusinessType) => {
    setBusinessType(bt);
    setSelfEmployedData(prev => ({ ...prev, businessType: bt }));
    setStage('input');
  }, [setStage]);

  // Generic form change handler
  const handleSalariedChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSalariedData(prev => ({
      ...prev,
      [name]: type === 'range' || name === 'creditScore' ? Number(value) : value,
    }));
    setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  }, []);

  const handleSelfEmployedChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSelfEmployedData(prev => ({
      ...prev,
      [name]: type === 'range' || name === 'creditScore' ? Number(value) : value,
    }));
    setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  }, []);

  // Validate + submit
  const handleSubmit = useCallback(() => {
    if (!formData) return;

    const schema = formData.employmentType === 'salaried' ? salariedSchema : selfEmployedSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const key = issue.path.join('.');
        if (!errors[key]) errors[key] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const request = buildScoringRequest(formData);
    submitAssessment(request);
  }, [formData, submitAssessment]);

  // Reset everything
  const handleReset = useCallback(() => {
    setEmploymentType(null);
    setBusinessType('trading');
    setSalariedData(INITIAL_SALARIED);
    setSelfEmployedData(INITIAL_SELF_EMPLOYED);
    setFormErrors({});
    resetAssessment();
  }, [resetAssessment]);

  // Sub-stage for self-employed flow: employment -> businessType -> input
  const showBusinessTypeStep = employmentType === 'self_employed' && stage === 'employment';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-indigo-400" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Risk Assessment Engine</h1>
              <p className="text-indigo-300 text-sm">XGBoost ML · SHAP · Isolation Forest · Gemini AI</p>
            </div>
          </div>

          {/* Risk Appetite Selector */}
          {stage !== 'processing' && stage !== 'results' && (
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-300" />
              <select
                value={riskAppetite}
                onChange={e => setRiskAppetite(e.target.value as RiskAppetite)}
                className="bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="conservative" className="text-gray-900">Conservative (PD ≤ 20%)</option>
                <option value="moderate" className="text-gray-900">Moderate (PD ≤ 35%)</option>
                <option value="aggressive" className="text-gray-900">Aggressive (PD ≤ 50%)</option>
              </select>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Wizard Flow */}
        {stage === 'employment' && !showBusinessTypeStep && !employmentType && (
          <EmploymentStep onSelect={handleEmploymentSelect} />
        )}

        {showBusinessTypeStep && (
          <BusinessTypeStep onSelect={handleBusinessTypeSelect} />
        )}

        {stage === 'input' && employmentType === 'salaried' && (
          <SalariedForm
            formData={salariedData}
            onChange={handleSalariedChange}
            onSubmit={handleSubmit}
            errors={formErrors}
          />
        )}

        {stage === 'input' && employmentType === 'self_employed' && (
          <SelfEmployedForm
            formData={selfEmployedData}
            businessType={businessType}
            onChange={handleSelfEmployedChange}
            onSubmit={handleSubmit}
            errors={formErrors}
          />
        )}

        {stage === 'processing' && (
          <ProcessingStep currentStep={processingStep} />
        )}

        {stage === 'results' && scoring && formData && (
          <ResultsView
            scoring={scoring}
            formData={formData}
            aiInsight={aiInsight}
            isAiLoading={isAiLoading}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}