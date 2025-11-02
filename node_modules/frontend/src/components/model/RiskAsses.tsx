import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, User, Briefcase, CreditCard, Calendar, DollarSign, Activity, Target, Brain, Zap, Eye, Lock, FileCheck, BarChart3, Percent } from 'lucide-react';

export default function RiskAssessmentSystem() {
  const [stage, setStage] = useState('input'); // input, processing, results
  const [formData, setFormData] = useState({
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
  const [assessment, setAssessment] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    const creditScore = parseFloat(formData.creditScore) || 650;
    const monthlyIncome = parseFloat(formData.monthlyIncome) || 50000;
    const existingEMIs = parseFloat(formData.existingEMIs) || 0;
    const employmentYears = parseFloat(formData.employmentYears) || 1;
    const savingsBalance = parseFloat(formData.savingsBalance) || 0;
    const loanAmount = parseFloat(formData.loanAmount) || 100000;
    const previousDefaults = parseInt(formData.previousDefaults) || 0;
    const accountAge = parseFloat(formData.accountAge) || 1;

    // Calculate metrics
    const dtiRatio = (existingEMIs / (monthlyIncome || 1)); // prevent divide by zero
    const savingsToLoanRatio = savingsBalance / (loanAmount || 1);
    const incomeToLoanRatio = (monthlyIncome * 12) / (loanAmount || 1);

    // Feature scoring (0-1 scale)
    let creditScoreNorm = Math.min(Math.max((creditScore - 300) / 600, 0), 1);
    let dtiNorm = Math.max(1 - (dtiRatio / 0.5), 0);
    let employmentNorm = Math.min(employmentYears / 10, 1);
    let savingsNorm = Math.min(savingsToLoanRatio * 2, 1);
    let defaultNorm = Math.max(1 - (previousDefaults * 0.3), 0);
    let incomeNorm = Math.min(incomeToLoanRatio / 5, 1);
    let accountAgeNorm = Math.min(accountAge / 10, 1);

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

    // Calculate weighted risk score
    const weights = {
      creditScore: 0.35,
      dti: 0.25,
      employment: 0.15,
      savings: 0.10,
      defaults: 0.10,
      accountAge: 0.05
    };

    const riskScore = (
      (creditScoreNorm * weights.creditScore) +
      (dtiNorm * weights.dti) +
      (employmentNorm * weights.employment) +
      (savingsNorm * weights.savings) +
      (defaultNorm * weights.defaults) +
      (accountAgeNorm * weights.accountAge)
    );

    // Adjust for fraud
    const finalRiskScore = Math.max(riskScore - fraudScore, 0);

    // Determine risk category
    let riskCategory, riskColor, riskIcon, recommendation, interestRate;
    
    if (finalRiskScore >= 0.75) {
      riskCategory = 'Low Risk';
      riskColor = 'green';
      riskIcon = CheckCircle;
      recommendation = 'Approved - Standard interest rate';
      interestRate = 8.5;
    } else if (finalRiskScore >= 0.50) {
      riskCategory = 'Medium Risk';
      riskColor = 'yellow';
      riskIcon = AlertTriangle;
      recommendation = 'Approved with conditions - Slightly higher rate';
      interestRate = 10.5;
    } else if (finalRiskScore >= 0.30) {
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

    // Feature contributions
    const features = [
      { 
        name: 'Credit Score', 
        value: creditScore, 
        weight: weights.creditScore,
        contribution: creditScoreNorm * weights.creditScore,
        impact: creditScore >= 750 ? 'Positive' : creditScore >= 650 ? 'Neutral' : 'Negative'
      },
      { 
        name: 'Debt-to-Income', 
        value: `${(dtiRatio * 100).toFixed(1)}%`, 
        weight: weights.dti,
        contribution: dtiNorm * weights.dti,
        impact: dtiRatio <= 0.3 ? 'Positive' : dtiRatio <= 0.45 ? 'Neutral' : 'Negative'
      },
      { 
        name: 'Employment Stability', 
        value: `${employmentYears} years`, 
        weight: weights.employment,
        contribution: employmentNorm * weights.employment,
        impact: employmentYears >= 3 ? 'Positive' : employmentYears >= 1 ? 'Neutral' : 'Negative'
      },
      { 
        name: 'Savings Coverage', 
        value: `${(savingsToLoanRatio * 100).toFixed(0)}%`, 
        weight: weights.savings,
        contribution: savingsNorm * weights.savings,
        impact: savingsToLoanRatio >= 0.3 ? 'Positive' : savingsToLoanRatio >= 0.1 ? 'Neutral' : 'Negative'
      },
      { 
        name: 'Repayment History', 
        value: previousDefaults === 0 ? 'Clean' : `${previousDefaults} defaults`, 
        weight: weights.defaults,
        contribution: defaultNorm * weights.defaults,
        impact: previousDefaults === 0 ? 'Positive' : previousDefaults <= 1 ? 'Neutral' : 'Negative'
      }
    ];

    setAssessment({
      finalRiskScore: (finalRiskScore * 100).toFixed(1),
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

  const getRiskColorClasses = (color) => {
    const colors = {
      green: 'from-green-500/30 to-emerald-500/30 border-green-400/50',
      yellow: 'from-yellow-500/30 to-amber-500/30 border-yellow-400/50',
      orange: 'from-orange-500/30 to-red-500/30 border-orange-400/50',
      red: 'from-red-500/30 to-rose-500/30 border-red-400/50'
    };
    return colors[color] || colors.green;
  };

  const getImpactColor = (impact) => {
    if (impact === 'Positive') return 'text-green-400';
    if (impact === 'Negative') return 'text-red-400';
    return 'text-yellow-400';
  };
  
  const getImpactWidth = (contribution, features) => {
    const maxContribution = Math.max(...features.map(f => f.contribution));
    if (maxContribution === 0) return '0%';
    return `${(contribution / maxContribution) * 100}%`;
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
                  <p className="text-white/80 mb-2">Risk Score</p>
                  <p className="text-5xl font-bold text-white">{assessment.finalRiskScore}</p>
                  <p className="text-white/80 mt-1">out of 100</p>
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
                AI Model Feature Analysis (Explainable AI)
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
                        <p className={`font-bold ${getImpactColor(feature.impact)}`}>{feature.impact}</p>
                        <p className="text-white/60 text-sm">Weight: {(feature.weight * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          feature.impact === 'Positive'
                            ? 'bg-green-400'
                            : feature.impact === 'Negative'
                            ? 'bg-red-400'
                            : 'bg-yellow-400'
                        }`}
                        style={{ width: getImpactWidth(feature.contribution, assessment.features) }}
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

