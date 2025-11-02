import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, RefreshCw, Zap, DollarSign, Award, Shield, Activity, Percent, BarChart3, ArrowRight, CheckCircle, AlertCircle, Sparkles, Clock, Target, Brain, LineChart, Bell } from 'lucide-react';

export default function InterestRateOptimizer() {
  const [stage, setStage] = useState('input'); // input, optimizing, results
  const [formData, setFormData] = useState({
    name: '',
    creditScore: 720,
    loanAmount: 500000,
    monthlyIncome: 75000,
    existingEMIs: 15000,
    employmentType: 'salaried',
    repaymentHistory: 'excellent',
    hasInvestments: false,
    customerTenure: 2
  });
  
  const [marketData, setMarketData] = useState({
    repoRate: 6.5,
    inflation: 4.2,
    competitorAvgRate: 9.2,
    bankLiquidity: 'high',
    marketTrend: 'stable'
  });

  const [optimization, setOptimization] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  // Simulate real-time market updates
  useEffect(() => {
    if (stage === 'results' && optimization) {
      const interval = setInterval(() => {
        simulateMarketUpdate();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [stage, optimization]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMarketChange = (e) => {
    const { name, value } = e.target;
    setMarketData(prev => ({ ...prev, [name]: value }));
  };

  const simulateMarketUpdate = () => {
    setIsUpdating(true);
    
    // Simulate small market fluctuations
    const repoChange = (Math.random() - 0.5) * 0.2;
    const inflationChange = (Math.random() - 0.5) * 0.1;
    
    setMarketData(prev => ({
      ...prev,
      repoRate: Math.max(5.0, Math.min(8.0, prev.repoRate + repoChange)),
      inflation: Math.max(3.0, Math.min(6.0, prev.inflation + inflationChange))
    }));

    setTimeout(() => {
      calculateOptimizedRate(true);
      setIsUpdating(false);
      setUpdateCount(prev => prev + 1);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }, 1500);
  };

  const runOptimization = () => {
    setStage('optimizing');
    setTimeout(() => {
      calculateOptimizedRate(false);
    }, 2500);
  };

  const calculateOptimizedRate = (isAutoUpdate) => {
    // Step 1: Normalize customer data
    const creditScoreNorm = Math.min(Math.max((parseFloat(formData.creditScore) - 300) / 600, 0), 1);
    const incomeNorm = Math.min(parseFloat(formData.monthlyIncome) / 200000, 1);
    const dtiRatio = parseFloat(formData.existingEMIs) / parseFloat(formData.monthlyIncome);
    const dtiNorm = Math.max(1 - (dtiRatio / 0.5), 0);
    const loanToIncomeRatio = parseFloat(formData.loanAmount) / (parseFloat(formData.monthlyIncome) * 12);

    // Step 2: Calculate risk score
    const riskScore = (
      (creditScoreNorm * 0.35) +
      (dtiNorm * 0.25) +
      (incomeNorm * 0.20) +
      (formData.repaymentHistory === 'excellent' ? 0.20 : formData.repaymentHistory === 'good' ? 0.12 : 0.05)
    );

    // Step 3: Calculate base rate from market data
    const baseMarketRate = parseFloat(marketData.repoRate) + 1.5; // Base margin above repo rate
    
    // Step 4: Risk premium adjustment
    const riskPremium = (1 - riskScore) * 3; // 0-3% based on risk

    // Step 5: Market adjustment
    const inflationAdjustment = (parseFloat(marketData.inflation) - 4) * 0.1;
    const competitorAdjustment = (parseFloat(marketData.competitorAvgRate) - baseMarketRate) * 0.3;

    // Step 6: Customer loyalty discount
    const loyaltyDiscount = Math.min(parseFloat(formData.customerTenure) * 0.1, 0.5);
    
    // Step 7: Investment integration bonus
    const investmentBonus = formData.hasInvestments ? 0.25 : 0;

    // Step 8: Employment stability factor
    const employmentFactor = formData.employmentType === 'salaried' ? -0.2 : 
                            formData.employmentType === 'business' ? 0.3 : 0.1;

    // Calculate final optimized rate
    let optimizedRate = baseMarketRate + riskPremium + inflationAdjustment + 
                        competitorAdjustment + employmentFactor - 
                        loyaltyDiscount - investmentBonus;
    
    optimizedRate = Math.max(7.0, Math.min(15.0, optimizedRate));

    // Calculate range
    const minRate = Math.max(7.0, optimizedRate - 0.3);
    const maxRate = Math.min(15.0, optimizedRate + 0.3);

    // Calculate confidence
    const confidence = 85 + (riskScore * 12);

    // Calculate savings vs competitor
    const competitorRate = parseFloat(marketData.competitorAvgRate);
    const savingsPerMonth = (parseFloat(formData.loanAmount) * (competitorRate - optimizedRate) / 100) / 12;
    const savingsPerYear = savingsPerMonth * 12;

    // Feature contributions
    const features = [
      { 
        name: 'Credit Score', 
        value: formData.creditScore,
        impact: creditScoreNorm > 0.7 ? 'Positive' : creditScoreNorm > 0.5 ? 'Neutral' : 'Negative',
        contribution: -((creditScoreNorm - 0.5) * 2).toFixed(2),
        weight: 35
      },
      { 
        name: 'Debt-to-Income Ratio', 
        value: `${(dtiRatio * 100).toFixed(1)}%`,
        impact: dtiRatio < 0.3 ? 'Positive' : dtiRatio < 0.45 ? 'Neutral' : 'Negative',
        contribution: ((1 - dtiNorm) * 1.5).toFixed(2),
        weight: 25
      },
      { 
        name: 'Repo Rate', 
        value: `${marketData.repoRate}%`,
        impact: marketData.repoRate < 6.5 ? 'Positive' : 'Neutral',
        contribution: (parseFloat(marketData.repoRate) - 6.0).toFixed(2),
        weight: 20
      },
      { 
        name: 'Customer Loyalty', 
        value: `${formData.customerTenure} years`,
        impact: formData.customerTenure >= 2 ? 'Positive' : 'Neutral',
        contribution: (-loyaltyDiscount).toFixed(2),
        weight: 10
      },
      { 
        name: 'Investment Integration', 
        value: formData.hasInvestments ? 'Active' : 'None',
        impact: formData.hasInvestments ? 'Positive' : 'Neutral',
        contribution: (-investmentBonus).toFixed(2),
        weight: 10
      }
    ];

    // Explanation points
    const explanations = [];
    if (creditScoreNorm > 0.7) {
      explanations.push('Your excellent credit score of ' + formData.creditScore + ' qualifies you for premium rates');
    }
    if (dtiRatio < 0.3) {
      explanations.push('Low debt burden indicates strong repayment capacity');
    }
    if (formData.customerTenure >= 2) {
      explanations.push(`${formData.customerTenure} years of loyalty earned you a ${loyaltyDiscount.toFixed(2)}% discount`);
    }
    if (formData.hasInvestments) {
      explanations.push('Active investments qualify you for an additional 0.25% discount');
    }
    if (marketData.repoRate < 6.5) {
      explanations.push('Favorable repo rate environment enables better offers');
    }

    const result = {
      optimizedRate: optimizedRate.toFixed(2),
      minRate: minRate.toFixed(2),
      maxRate: maxRate.toFixed(2),
      confidence: confidence.toFixed(1),
      baseMarketRate: baseMarketRate.toFixed(2),
      riskPremium: riskPremium.toFixed(2),
      loyaltyDiscount: loyaltyDiscount.toFixed(2),
      investmentBonus: investmentBonus.toFixed(2),
      savingsPerMonth: savingsPerMonth.toFixed(0),
      savingsPerYear: savingsPerYear.toFixed(0),
      competitorRate: competitorRate.toFixed(2),
      riskScore: (riskScore * 100).toFixed(1),
      features,
      explanations,
      monthlyEMI: calculateEMI(parseFloat(formData.loanAmount), optimizedRate, 10),
      isUpdate: isAutoUpdate
    };

    setOptimization(result);
    if (!isAutoUpdate) {
      setStage('results');
    }
  };

  const calculateEMI = (principal, rate, years) => {
    const monthlyRate = rate / (12 * 100);
    const months = years * 12;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi.toFixed(0);
  };

  const resetOptimizer = () => {
    setStage('input');
    setOptimization(null);
    setUpdateCount(0);
  };

  const getImpactColor = (impact) => {
    if (impact === 'Positive') return 'text-green-400';
    if (impact === 'Negative') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getImpactIcon = (impact) => {
    if (impact === 'Positive') return TrendingDown;
    if (impact === 'Negative') return TrendingUp;
    return Activity;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Zap className="w-10 h-10 text-yellow-400" />
                Real-Time Interest Rate Optimizer
              </h1>
              <p className="text-purple-300">AI-powered dynamic rate calculation with live market updates</p>
            </div>
            {stage === 'results' && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
                <div className={`w-3 h-3 rounded-full ${isUpdating ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                <span className="text-white text-sm">
                  {isUpdating ? 'Updating rates...' : 'Live Market Data'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notification */}
        {showNotification && optimization && (
          <div className="mb-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-lg rounded-xl border border-yellow-400/50 p-4 flex items-center gap-3 animate-pulse">
            <Bell className="w-5 h-5 text-yellow-400" />
            <p className="text-white font-medium">
              Rate updated! Market conditions changed - New optimized rate: {optimization.optimizedRate}%
            </p>
          </div>
        )}

        {/* Input Stage */}
        {stage === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Customer Profile */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                Customer Profile
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Customer Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Credit Score: {formData.creditScore}
                  </label>
                  <input
                    type="range"
                    name="creditScore"
                    min="300"
                    max="900"
                    step="10"
                    value={formData.creditScore}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-purple-300 mt-1">
                    <span>300</span>
                    <span>900</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., 500000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Monthly Income (₹)</label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., 75000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Existing EMIs (₹)</label>
                  <input
                    type="number"
                    name="existingEMIs"
                    value={formData.existingEMIs}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., 15000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Employment Type</label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="salaried" className="bg-slate-800">Salaried</option>
                    <option value="business" className="bg-slate-800">Business Owner</option>
                    <option value="professional" className="bg-slate-800">Self-Employed Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Repayment History</label>
                  <select
                    name="repaymentHistory"
                    value={formData.repaymentHistory}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="excellent" className="bg-slate-800">Excellent - No Delays</option>
                    <option value="good" className="bg-slate-800">Good - Minor Delays</option>
                    <option value="poor" className="bg-slate-800">Poor - Multiple Delays</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Customer Tenure (Years)</label>
                  <input
                    type="number"
                    name="customerTenure"
                    value={formData.customerTenure}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., 2"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg border border-white/20">
                  <input
                    type="checkbox"
                    name="hasInvestments"
                    checked={formData.hasInvestments}
                    onChange={handleInputChange}
                    className="w-5 h-5 accent-purple-500"
                  />
                  <label className="text-white font-medium">Has Active Investments on Platform</label>
                </div>
              </div>
            </div>

            {/* Market Data */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <LineChart className="w-6 h-6 text-cyan-400" />
                Live Market Data
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Repo Rate: {marketData.repoRate}%
                  </label>
                  <input
                    type="range"
                    name="repoRate"
                    min="5.0"
                    max="8.0"
                    step="0.1"
                    value={marketData.repoRate}
                    onChange={handleMarketChange}
                    className="w-full h-2 bg-cyan-300 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-purple-300 mt-1">
                    <span>5.0%</span>
                    <span>8.0%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Inflation Rate: {marketData.inflation}%
                  </label>
                  <input
                    type="range"
                    name="inflation"
                    min="3.0"
                    max="6.0"
                    step="0.1"
                    value={marketData.inflation}
                    onChange={handleMarketChange}
                    className="w-full h-2 bg-orange-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-purple-300 mt-1">
                    <span>3.0%</span>
                    <span>6.0%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Competitor Average Rate: {marketData.competitorAvgRate}%
                  </label>
                  <input
                    type="range"
                    name="competitorAvgRate"
                    min="7.0"
                    max="12.0"
                    step="0.1"
                    value={marketData.competitorAvgRate}
                    onChange={handleMarketChange}
                    className="w-full h-2 bg-red-300 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <div className="flex justify-between text-xs text-purple-300 mt-1">
                    <span>7.0%</span>
                    <span>12.0%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Bank Liquidity</label>
                  <select
                    name="bankLiquidity"
                    value={marketData.bankLiquidity}
                    onChange={handleMarketChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="high" className="bg-slate-800">High - Aggressive Lending</option>
                    <option value="medium" className="bg-slate-800">Medium - Balanced</option>
                    <option value="low" className="bg-slate-800">Low - Conservative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Market Trend</label>
                  <select
                    name="marketTrend"
                    value={marketData.marketTrend}
                    onChange={handleMarketChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="bullish" className="bg-slate-800">Bullish - Rates Falling</option>
                    <option value="stable" className="bg-slate-800">Stable - No Change</option>
                    <option value="bearish" className="bg-slate-800">Bearish - Rates Rising</option>
                  </select>
                </div>

                {/* Market Indicators */}
                <div className="mt-6 space-y-3">
                  <div className="bg-cyan-500/20 border border-cyan-400/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        <span className="text-white font-medium">Market Activity</span>
                      </div>
                      <span className="text-cyan-400 font-bold">Active</span>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">Optimization Ready</span>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimize Button */}
            <div className="lg:col-span-2">
              <button
                onClick={runOptimization}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 text-white p-6 rounded-xl font-bold text-xl hover:from-purple-600 hover:via-pink-600 hover:to-yellow-600 transition-all shadow-lg flex items-center justify-center gap-3 group"
              >
                <Brain className="w-8 h-8 group-hover:scale-110 transition-transform" />
                Calculate Optimized Interest Rate
                <Sparkles className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Optimizing Stage */}
        {stage === 'optimizing' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-12">
            <div className="max-w-2xl mx-auto text-center">
              <div className="relative inline-block mb-8">
                <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-yellow-400"></div>
                <Brain className="w-16 h-16 text-yellow-400 absolute top-8 left-8 animate-pulse" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">AI Optimization in Progress</h2>
              <p className="text-purple-300 text-lg mb-8">Analyzing market data and customer profile...</p>
              
              <div className="space-y-3 text-left">
                {[
                  'Fetching real-time market rates...',
                  'Normalizing customer data...',
                  'Calculating risk scores...',
                  'Running AI prediction model...',
                  'Applying loyalty discounts...',
                  'Comparing competitor rates...',
                  'Finalizing optimal rate...'
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-white">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && optimization && (
          <div className="space-y-6">
            
            {/* Main Rate Card */}
            <div className="bg-gradient-to-br from-yellow-500/30 via-purple-500/30 to-pink-500/30 backdrop-blur-lg rounded-xl border border-yellow-400/50 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Optimized Interest Rate</h2>
                  <p className="text-white/80">{formData.name || 'Customer'} - Real-Time Calculation</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-3">
                    <Sparkles className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-white/80 mb-2 text-sm">Optimized Rate</p>
                  <p className="text-6xl font-bold text-white">{optimization.optimizedRate}%</p>
                  <p className="text-white/80 mt-2 text-sm">per annum</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2 text-sm">Rate Range</p>
                  <p className="text-3xl font-bold text-white">{optimization.minRate}%</p>
                  <p className="text-white/60 text-sm">to</p>
                  <p className="text-3xl font-bold text-white">{optimization.maxRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2 text-sm">Monthly EMI</p>
                  <p className="text-4xl font-bold text-white">₹{optimization.monthlyEMI}</p>
                  <p className="text-white/80 mt-2 text-sm">for 10 years</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 mb-2 text-sm">Confidence</p>
                  <p className="text-5xl font-bold text-white">{optimization.confidence}%</p>
                  <p className="text-white/80 mt-2 text-sm">AI accuracy</p>
                </div>
              </div>

              {/* Savings vs Competitor */}
              <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-lg p-6 border border-green-400/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/90 mb-1 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-400" />
                      Savings vs Competitor Average ({optimization.competitorRate}%)
                    </p>
                    <p className="text-green-300 text-sm">You save with our optimized rate!</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-white">₹{optimization.savingsPerYear}</p>
                    <p className="text-green-300 text-sm">per year (₹{optimization.savingsPerMonth}/month)</p>
                  </div>
                </div>
              </div>

              {/* Real-time Update Info */}
              <div className="mt-4 flex items-center justify-between p-4 bg-white/10 rounded-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-white">Live updates: {updateCount} market changes detected</span>
                </div>
                <button
                  onClick={simulateMarketUpdate}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Force Update'}
                </button>
              </div>
            </div>

            {/* Explainable AI - Why This Rate? */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Brain className="w-6 h-6 text-pink-400" />
                Explainable AI - Why This Rate?
              </h3>

              <div className="space-y-3 mb-6">
                {optimization.explanations.map((explanation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white">{explanation}</p>
                  </div>
                ))}
              </div>

              {/* Rate Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300">Base Market Rate</span>
                    <span className="text-white font-bold">+{optimization.baseMarketRate}%</span>
                  </div>
                  <div className="text-xs text-blue-200">Repo rate + base margin</div>
                </div>

                <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-300">Risk Premium</span>
                    <span className="text-white font-bold">+{optimization.riskPremium}%</span>
                  </div>
                  <div className="text-xs text-red-200">Based on risk assessment</div>
                </div>

                <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-300">Loyalty Discount</span>
                    <span className="text-white font-bold">-{optimization.loyaltyDiscount}%</span>
                  </div>
                  <div className="text-xs text-green-200">Customer tenure reward</div>
                </div>

                <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300">Investment Bonus</span>
                    <span className="text-white font-bold">-{optimization.investmentBonus}%</span>
                  </div>
                  <div className="text-xs text-purple-200">Active investment discount</div>
                </div>
              </div>
            </div>

            {/* Feature Contributions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                Feature Impact Analysis
              </h3>

              <div className="space-y-4">
                {optimization.features.map((feature, index) => {
                  const ImpactIcon = getImpactIcon(feature.impact);
                  return (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <ImpactIcon className={`w-5 h-5 ${getImpactColor(feature.impact)}`} />
                          <div>
                            <h4 className="text-white font-medium">{feature.name}</h4>
                            <p className="text-purple-300 text-sm">{feature.value}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getImpactColor(feature.impact)}`}>
                            {parseFloat(feature.contribution) > 0 ? '+' : ''}{feature.contribution}%
                          </p>
                          <p className="text-white/60 text-xs">Weight: {feature.weight}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              feature.impact === 'Positive'
                                ? 'bg-green-400'
                                : feature.impact === 'Negative'
                                ? 'bg-red-400'
                                : 'bg-yellow-400'
                            }`}
                            style={{ width: `${feature.weight}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getImpactColor(feature.impact)}`}>
                          {feature.impact}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Market Conditions Dashboard */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-400" />
                Current Market Conditions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Percent className="w-6 h-6 text-cyan-400" />
                    <h4 className="text-white font-semibold">Repo Rate</h4>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{marketData.repoRate}%</p>
                  <p className="text-cyan-300 text-sm">Central bank rate</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-6 h-6 text-orange-400" />
                    <h4 className="text-white font-semibold">Inflation</h4>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{marketData.inflation}%</p>
                  <p className="text-orange-300 text-sm">Current rate</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                    <h4 className="text-white font-semibold">Competitor Avg</h4>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{marketData.competitorAvgRate}%</p>
                  <p className="text-purple-300 text-sm">Market average</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Bank Liquidity</span>
                    <span className="text-white font-bold capitalize">{marketData.bankLiquidity}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300">Market Trend</span>
                    <span className="text-white font-bold capitalize">{marketData.marketTrend}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-gradient-to-br from-indigo-500/30 to-purple-500/30 backdrop-blur-lg rounded-xl border border-indigo-400/50 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-400" />
                Risk Assessment Score
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#6366f1"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(optimization.riskScore / 100) * 352} 352`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{optimization.riskScore}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-lg mb-2">
                    {parseFloat(optimization.riskScore) >= 75 ? 'Low Risk Customer' : 
                     parseFloat(optimization.riskScore) >= 50 ? 'Medium Risk Customer' : 'High Risk Customer'}
                  </p>
                  <p className="text-purple-300 text-sm">
                    Based on comprehensive analysis of credit history, income stability, and repayment patterns
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={resetOptimizer}
                className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl font-semibold border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                New Calculation
              </button>
              <button
                onClick={simulateMarketUpdate}
                disabled={isUpdating}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-yellow-500/50 disabled:to-orange-500/50 text-white p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {isUpdating ? 'Updating...' : 'Refresh Market Data'}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                Export Rate Sheet
              </button>
            </div>

            {/* Real-time Info Banner */}
            <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl border border-blue-400/50 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/30 rounded-full p-3">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-2">Real-Time Optimization Active</h4>
                  <p className="text-blue-200 text-sm mb-3">
                    This interest rate is dynamically calculated based on live market conditions. 
                    The system continuously monitors repo rates, inflation, competitor pricing, and your customer profile 
                    to ensure you always get the most competitive and fair rate possible.
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white">Live Market Feed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-white">AI Model Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-white">Auto-Updates Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}