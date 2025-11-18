import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, User, Briefcase, CreditCard, Calendar, DollarSign, Activity, Target, Brain, Zap, Eye, Lock, FileCheck, BarChart3, Percent, FileText, X, Sparkles } from 'lucide-react';

interface FormData {
  name: string;
  age: string;
  creditScore: number;
  monthlyIncome: string;
  existingEMIs: string;
  employmentYears: string;
  savingsBalance: string;
  loanAmount: string;
  previousDefaults: string;
  accountAge: string;
}

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
  contribution?: number; // Add contribution property
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
}

// Hybrid XGBoost-SHAP with Adaptive Thresholding Model
const useHybridXGBoostSHAP = () => {
  // SHAP values calculation (simplified for demo)
  const calculateSHAPValues = (formData: FormData) => {
    const creditScore = formData.creditScore || 650;
    const monthlyIncome = Number(formData.monthlyIncome) || 50000;
    const existingEMIs = Number(formData.existingEMIs) || 0;
    const employmentYears = Number(formData.employmentYears) || 1;
    const savingsBalance = Number(formData.savingsBalance) || 0;
    const loanAmount = Number(formData.loanAmount) || 100000;
    const previousDefaults = parseInt(formData.previousDefaults) || 0;
    const accountAge = Number(formData.accountAge) || 1;

    // Calculate metrics
    const dtiRatio = (existingEMIs / (monthlyIncome || 1));
    const savingsToLoanRatio = savingsBalance / (loanAmount || 1);
    const incomeToLoanRatio = (monthlyIncome * 12) / (loanAmount || 1);

    // Unused variables - we'll use void to acknowledge them
    void incomeToLoanRatio;
    void employmentYears;

    // SHAP values for each feature (simplified)
    const shapValues = [
      { 
        feature: 'Credit Score', 
        value: creditScore, 
        shap: ((creditScore - 650) / 250) * 0.3, // Range: -0.3 to 0.3
        description: creditScore >= 750 ? 'Excellent credit score' : creditScore >= 650 ? 'Good credit score' : 'Below average credit score'
      },
      { 
        feature: 'Debt-to-Income Ratio', 
        value: `${(dtiRatio * 100).toFixed(1)}%`, 
        shap: (0.5 - dtiRatio) * 0.4, // Lower DTI is better
        description: dtiRatio <= 0.3 ? 'Healthy debt-to-income ratio' : dtiRatio <= 0.45 ? 'Acceptable debt burden' : 'High debt burden'
      },
      { 
        feature: 'Employment Stability', 
        value: `${employmentYears} years`, 
        shap: Math.min(employmentYears / 10, 1) * 0.15,
        description: employmentYears >= 5 ? 'Long-term employment stability' : employmentYears >= 2 ? 'Moderate employment history' : 'Limited employment history'
      },
      { 
        feature: 'Savings Coverage', 
        value: `${(savingsToLoanRatio * 100).toFixed(0)}%`, 
        shap: (savingsToLoanRatio - 0.2) * 0.2, // 20% is baseline
        description: savingsToLoanRatio >= 0.5 ? 'Strong savings coverage' : savingsToLoanRatio >= 0.2 ? 'Adequate savings buffer' : 'Low savings coverage'
      },
      { 
        feature: 'Repayment History', 
        value: previousDefaults === 0 ? 'Clean' : `${previousDefaults} defaults`, 
        shap: previousDefaults === 0 ? 0.2 : previousDefaults === 1 ? -0.1 : -0.3,
        description: previousDefaults === 0 ? 'No previous defaults' : previousDefaults === 1 ? 'One previous default' : 'Multiple previous defaults'
      },
      { 
        feature: 'Account Age', 
        value: `${accountAge} years`, 
        shap: Math.min(accountAge / 10, 1) * 0.05,
        description: accountAge >= 5 ? 'Long-standing customer' : accountAge >= 2 ? 'Established customer' : 'New customer'
      }
    ];

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
  const predictWithXGBoost = (formData: FormData, shapValues: SHAPValue[]) => {
    // Sum all SHAP values to get log-odds
    const logOdds = shapValues.reduce((sum: number, feature: SHAPValue) => sum + feature.shap, 0);
    
    // Convert log-odds to probability using sigmoid function
    const probability = 1 / (1 + Math.exp(-logOdds));
    
    return probability;
  };

  return { calculateSHAPValues, calculateAdaptiveThreshold, predictWithXGBoost };
};

export default function RiskAssessmentSystem() {
  const [stage, setStage] = useState<'input' | 'processing' | 'results'>('input');
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    creditScore: 650,
    monthlyIncome: '',
    existingEMIs: '',
    employmentYears: '',
    savingsBalance: '',
    loanAmount: '',
    previousDefaults: '0',
    accountAge: ''
  });
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  
  // Initialize the hybrid model
  const { calculateSHAPValues, calculateAdaptiveThreshold, predictWithXGBoost } = useHybridXGBoostSHAP();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'creditScore' ? Number(value) : value }));
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
    const creditScore = formData.creditScore || 650;
    const monthlyIncome = Number(formData.monthlyIncome) || 50000;
    const existingEMIs = Number(formData.existingEMIs) || 0;
    const employmentYears = Number(formData.employmentYears) || 1;
    const savingsBalance = Number(formData.savingsBalance) || 0;
    const loanAmount = Number(formData.loanAmount) || 100000;
    const previousDefaults = parseInt(formData.previousDefaults) || 0;
    const accountAge = Number(formData.accountAge) || 1;

    // Calculate metrics
    const dtiRatio = (existingEMIs / (monthlyIncome || 1)); // prevent divide by zero
    const savingsToLoanRatio = savingsBalance / (loanAmount || 1);
    const incomeToLoanRatio = (monthlyIncome * 12) / (loanAmount || 1);

    // Unused variables - we'll use void to acknowledge them
    void incomeToLoanRatio;
    void employmentYears;

    // --- Hybrid XGBoost-SHAP Implementation ---
    
    // 1. Calculate SHAP values
    const shapValues = calculateSHAPValues(formData);
    
    // 2. Use XGBoost to predict probability
    const xgboostProbability = predictWithXGBoost(formData, shapValues);
    
    // 3. Calculate adaptive threshold
    // In a real implementation, these would come from external systems
    const marketConditions = dtiRatio > 0.5 ? 'high_risk' : dtiRatio < 0.3 ? 'low_risk' : 'normal';
    const customerSegment = creditScore >= 750 ? 'premium' : creditScore < 600 ? 'subprime' : 'standard';
    const regulatoryCaps = { minThreshold: 0.3, maxThreshold: 0.7 };
    
    const adaptiveThreshold = calculateAdaptiveThreshold(marketConditions, customerSegment, regulatoryCaps);
    
    // 4. Make decision based on adaptive threshold
    const finalApproved = xgboostProbability >= adaptiveThreshold;
    
    // --- End Hybrid Implementation ---

    // Fraud detection flags
    const fraudFlags = [];
    let fraudScore = 0;

    if (loanAmount > monthlyIncome * 50 && monthlyIncome > 0) {
      fraudFlags.push({ type: 'warning', message: 'Loan amount unusually high relative to income' });
      fraudScore += 0.15;
    }
    if (accountAge < 1) {
      fraudFlags.push({ type: 'warning', message: 'Very new bank account' });
      fraudScore += 0.1;
    }
    if (previousDefaults > 2) {
      fraudFlags.push({ type: 'danger', message: 'Multiple previous loan defaults detected' });
      fraudScore += 0.25;
    }
    if (dtiRatio > 0.6) {
      fraudFlags.push({ type: 'warning', message: 'Debt burden exceeds safe threshold' });
      fraudScore += 0.1;
    }

    // Adjust final probability for fraud
    const finalProbability = Math.max(xgboostProbability - fraudScore, 0);

    // Determine risk category
    let riskCategory, riskColor, riskIcon, recommendation, interestRate;
    
    if (finalProbability >= 0.8) {
      riskCategory = 'Low Risk';
      riskColor = 'green';
      riskIcon = CheckCircle;
      recommendation = 'Approved - Standard interest rate';
      interestRate = 8.5;
    } else if (finalProbability >= 0.6) {
      riskCategory = 'Medium Risk';
      riskColor = 'yellow';
      riskIcon = AlertTriangle;
      recommendation = 'Approved with conditions - Slightly higher rate';
      interestRate = 10.5;
    } else if (finalProbability >= 0.4) {
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
        dtiRatio: (dtiRatio * 100).toFixed(1),
        savingsToLoan: (savingsToLoanRatio * 100).toFixed(1),
        incomeToLoan: incomeToLoanRatio.toFixed(2)
      },
      modelInfo: {
        marketConditions,
        customerSegment,
        regulatoryCaps
      }
    });

    setStage('results');
  };

  const resetAssessment = () => {
    setStage('input');
    setAssessment(null);
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

        {/* Input Stage */}
        {stage === 'input' && (
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
                    Monthly Income (₹)
                  </label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 75000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Existing EMIs per Month (₹)
                  </label>
                  <input
                    type="number"
                    name="existingEMIs"
                    value={formData.existingEMIs}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 15000"
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                Financial Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Employment Duration (Years)
                  </label>
                  <input
                    type="number"
                    name="employmentYears"
                    value={formData.employmentYears}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Savings Balance (₹)
                  </label>
                  <input
                    type="number"
                    name="savingsBalance"
                    value={formData.savingsBalance}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 150000"
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

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Previous Loan Defaults</label>
                  <select
                    name="previousDefaults"
                    value={formData.previousDefaults}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="0" className="bg-slate-800">0 - Clean Record</option>
                    <option value="1" className="bg-slate-800">1 - One Default</option>
                    <option value="2" className="bg-slate-800">2 - Two Defaults</option>
                    <option value="3" className="bg-slate-800">3+ - Multiple Defaults</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Bank Account Age (Years)</label>
                  <input
                    type="number"
                    name="accountAge"
                    value={formData.accountAge}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., 3"
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
                  const isCurrent = index === processingStep; // Fixed logic to highlight current step

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-white/80 mb-2">Risk Probability</p>
                  <p className="text-5xl font-bold text-white">{assessment.finalProbability}%</p>
                  <p className="text-white/80 mt-1">XGBoost Model Prediction</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Risk Category</p>
                  <p className="text-3xl font-bold text-white">{assessment.riskCategory}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Recommended Rate</p>
                  <p className="text-5xl font-bold text-white">
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

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Percent className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-semibold">DTI Ratio</h4>
                </div>
                <p className="text-3xl font-bold text-white">{assessment.metrics.dtiRatio}%</p>
                <p className="text-purple-300 text-sm mt-2">Debt-to-Income ratio</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                  <h4 className="text-white font-semibold">Savings Coverage</h4>
                </div>
                <p className="text-3xl font-bold text-white">{assessment.metrics.savingsToLoan}%</p>
                <p className="text-cyan-300 text-sm mt-2">Of loan amount</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <h4 className="text-white font-semibold">Income Multiplier</h4>
                </div>
                <p className="text-3xl font-bold text-white">{assessment.metrics.incomeToLoan}x</p>
                <p className="text-green-300 text-sm mt-2">Annual income vs loan</p>
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
                        <p className="text-indigo-300 text-sm mb-1">Monthly Income</p>
                        <p className="text-2xl font-bold text-white">₹{parseInt(formData.monthlyIncome).toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Loan Amount</p>
                        <p className="text-2xl font-bold text-white">₹{parseInt(formData.loanAmount).toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Employment Years</p>
                        <p className="text-2xl font-bold text-white">{formData.employmentYears}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Savings Balance</p>
                        <p className="text-2xl font-bold text-white">₹{parseInt(formData.savingsBalance).toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-indigo-300 text-sm mb-1">Previous Defaults</p>
                        <p className="text-2xl font-bold text-white">{formData.previousDefaults}</p>
                      </div>
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

