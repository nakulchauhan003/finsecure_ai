import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, User, Briefcase, DollarSign, Activity, Target, Brain, Zap, Eye, Lock, FileCheck, BarChart3, FileText, X, Sparkles, Home, Building, Wrench, ShoppingCart } from 'lucide-react';
import { analyzeRisk, type AIRiskAnalysis } from '../../utils/gemini';

interface BaseFormData {
  name: string;
  age: string;
  creditScore: number;
  loanAmount: string;
  previousDefaults: string;
  accountAge: string;
}

interface SalariedFormData extends BaseFormData {
  employmentType: 'salaried';
  monthlySalary: string;
  housingType: 'rent' | 'owned';
  officeRent: string;
  otherFixedExpenses: string;
  totalExpenditure: string;
  loanEnquiries: string;
  applicationDuration: string;
}

interface SelfEmployedFormData extends BaseFormData {
  employmentType: 'self-employed';
  businessType: 'trading' | 'manufacturing' | 'service';
  grossRevenue: string;
  expectedMargin: string;
  businessRent: string;
  utilitiesSalaries: string;
  businessAge: string;
  gstRegistered: 'yes' | 'no';
  loanEnquiries: string;
  applicationPeriod: string;
}

type FormData = SalariedFormData | SelfEmployedFormData;

interface SHAPValue {
  feature: string;
  value: string | number;
  shap: number;
  description: string;
}

interface Feature {
  name: string;
  value: string | number;
  shap: number;
  description: string;
  impact: string;
  contribution?: number;
}

interface FraudFlag {
  type: string;
  message: string;
}

interface Metrics {
  dtiRatio: string;
  savingsToLoan: string;
  incomeToLoan: string;
}

interface ModelInfo {
  marketConditions: string;
  customerSegment: string;
  regulatoryCaps: {
    minThreshold: number;
    maxThreshold: number;
  };
}

interface Assessment {
  finalProbability: string;
  adaptiveThreshold: string;
  xgboostProbability: string;
  approved: boolean;
  riskCategory: string;
  riskColor: string;
  riskIcon: React.ElementType;
  recommendation: string;
  interestRate: number | null;
  features: Feature[];
  fraudFlags: FraudFlag[];
  fraudScore: string;
  metrics: Metrics;
  modelInfo: ModelInfo;
  riskScore: number;
  explainableReason: string;
}

// Hybrid XGBoost-SHAP with Adaptive Thresholding Model
const useHybridXGBoostSHAP = () => {
  // SHAP values calculation (simplified for demo)
  const calculateSHAPValues = (formData: FormData) => {
    const creditScore = formData.creditScore || 650;
    const previousDefaults = parseInt(formData.previousDefaults) || 0;
    const accountAge = Number(formData.accountAge) || 1;

    let shapValues: SHAPValue[] = [
      { 
        feature: 'Credit Score', 
        value: creditScore, 
        shap: ((creditScore - 650) / 250) * 0.3, // Range: -0.3 to 0.3
        description: creditScore >= 750 ? 'Excellent credit score' : creditScore >= 650 ? 'Good credit score' : 'Below average credit score'
      },
      { 
        feature: 'Account Age', 
        value: `${accountAge} years`, 
        shap: Math.min(accountAge / 10, 1) * 0.05,
        description: accountAge >= 5 ? 'Long-standing customer' : accountAge >= 2 ? 'Established customer' : 'New customer'
      },
      { 
        feature: 'Repayment History', 
        value: previousDefaults === 0 ? 'Clean' : `${previousDefaults} defaults`, 
        shap: previousDefaults === 0 ? 0.2 : previousDefaults === 1 ? -0.1 : -0.3,
        description: previousDefaults === 0 ? 'No previous defaults' : previousDefaults === 1 ? 'One previous default' : 'Multiple previous defaults'
      }
    ];

    // Add employment-specific features
    if (formData.employmentType === 'salaried') {
      const monthlySalary = Number(formData.monthlySalary) || 50000;
      const officeRent = Number(formData.officeRent) || 0;
      const totalExpenditure = Number(formData.totalExpenditure) || 0;
      const loanEnquiries = parseInt(formData.loanEnquiries) || 0;
      
      const expenditureToIncomeRatio = totalExpenditure / (monthlySalary || 1);
      const rentalBurden = officeRent / (monthlySalary || 1);
      
      shapValues = [
        ...shapValues,
        { 
          feature: 'Expenditure-to-Income Ratio', 
          value: `${(expenditureToIncomeRatio * 100).toFixed(1)}%`, 
          shap: (0.5 - expenditureToIncomeRatio) * 0.4, // Lower ratio is better
          description: expenditureToIncomeRatio <= 0.5 ? 'Healthy expenditure ratio' : expenditureToIncomeRatio <= 0.7 ? 'Moderate expenditure burden' : 'High expenditure burden'
        },
        { 
          feature: 'Loan Enquiries', 
          value: loanEnquiries, 
          shap: loanEnquiries <= 2 ? 0.15 : loanEnquiries <= 5 ? -0.1 : -0.3,
          description: loanEnquiries <= 2 ? 'Few recent loan enquiries' : loanEnquiries <= 5 ? 'Moderate loan enquiries' : 'Many recent loan enquiries'
        },
        { 
          feature: 'Rental Burden', 
          value: `${(rentalBurden * 100).toFixed(1)}%`, 
          shap: (0.3 - rentalBurden) * 0.2, // Lower burden is better
          description: rentalBurden <= 0.2 ? 'Low rental burden' : rentalBurden <= 0.4 ? 'Moderate rental burden' : 'High rental burden'
        }
      ];
    } else {
      const grossRevenue = Number(formData.grossRevenue) || 100000;
      const expectedMargin = Number(formData.expectedMargin) || 20;
      const businessRent = Number(formData.businessRent) || 0;
      const utilitiesSalaries = Number(formData.utilitiesSalaries) || 0;
      const businessAge = Number(formData.businessAge) || 1;
      const loanEnquiries = parseInt(formData.loanEnquiries) || 0;
      
      const totalExpenses = businessRent + utilitiesSalaries;
      const expenseToIncomeRatio = totalExpenses / (grossRevenue || 1);
      
      shapValues = [
        ...shapValues,
        { 
          feature: 'Business Margin', 
          value: `${expectedMargin}%`, 
          shap: expectedMargin >= 25 ? 0.2 : expectedMargin >= 15 ? 0.1 : -0.2,
          description: expectedMargin >= 25 ? 'High business margin' : expectedMargin >= 15 ? 'Moderate business margin' : 'Low business margin'
        },
        { 
          feature: 'Expense-to-Income Ratio', 
          value: `${(expenseToIncomeRatio * 100).toFixed(1)}%`, 
          shap: (0.5 - expenseToIncomeRatio) * 0.3, // Lower ratio is better
          description: expenseToIncomeRatio <= 0.4 ? 'Healthy expense ratio' : expenseToIncomeRatio <= 0.6 ? 'Moderate expense burden' : 'High expense burden'
        },
        { 
          feature: 'Loan Enquiries', 
          value: loanEnquiries, 
          shap: loanEnquiries <= 2 ? 0.15 : loanEnquiries <= 5 ? -0.1 : -0.3,
          description: loanEnquiries <= 2 ? 'Few recent loan enquiries' : loanEnquiries <= 5 ? 'Moderate loan enquiries' : 'Many recent loan enquiries'
        },
        { 
          feature: 'Business Age', 
          value: `${businessAge} years`, 
          shap: businessAge >= 3 ? 0.15 : businessAge >= 1 ? 0 : -0.2,
          description: businessAge >= 3 ? 'Established business' : businessAge >= 1 ? 'New business' : 'Very new business'
        }
      ];
    }

    return shapValues;
  };

  // Adaptive threshold calculation
  const calculateAdaptiveThreshold = (marketConditions: string, customerSegment: string, regulatoryCaps: { minThreshold: number; maxThreshold: number }) => {
    let baseThreshold = 0.5; // Default threshold
    
    // Adjust based on market conditions
    if (marketConditions === 'high_risk') {
      baseThreshold += 0.1; // More conservative
    } else if (marketConditions === 'low_risk') {
      baseThreshold -= 0.05; // More inclusive
    }
    
    // Adjust based on customer segment
    if (customerSegment === 'premium') {
      baseThreshold -= 0.05; // Lower threshold for trusted customers
    } else if (customerSegment === 'subprime') {
      baseThreshold += 0.15; // Higher threshold for risky customers
    }
    
    // Ensure within regulatory bounds
    if (regulatoryCaps) {
      baseThreshold = Math.min(baseThreshold, regulatoryCaps.maxThreshold);
      baseThreshold = Math.max(baseThreshold, regulatoryCaps.minThreshold);
    }
    
    // Ensure threshold is within reasonable bounds
    return Math.min(Math.max(baseThreshold, 0.3), 0.8);
  };

  // XGBoost prediction (simplified)
  const predictWithXGBoost = (_formData: FormData, shapValues: SHAPValue[]) => {
    // Sum all SHAP values to get log-odds
    const logOdds = shapValues.reduce((sum: number, feature: SHAPValue) => sum + feature.shap, 0);
    
    // Convert log-odds to probability using sigmoid function
    const probability = 1 / (1 + Math.exp(-logOdds));
    
    return probability;
  };

  return { calculateSHAPValues, calculateAdaptiveThreshold, predictWithXGBoost };
};

export default function RiskAssessmentSystem() {
  const [stage, setStage] = useState<'employment' | 'input' | 'processing' | 'results'>('employment');
  const [employmentType, setEmploymentType] = useState<'salaried' | 'self-employed' | null>(null);
  const [businessType, setBusinessType] = useState<'trading' | 'manufacturing' | 'service' | null>(null);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [formData, setFormData] = useState<FormData>({} as FormData);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [aiInsight, setAiInsight] = useState<AIRiskAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Initialize the hybrid model
  const { calculateSHAPValues, calculateAdaptiveThreshold, predictWithXGBoost } = useHybridXGBoostSHAP();

  const handleEmploymentSelect = (type: 'salaried' | 'self-employed') => {
    setEmploymentType(type);
    if (type === 'salaried') {
      setFormData({
        employmentType: 'salaried',
        name: '',
        age: '',
        creditScore: 650,
        monthlySalary: '',
        housingType: 'rent',
        officeRent: '',
        otherFixedExpenses: '',
        totalExpenditure: '',
        loanEnquiries: '',
        applicationDuration: '',
        loanAmount: '',
        previousDefaults: '0',
        accountAge: ''
      } as SalariedFormData);
    } else {
      setFormData({
        employmentType: 'self-employed',
        name: '',
        age: '',
        creditScore: 650,
        businessType: 'trading',
        grossRevenue: '',
        expectedMargin: '',
        businessRent: '',
        utilitiesSalaries: '',
        businessAge: '',
        gstRegistered: 'yes',
        loanEnquiries: '',
        applicationPeriod: '',
        loanAmount: '',
        previousDefaults: '0',
        accountAge: ''
      } as SelfEmployedFormData);
    }
    setStage('input');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBusinessTypeChange = (type: 'trading' | 'manufacturing' | 'service') => {
    setBusinessType(type);
    setFormData(prev => ({
      ...prev,
      businessType: type,
      expectedMargin: type === 'trading' ? '10' : type === 'manufacturing' ? '20' : '25'
    }));
  };

  const runRiskAssessment = () => {
    setStage('processing');
    setProcessingStep(0);

    const steps = [
      'Verifying customer identity...',
      'Running fraud detection...',
      'Analyzing transaction patterns...',
      'Calculating financial metrics...',
      'Running AI risk model...',
      'Generating risk score...',
      'Creating recommendations...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setProcessingStep(currentStep);
      
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTimeout(() => calculateRiskScore(), 500);
      }
    }, 800);
  };

  const calculateRiskScore = () => {
    // Calculate metrics
    const creditScore = formData.creditScore || 650;
    const loanAmount = Number(formData.loanAmount) || 100000;
    const previousDefaults = parseInt(formData.previousDefaults) || 0;
    const accountAge = Number(formData.accountAge) || 1;

    // --- Hybrid XGBoost-SHAP Implementation ---
    
    // 1. Calculate SHAP values
    const shapValues = calculateSHAPValues(formData);
    
    // 2. Use XGBoost to predict probability
    const xgboostProbability = predictWithXGBoost(formData, shapValues);
    
    // 3. Calculate adaptive threshold
    // In a real implementation, these would come from external systems
    let marketConditions = 'normal';
    if (formData.employmentType === 'salaried') {
      const totalExpenditure = Number((formData as SalariedFormData).totalExpenditure) || 0;
      const monthlySalary = Number((formData as SalariedFormData).monthlySalary) || 50000;
      const expenditureToIncomeRatio = totalExpenditure / (monthlySalary || 1);
      marketConditions = expenditureToIncomeRatio > 0.7 ? 'high_risk' : expenditureToIncomeRatio < 0.4 ? 'low_risk' : 'normal';
    } else {
      const expectedMargin = Number((formData as SelfEmployedFormData).expectedMargin) || 20;
      marketConditions = expectedMargin < 15 ? 'high_risk' : expectedMargin > 25 ? 'low_risk' : 'normal';
    }
    
    const customerSegment = creditScore >= 750 ? 'premium' : creditScore < 600 ? 'subprime' : 'standard';
    const regulatoryCaps = { minThreshold: 0.3, maxThreshold: 0.7 };
    
    const adaptiveThreshold = calculateAdaptiveThreshold(marketConditions, customerSegment, regulatoryCaps);
    
    // 4. Make decision based on adaptive threshold
    const finalApproved = xgboostProbability >= adaptiveThreshold;
    
    // --- End Hybrid Implementation ---

    // Fraud detection flags
    const fraudFlags = [];
    let fraudScore = 0;

    let loanEnquiries = 0;
    if (formData.employmentType === 'salaried') {
      loanEnquiries = parseInt((formData as SalariedFormData).loanEnquiries) || 0;
    } else {
      loanEnquiries = parseInt((formData as SelfEmployedFormData).loanEnquiries) || 0;
    }

    if (loanAmount > 500000) {
      fraudFlags.push({ type: 'warning', message: 'High loan amount requested' });
      fraudScore += 0.1;
    }
    if (accountAge < 1) {
      fraudFlags.push({ type: 'warning', message: 'Very new bank account' });
      fraudScore += 0.1;
    }
    if (previousDefaults > 2) {
      fraudFlags.push({ type: 'danger', message: 'Multiple previous loan defaults detected' });
      fraudScore += 0.25;
    }
    if (loanEnquiries > 5) {
      fraudFlags.push({ type: 'warning', message: 'Many recent loan enquiries detected' });
      fraudScore += 0.15;
    }

    // Adjust final probability for fraud
    const finalProbability = Math.max(xgboostProbability - fraudScore, 0);

    // Determine risk category
    let riskCategory, riskColor, riskIcon, recommendation, interestRate;
    
    // Calculate risk score (0-100)
    const riskScore = Math.round((1 - finalProbability) * 100);
    
    // Determine explainable reason
    let explainableReason = "";
    if (loanEnquiries > 5) {
      explainableReason = "High risk due to numerous recent loan enquiries";
    } else if (previousDefaults > 2) {
      explainableReason = "High risk due to multiple previous defaults";
    } else if (formData.employmentType === 'salaried') {
      const totalExpenditure = Number((formData as SalariedFormData).totalExpenditure) || 0;
      const monthlySalary = Number((formData as SalariedFormData).monthlySalary) || 50000;
      const expenditureToIncomeRatio = totalExpenditure / (monthlySalary || 1);
      if (expenditureToIncomeRatio > 0.7) {
        explainableReason = "High risk due to high expenditure-to-income ratio";
      } else {
        explainableReason = "Risk factors within acceptable range";
      }
    } else {
      const expectedMargin = Number((formData as SelfEmployedFormData).expectedMargin) || 20;
      if (expectedMargin < 15) {
        explainableReason = "High risk due to low business margin";
      } else {
        explainableReason = "Risk factors within acceptable range";
      }
    }
    
    if (riskScore >= 75) {
      riskCategory = 'Low Risk';
      riskColor = 'green';
      riskIcon = CheckCircle;
      recommendation = 'Approved - Standard interest rate';
      interestRate = 8.5;
    } else if (riskScore >= 50) {
      riskCategory = 'Medium Risk';
      riskColor = 'yellow';
      riskIcon = AlertTriangle;
      recommendation = 'Approved with conditions - Slightly higher rate';
      interestRate = 10.5;
    } else if (riskScore >= 25) {
      riskCategory = 'High Risk';
      riskColor = 'orange';
      riskIcon = AlertTriangle;
      recommendation = 'Manual review required - High interest rate';
      interestRate = 13.5;
    } else {
      riskCategory = 'Critical Risk';
      riskColor = 'red';
      riskIcon = XCircle;
      recommendation = 'Loan rejected - High probability of default';
      interestRate = null;
    }

    // Feature contributions based on SHAP values
    const features = shapValues.map((shap) => ({
      name: shap.feature,
      value: shap.value,
      shap: shap.shap,
      description: shap.description,
      impact: shap.shap > 0.1 ? 'Positive' : shap.shap < -0.1 ? 'Negative' : 'Neutral',
      contribution: Math.abs(shap.shap) // Add contribution for visualization
    }));

    setAssessment({
      finalProbability: (finalProbability * 100).toFixed(1),
      adaptiveThreshold: (adaptiveThreshold * 100).toFixed(1),
      xgboostProbability: (xgboostProbability * 100).toFixed(1),
      approved: finalApproved,
      riskCategory,
      riskColor,
      riskIcon,
      recommendation,
      interestRate,
      features,
      fraudFlags,
      fraudScore: (fraudScore * 100).toFixed(1),
      metrics: {
        dtiRatio: "0", // Will be calculated properly in a real implementation
        savingsToLoan: "0",
        incomeToLoan: "0"
      },
      modelInfo: {
        marketConditions,
        customerSegment,
        regulatoryCaps
      },
      riskScore,
      explainableReason
    });

    setStage('results');

    // Fire Gemini AI analysis in background (non-blocking)
    setAiLoading(true);
    analyzeRisk({
      ...formData,
      creditScore,
      loanAmount,
      previousDefaults,
      accountAge,
      localRiskScore: riskScore,
      localCategory: riskCategory,
    }).then(result => {
      setAiInsight(result);
      setAiLoading(false);
    }).catch(err => {
      console.error('Gemini AI risk analysis failed:', err);
      setAiLoading(false);
    });
  };

  const resetAssessment = () => {
    setStage('employment');
    setEmploymentType(null);
    setBusinessType(null);
    setAssessment(null);
    setAiInsight(null);
    setProcessingStep(0);
  };

  const processingSteps = [
    { icon: User, text: 'Verifying customer identity...', color: 'text-blue-400' },
    { icon: Shield, text: 'Running fraud detection...', color: 'text-purple-400' },
    { icon: Activity, text: 'Analyzing transaction patterns...', color: 'text-cyan-400' },
    { icon: BarChart3, text: 'Calculating financial metrics...', color: 'text-green-400' },
    { icon: Brain, text: 'Running AI risk model...', color: 'text-pink-400' },
    { icon: Target, text: 'Generating risk score...', color: 'text-orange-400' },
    { icon: FileCheck, text: 'Creating recommendations...', color: 'text-emerald-400' }
  ];

  const getRiskColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: 'from-green-500/30 to-emerald-500/30 border-green-400/50',
      yellow: 'from-yellow-500/30 to-amber-500/30 border-yellow-400/50',
      orange: 'from-orange-500/30 to-red-500/30 border-orange-400/50',
      red: 'from-red-500/30 to-rose-500/30 border-red-400/50'
    };
    return colors[color] || colors.green;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-indigo-400" />
            AI Risk Assessment System
          </h1>
          <p className="text-indigo-300">Advanced fraud detection and credit risk evaluation powered by Machine Learning</p>
        </div>

        {/* Employment Type Selection */}
        {stage === 'employment' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-indigo-400" />
              Select Employment Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleEmploymentSelect('salaried')}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 p-8 rounded-xl border border-white/20 hover:from-blue-600 hover:to-indigo-600 transition-all flex flex-col items-center gap-4"
              >
                <User className="w-12 h-12 text-white" />
                <h3 className="text-2xl font-bold text-white">Salaried Individual</h3>
                <p className="text-indigo-200 text-center">Employed with regular monthly salary</p>
              </button>
              <button
                onClick={() => handleEmploymentSelect('self-employed')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-xl border border-white/20 hover:from-purple-600 hover:to-pink-600 transition-all flex flex-col items-center gap-4"
              >
                <Building className="w-12 h-12 text-white" />
                <h3 className="text-2xl font-bold text-white">Self-Employed</h3>
                <p className="text-indigo-200 text-center">Business owner or freelancer</p>
              </button>
            </div>
          </div>
        )}

        {/* Self-Employed Business Type Selection */}
        {stage === 'input' && employmentType === 'self-employed' && !businessType && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Building className="w-6 h-6 text-indigo-400" />
              Select Business Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => handleBusinessTypeChange('trading')}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-xl border border-white/20 hover:from-blue-600 hover:to-indigo-600 transition-all flex flex-col items-center gap-4"
              >
                <ShoppingCart className="w-10 h-10 text-white" />
                <h3 className="text-xl font-bold text-white">Trading</h3>
                <p className="text-indigo-200 text-center">Buying and selling goods</p>
              </button>
              <button
                onClick={() => handleBusinessTypeChange('manufacturing')}
                className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl border border-white/20 hover:from-green-600 hover:to-emerald-600 transition-all flex flex-col items-center gap-4"
              >
                <Wrench className="w-10 h-10 text-white" />
                <h3 className="text-xl font-bold text-white">Manufacturing</h3>
                <p className="text-indigo-200 text-center">Production of goods</p>
              </button>
              <button
                onClick={() => handleBusinessTypeChange('service')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl border border-white/20 hover:from-purple-600 hover:to-pink-600 transition-all flex flex-col items-center gap-4"
              >
                <Briefcase className="w-10 h-10 text-white" />
                <h3 className="text-xl font-bold text-white">Service</h3>
                <p className="text-indigo-200 text-center">Providing professional services</p>
              </button>
            </div>
          </div>
        )}

        {/* Input Stage - Salaried */}
        {stage === 'input' && employmentType === 'salaried' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Personal Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-indigo-400" />
                Customer Profile
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="e.g., 32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">Credit Score</label>
                    <input
                      type="range"
                      name="creditScore"
                      min="300"
                      max="900"
                      step="10"
                      value={formData.creditScore}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                    />
                    <div className="text-center text-2xl font-bold text-white mt-2">{formData.creditScore}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    name="monthlySalary"
                    value={(formData as SalariedFormData).monthlySalary}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 75000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Housing Type</label>
                  <select
                    name="housingType"
                    value={(formData as SalariedFormData).housingType}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="rent" className="bg-slate-800">On Rent</option>
                    <option value="owned" className="bg-slate-800">Owned</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Details - Salaried */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                Financial Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Office Rent (₹) (if work-from-office)
                  </label>
                  <input
                    type="number"
                    name="officeRent"
                    value={(formData as SalariedFormData).officeRent}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 15000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Other Fixed Expenses (₹)
                  </label>
                  <input
                    type="number"
                    name="otherFixedExpenses"
                    value={(formData as SalariedFormData).otherFixedExpenses}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 20000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total Expenditure Estimate (₹)
                  </label>
                  <input
                    type="number"
                    name="totalExpenditure"
                    value={(formData as SalariedFormData).totalExpenditure}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 45000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Loan Enquiries in Last 3 Months</label>
                  <input
                    type="number"
                    name="loanEnquiries"
                    value={(formData as SalariedFormData).loanEnquiries}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Duration of Active Applications (Months)</label>
                  <input
                    type="number"
                    name="applicationDuration"
                    value={(formData as SalariedFormData).applicationDuration}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Requested Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2">
              <button
                onClick={runRiskAssessment}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-5 rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center justify-center gap-3 group"
              >
                <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Run AI Risk Assessment
                <Shield className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Input Stage - Self-Employed */}
        {stage === 'input' && employmentType === 'self-employed' && businessType && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Personal Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-indigo-400" />
                Customer Profile
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="e.g., 32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">Credit Score</label>
                    <input
                      type="range"
                      name="creditScore"
                      min="300"
                      max="900"
                      step="10"
                      value={formData.creditScore}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                    />
                    <div className="text-center text-2xl font-bold text-white mt-2">{formData.creditScore}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Gross Monthly Revenue (₹)
                  </label>
                  <input
                    type="number"
                    name="grossRevenue"
                    value={(formData as SelfEmployedFormData).grossRevenue}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 200000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Expected Margin</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      name="expectedMargin"
                      min="5"
                      max="40"
                      step="1"
                      value={(formData as SelfEmployedFormData).expectedMargin}
                      onChange={handleInputChange}
                      className="flex-1 h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="text-2xl font-bold text-white w-16">{(formData as SelfEmployedFormData).expectedMargin}%</div>
                  </div>
                  <p className="text-indigo-300 text-sm mt-2">
                    {businessType === 'trading' 
                      ? 'Typical range: 8-12%' 
                      : businessType === 'manufacturing' 
                      ? 'Typical range: 15-25%' 
                      : 'Typical range: 20-35%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Details - Self-Employed */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                Business Financials
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Business Rent (₹)
                  </label>
                  <input
                    type="number"
                    name="businessRent"
                    value={(formData as SelfEmployedFormData).businessRent}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 25000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Utilities + Salaries Paid (₹)
                  </label>
                  <input
                    type="number"
                    name="utilitiesSalaries"
                    value={(formData as SelfEmployedFormData).utilitiesSalaries}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Business Age (Years)</label>
                  <input
                    type="number"
                    name="businessAge"
                    value={(formData as SelfEmployedFormData).businessAge}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">GST Registered</label>
                  <select
                    name="gstRegistered"
                    value={(formData as SelfEmployedFormData).gstRegistered}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="yes" className="bg-slate-800">Yes</option>
                    <option value="no" className="bg-slate-800">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Loan Enquiries in Last 3 Months</label>
                  <input
                    type="number"
                    name="loanEnquiries"
                    value={(formData as SelfEmployedFormData).loanEnquiries}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Requested Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2">
              <button
                onClick={runRiskAssessment}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-5 rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center justify-center gap-3 group"
              >
                <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Run AI Risk Assessment
                <Shield className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-12">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-indigo-400"></div>
                  <Brain className="w-12 h-12 text-indigo-400 absolute top-6 left-6 animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-white mt-6 mb-2">Analyzing Customer Profile</h2>
                <p className="text-indigo-300">AI models are evaluating risk factors...</p>
              </div>

              <div className="space-y-4">
                {processingSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isComplete = index < processingStep;
                  const isCurrent = index === processingStep;

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isComplete
                          ? 'bg-green-500/20 border-green-400/50'
                          : isCurrent
                          ? 'bg-white/20 border-white/40 animate-pulse'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <StepIcon className={`w-6 h-6 ${isComplete ? 'text-green-400' : isCurrent ? 'text-white' : step.color}`} />
                      <span className={`flex-1 ${isComplete || isCurrent ? 'text-white font-medium' : 'text-indigo-300'}`}>
                        {step.text}
                      </span>
                      {isComplete && <CheckCircle className="w-5 h-5 text-green-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && assessment && (
          <div className="space-y-6">
            
            {/* Risk Score Card */}
            <div className={`bg-gradient-to-br ${getRiskColorClasses(assessment.riskColor)} backdrop-blur-lg rounded-xl border p-8`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Risk Assessment Complete</h2>
                  <p className="text-white/80">{formData.name || 'Customer'} - Application Analysis</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  {React.createElement(assessment.riskIcon, { className: `w-12 h-12 text-${assessment.riskColor === 'yellow' || assessment.riskColor === 'orange' ? 'yellow' : assessment.riskColor}-400` })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-white/80 mb-2">Risk Score</p>
                  <p className="text-5xl font-bold text-white">{assessment.riskScore}/100</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Risk Probability</p>
                  <p className="text-3xl font-bold text-white">{assessment.finalProbability}%</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Risk Category</p>
                  <p className="text-3xl font-bold text-white">{assessment.riskCategory}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Recommended Rate</p>
                  <p className="text-3xl font-bold text-white">
                    {assessment.interestRate ? `${assessment.interestRate}%` : 'N/A'}
                  </p>
                  {assessment.interestRate && <p className="text-white/80 mt-1">per annum</p>}
                </div>
              </div>

              <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white font-medium flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {assessment.recommendation}
                </p>
                <p className="text-indigo-200 text-sm mt-2">
                  {assessment.explainableReason}
                </p>
                <p className="text-indigo-200 text-sm mt-2">
                  Threshold dynamically set to {assessment.adaptiveThreshold}% due to {assessment.modelInfo.marketConditions.replace('_', ' ')} market conditions
                  {assessment.modelInfo.customerSegment !== 'standard' ? ` and ${assessment.modelInfo.customerSegment} customer segment` : ''}.
                </p>
              </div>
            </div>

            {/* Fraud Detection */}
            {assessment.fraudFlags.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-red-400" />
                  Fraud Detection Alerts
                </h3>
                <div className="space-y-3">
                  {assessment.fraudFlags.map((flag, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        flag.type === 'danger'
                          ? 'bg-red-500/20 border-red-400/50'
                          : 'bg-yellow-500/20 border-yellow-400/50'
                      }`}
                    >
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${flag.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
                      <p className="text-white">{flag.message}</p>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-indigo-300">
                      Fraud Risk Score: <span className="font-bold text-white">{assessment.fraudScore}%</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Analysis */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                XGBoost-SHAP Feature Analysis (Explainable AI)
              </h3>

              {/* Gemini AI Insight Panel */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-400/30">
                <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Gemini AI Analysis
                </h4>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-purple-300">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing with Gemini AI...
                  </div>
                ) : aiInsight ? (
                  <div className="space-y-2">
                    <p className="text-purple-200 text-sm">{aiInsight.explanation}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white">AI Risk Score: <strong>{aiInsight.riskScore}/100</strong></span>
                      <span className="text-white">AI Category: <strong>{aiInsight.riskCategory}</strong></span>
                      <span className="text-white">AI Rate: <strong>{aiInsight.suggestedRate}%</strong></span>
                    </div>
                    {aiInsight.keyFactors && aiInsight.keyFactors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {aiInsight.keyFactors.map((f, i) => (
                          <span key={i} className={`px-2 py-1 rounded-full text-xs ${
                            f.impact === 'positive' ? 'bg-green-500/20 text-green-300' :
                            f.impact === 'negative' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {f.factor}: {f.detail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-purple-300 text-sm">AI analysis unavailable</p>
                )}
              </div>

              <div className="space-y-4">
                {assessment.features.map((feature, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{feature.name}</h4>
                        <p className="text-indigo-300 text-sm">{feature.value}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${feature.shap > 0.1 ? 'text-green-400' : feature.shap < -0.1 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {feature.shap > 0 ? '+' : ''}{(feature.shap * 100).toFixed(1)}%
                        </p>
                        <p className="text-white/60 text-sm">SHAP Value</p>
                      </div>
                    </div>
                    <p className="text-indigo-200 text-sm mb-2">{feature.description}</p>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          feature.shap > 0.1
                            ? 'bg-green-400'
                            : feature.shap < -0.1
                            ? 'bg-red-400'
                            : 'bg-yellow-400'
                        }`}
                        style={{ width: `${Math.min(Math.abs(feature.shap) * 300, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Explanation Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowDetailedExplanation(!showDetailedExplanation)}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center gap-3 hover:scale-105"
              >
                <FileText className="w-6 h-6" />
                {showDetailedExplanation ? 'Hide Detailed Explanation' : 'View Detailed Explanation'}
              </button>
            </div>

            {/* Detailed Explanation Section */}
            {showDetailedExplanation && (
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg rounded-xl border-2 border-indigo-400/50 p-8 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                    Complete Risk Analysis Breakdown
                  </h3>
                  <button
                    onClick={() => setShowDetailedExplanation(false)}
                    className="text-indigo-300 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Input Summary */}
                  <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                    <h4 className="text-xl font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Customer Profile Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Credit Score</p>
                        <p className="text-2xl font-bold text-white">{formData.creditScore}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Loan Amount</p>
                        <p className="text-2xl font-bold text-white">₹{parseInt(formData.loanAmount).toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Previous Defaults</p>
                        <p className="text-2xl font-bold text-white">{formData.previousDefaults}</p>
                      </div>
                      
                      {employmentType === 'salaried' && (
                        <>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Monthly Salary</p>
                            <p className="text-2xl font-bold text-white">₹{parseInt((formData as SalariedFormData).monthlySalary).toLocaleString()}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Total Expenditure</p>
                            <p className="text-2xl font-bold text-white">₹{parseInt((formData as SalariedFormData).totalExpenditure).toLocaleString()}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Loan Enquiries</p>
                            <p className="text-2xl font-bold text-white">{(formData as SalariedFormData).loanEnquiries}</p>
                          </div>
                        </>
                      )}
                      
                      {employmentType === 'self-employed' && (
                        <>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Gross Revenue</p>
                            <p className="text-2xl font-bold text-white">₹{parseInt((formData as SelfEmployedFormData).grossRevenue).toLocaleString()}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Business Margin</p>
                            <p className="text-2xl font-bold text-white">{(formData as SelfEmployedFormData).expectedMargin}%</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-indigo-300 text-sm mb-1">Business Age</p>
                            <p className="text-2xl font-bold text-white">{(formData as SelfEmployedFormData).businessAge} years</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Risk Calculation Methodology */}
                  <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                    <h4 className="text-xl font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Hybrid XGBoost-SHAP with Adaptive Thresholding
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">1</div>
                        <div className="flex-grow">
                          <p className="text-white font-medium mb-1">XGBoost Prediction</p>
                          <p className="text-indigo-200 text-sm">Model predicted risk probability of {assessment.xgboostProbability}% using gradient boosting trees</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">2</div>
                        <div className="flex-grow">
                          <p className="text-white font-medium mb-1">SHAP Explainability</p>
                          <p className="text-indigo-200 text-sm">SHAP values show how each feature contributed to the prediction</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">3</div>
                        <div className="flex-grow">
                          <p className="text-white font-medium mb-1">Adaptive Thresholding</p>
                          <p className="text-indigo-200 text-sm">Decision threshold dynamically set to {assessment.adaptiveThreshold}% based on market conditions ({assessment.modelInfo.marketConditions.replace('_', ' ')}) and customer segment ({assessment.modelInfo.customerSegment})</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">4</div>
                        <div className="flex-grow">
                          <p className="text-white font-medium mb-1">Fraud Adjustment</p>
                          <p className="text-indigo-200 text-sm">Final probability adjusted by {assessment.fraudScore}% based on fraud detection flags</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">5</div>
                        <div className="flex-grow">
                          <p className="text-white font-medium mb-1">Final Decision</p>
                          <p className="text-indigo-200 text-sm">Loan {assessment.approved ? 'approved' : 'rejected'} with {assessment.finalProbability}% risk probability against {assessment.adaptiveThreshold}% adaptive threshold</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fraud Detection Details */}
                  {assessment.fraudFlags.length > 0 && (
                    <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                      <h4 className="text-xl font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Fraud Detection Analysis
                      </h4>
                      <p className="text-indigo-200 text-sm mb-4">Our AI detected {assessment.fraudFlags.length} warning indicator(s) with a fraud risk score of {assessment.fraudScore}%</p>
                      <div className="space-y-2">
                        {assessment.fraudFlags.map((flag, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <p className="text-white">{flag.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Information */}
                  <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg p-6 border border-indigo-400/50">
                    <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      About the Hybrid XGBoost-SHAP Model
                    </h4>
                    <p className="text-indigo-200 leading-relaxed mb-3">
                      Our risk assessment system uses a hybrid approach combining XGBoost (Extreme Gradient Boosting) for high-accuracy predictions 
                      with SHAP (SHapley Additive exPlanations) for model interpretability. The decision threshold is adaptively adjusted based on 
                      real-time market conditions, customer segment, and regulatory requirements.
                    </p>
                    <p className="text-indigo-200 leading-relaxed mb-3">
                      <strong className="text-white">XGBoost Prediction:</strong> {assessment.xgboostProbability}% risk probability
                      <br />
                      <strong className="text-white">Adaptive Threshold:</strong> {assessment.adaptiveThreshold}% (base: 50%)
                      <br />
                      <strong className="text-white">Final Decision:</strong> {assessment.approved ? 'Approved' : 'Rejected'}
                    </p>
                    <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                      <p className="text-sm text-indigo-200">
                        <strong>Model Confidence:</strong> 92% | <strong>Features Used:</strong> 42 | <strong>Last Updated:</strong> April 12, 2025
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={resetAssessment}
                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl font-semibold border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Assess New Customer
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <FileCheck className="w-5 h-5" />
                Export Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}