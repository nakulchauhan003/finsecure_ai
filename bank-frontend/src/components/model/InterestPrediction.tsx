import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Briefcase, 
  CreditCard, 
  Sparkles, 
  Info, 
  Target, 
  Zap,
  FileText,
  X
} from 'lucide-react';
import { predictInterestRate, AIRatePrediction } from '../../utils/gemini';

interface PredictionResult {
  rate: number;
  term: number;
  dti: number;
  capacity: number;
  explanation: string[];
}

function App() {
  const [formData, setFormData] = useState({
    creditScore: 300,
    monthlyIncome: '',
    existingEmis: '',
    loanAmount: '',
    employmentStability: '',
  });
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<AIRatePrediction | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePredict = () => {
    setIsLoading(true);
    setPrediction(null);
    setShowDetailedExplanation(false);

    setTimeout(() => {
      const creditScore = Number(formData.creditScore) || 300;
      const monthlyIncome = parseFloat(formData.monthlyIncome) || 0;
      const existingEmis = parseFloat(formData.existingEmis) || 0;
      const loanAmount = parseFloat(formData.loanAmount) || 0;
      const employmentStability = parseFloat(formData.employmentStability) || 0;
      
      const annualIncome = (monthlyIncome * 12) || 1; // Safeguard against division by zero
      const dtiRatio = (existingEmis * 12) / annualIncome;
      const monthlyRepaymentCapacity = monthlyIncome - existingEmis;

      const explanation = [];
      let baseRate = 8.5;
      explanation.push(`Base interest rate started at ${baseRate}%.`);

      if (creditScore >= 780) {
        baseRate -= 1.0;
        explanation.push(`-1.0% adjustment due to Excellent credit score (${creditScore}).`);
      } else if (creditScore >= 720) {
        baseRate += 0.5;
        explanation.push(`+0.5% adjustment due to Good credit score (${creditScore}).`);
      } else if (creditScore >= 650) {
        baseRate += 1.5;
        explanation.push(`+1.5% adjustment due to Moderate credit score (${creditScore}).`);
      } else {
        baseRate += 3.0;
        explanation.push(`+3.0% adjustment due to High Risk credit score (${creditScore}).`);
      }

      if (dtiRatio > 0.45) {
        baseRate += 1.5;
        explanation.push(`+1.5% adjustment due to high Debt-to-Income (DTI) ratio (${(dtiRatio * 100).toFixed(1)}%).`);
      } else if (dtiRatio > 0.3) {
        baseRate += 0.5;
        explanation.push(`+0.5% adjustment due to moderate DTI ratio (${(dtiRatio * 100).toFixed(1)}%).`);
      } else {
        explanation.push(`No DTI adjustment (Ratio: ${(dtiRatio * 100).toFixed(1)}%).`);
      }

      if (loanAmount > 1000000) {
        baseRate += 0.75;
        explanation.push(`+0.75% adjustment due to large loan amount.`);
      }

      const predictedRate = parseFloat(baseRate.toFixed(2));

      let predictedTerm = 60;

      if (employmentStability >= 60 && monthlyRepaymentCapacity > (loanAmount / 36)) {
        predictedTerm = 36;
        explanation.push(`Term set to 36 months (Short) due to high employment stability (${employmentStability} months) and strong repayment capacity.`);
      } else if (employmentStability < 24 || monthlyRepaymentCapacity < (loanAmount / 72)) {
        predictedTerm = 84;
        explanation.push(`Term set to 84 months (Long) to reduce EMI stress due to lower employment stability (${employmentStability} months) or repayment capacity.`);
      } else {
        predictedTerm = 60;
        explanation.push(`Term set to 60 months (Medium) as a balance of affordability and stability.`);
      }

      setPrediction({
        rate: predictedRate,
        term: predictedTerm,
        dti: dtiRatio,
        capacity: monthlyRepaymentCapacity,
        explanation: explanation,
      });

      setIsLoading(false);

      // Fire Gemini AI prediction in background
      setAiLoading(true);
      setAiPrediction(null);
      predictInterestRate({
        creditScore: Number(formData.creditScore),
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        existingEmis: parseFloat(formData.existingEmis) || 0,
        loanAmount: parseFloat(formData.loanAmount) || 0,
        employmentStability: parseFloat(formData.employmentStability) || 0,
      }).then(result => setAiPrediction(result))
        .catch(err => console.error('AI rate prediction failed:', err))
        .finally(() => setAiLoading(false));
    }, 1500);
  };
  
  const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) {
      value = 0;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 780) return 'text-green-400';
    if (score >= 720) return 'text-blue-400';
    if (score >= 650) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 780) return 'Excellent';
    if (score >= 720) return 'Good';
    if (score >= 650) return 'Moderate';
    return 'High Risk';
  };

  const calculateEMI = (principal: number, annualRate: number, termInMonths: number) => {
    if (!principal || !annualRate || !termInMonths || principal <= 0 || termInMonths <= 0) return 0;
    // Handle 0% interest rate case
    if (annualRate === 0) return principal / termInMonths;
    
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
    return emi;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-400" />
            AI Loan Rate & Term Predictor
          </h1>
          <p className="text-purple-300">Machine Learning powered interest rate and tenure optimization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Input Form */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" />
              Applicant Data
            </h2>
            
            <div className="space-y-6">
              
              {/* Credit Score Slider */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Credit Score
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
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-3xl font-bold ${getCreditScoreColor(formData.creditScore)}`}>
                    {formData.creditScore}
                  </span>
                  <span className={`text-sm font-semibold ${getCreditScoreColor(formData.creditScore)}`}>
                    {getCreditScoreLabel(formData.creditScore)}
                  </span>
                </div>
              </div>

              {/* Monthly Income */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Monthly Income (₹)
                </label>
                <input
                  type="number"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g., 80000"
                />
              </div>

              {/* Existing EMIs */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Total Existing EMIs (₹)
                </label>
                <input
                  type="number"
                  name="existingEmis"
                  value={formData.existingEmis}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g., 15000"
                />
              </div>

              {/* Loan Amount */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Requested Loan Amount (₹)
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

              {/* Employment Stability */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employment Stability (Months)
                </label>
                <input
                  type="number"
                  name="employmentStability"
                  value={formData.employmentStability}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g., 36"
                />
              </div>
              

              {/* Submit Button */}
              <button
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Predict Rate & Term
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              Prediction Results
            </h2>

            {!prediction && !isLoading && (
              <div className="flex flex-col items-center justify-center h-64 text-purple-300">
                <Info className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Enter applicant details and click "Predict" to see results</p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mb-4"></div>
                <p className="text-purple-300 text-lg">Running AI analysis...</p>
              </div>
            )}

            {prediction && !isLoading && (
              <div className="space-y-6">
                {/* Main Predictions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Interest Rate Card */}
                  <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg p-6 border border-purple-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-purple-300" />
                      <h3 className="text-lg font-semibold text-purple-200">Predicted Interest Rate</h3>
                    </div>
                    <p className="text-5xl font-bold text-white">{prediction.rate}%</p>
                    <p className="text-purple-300 mt-2">per annum</p>
                  </div>

                  {/* Loan Term Card */}
                  <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-lg p-6 border border-blue-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-6 h-6 text-blue-300" />
                      <h3 className="text-lg font-semibold text-blue-200">Recommended Term</h3>
                    </div>
                    <p className="text-5xl font-bold text-white">{prediction.term}</p>
                    <p className="text-blue-300 mt-2">months ({(prediction.term / 12).toFixed(1)} years)</p>
                  </div>
                </div>

                {/* Financial Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-purple-300 mb-1">Debt-to-Income Ratio</p>
                    <p className="text-2xl font-bold text-white">{(prediction.dti * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-purple-300 mb-1">Monthly Repayment Capacity</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(prediction.capacity)}</p>
                  </div>
                </div>

                {/* Explanation Section */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-purple-400" />
                    How we calculated this
                  </h3>
                  <div className="space-y-2">
                    {prediction.explanation.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                        <p className="text-purple-200 text-sm leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estimated EMI */}
                {formData.loanAmount && (
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-6 border border-green-400/50">
                    <h3 className="text-lg font-semibold text-green-200 mb-3">Estimated Monthly EMI</h3>
                    <p className="text-4xl font-bold text-white">
                      {formatCurrency(
                        calculateEMI(parseFloat(formData.loanAmount), prediction.rate, prediction.term)
                      )}
                    </p>
                    <p className="text-green-300 mt-2 text-sm">
                      Total payable: {formatCurrency(
                        calculateEMI(parseFloat(formData.loanAmount), prediction.rate, prediction.term) * prediction.term
                      )}
                    </p>
                  </div>
                )}

                {/* AI Rate Prediction */}
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg p-6 border border-purple-500/30">
                  <h3 className="text-lg font-semibold text-purple-200 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    AI Prediction
                  </h3>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-purple-300 text-sm">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      Running AI analysis...
                    </div>
                  ) : aiPrediction ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                          <p className="text-purple-300 text-xs mb-1">AI Rate</p>
                          <p className="text-2xl font-bold text-white">{aiPrediction.predictedRate}%</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                          <p className="text-purple-300 text-xs mb-1">AI Term</p>
                          <p className="text-2xl font-bold text-white">{aiPrediction.predictedTerm}mo</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                          <p className="text-purple-300 text-xs mb-1">AI EMI</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(aiPrediction.monthlyEMI)}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                          <p className="text-purple-300 text-xs mb-1">Confidence</p>
                          <p className="text-2xl font-bold text-white">{aiPrediction.confidence}%</p>
                        </div>
                      </div>
                      {aiPrediction.adjustments && aiPrediction.adjustments.length > 0 && (
                        <div className="space-y-1">
                          {aiPrediction.adjustments.slice(0, 4).map((adj, i) => (
                            <div key={i} className={`text-xs px-3 py-1.5 rounded ${
                              adj.adjustment <= 0 ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                            }`}>
                              {adj.adjustment >= 0 ? '+' : ''}{adj.adjustment}% {adj.factor}: {adj.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-purple-300 text-sm">Click &quot;Predict Rate & Term&quot; to get AI prediction</p>
                  )}
                </div>

                {/* Detailed Explanation Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowDetailedExplanation(!showDetailedExplanation)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-3 hover:scale-105"
                  >
                    <FileText className="w-6 h-6" />
                    {showDetailedExplanation ? 'Hide Detailed Explanation' : 'View Detailed Explanation'}
                  </button>
                </div>

                {/* Detailed Explanation Modal/Section */}
                {showDetailedExplanation && (
                  <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-lg rounded-xl border-2 border-purple-400/50 p-8 shadow-2xl animate-fadeIn">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                        Complete AI Analysis Breakdown
                      </h3>
                      <button
                        onClick={() => setShowDetailedExplanation(false)}
                        className="text-purple-300 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Input Summary */}
                      <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                        <h4 className="text-xl font-semibold text-purple-200 mb-4 flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Input Parameters
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">Credit Score</p>
                            <p className={`text-2xl font-bold ${getCreditScoreColor(formData.creditScore)}`}>
                              {formData.creditScore} ({getCreditScoreLabel(formData.creditScore)})
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">Monthly Income</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(parseFloat(formData.monthlyIncome) || 0)}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">Existing EMIs</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(parseFloat(formData.existingEmis) || 0)}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">Loan Amount</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(parseFloat(formData.loanAmount) || 0)}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">Employment Stability</p>
                            <p className="text-2xl font-bold text-white">{formData.employmentStability} months</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 text-sm mb-1">DTI Ratio</p>
                            <p className="text-2xl font-bold text-white">{(prediction.dti * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Calculation */}
                      <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                        <h4 className="text-xl font-semibold text-purple-200 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          AI Decision Process
                        </h4>
                        <div className="space-y-3">
                          {prediction.explanation.map((item, index) => (
                            <div key={index} className="flex items-start gap-4 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 font-bold text-white">
                                {index + 1}
                              </div>
                              <p className="text-purple-100 leading-relaxed flex-grow">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk Assessment */}
                      <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                        <h4 className="text-xl font-semibold text-purple-200 mb-4 flex items-center gap-2">
                          <Info className="w-5 h-5" />
                          Risk & Repayment Analysis
                        </h4>
                        <div className="space-y-4">
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 mb-2">Debt-to-Income Ratio Assessment</p>
                            <div className="flex items-center gap-4">
                              <div className="flex-grow bg-white/20 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-full ${prediction.dti > 0.45 ? 'bg-red-500' : prediction.dti > 0.3 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(prediction.dti * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-white font-bold">{(prediction.dti * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-purple-200 text-sm mt-2">
                              {prediction.dti > 0.45 ? '⚠️ High DTI - Higher risk profile' : 
                               prediction.dti > 0.3 ? '⚡ Moderate DTI - Acceptable risk' : 
                               '✅ Low DTI - Strong financial position'}
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300 mb-2">Monthly Repayment Capacity</p>
                            <p className="text-3xl font-bold text-white mb-2">{formatCurrency(prediction.capacity)}</p>
                            <p className="text-purple-200 text-sm">
                              Available after existing EMIs: {formatCurrency(parseFloat(formData.monthlyIncome) || 0)} - {formatCurrency(parseFloat(formData.existingEmis) || 0)}
                            </p>
                          </div>

                          {formData.loanAmount && (
                            <div className="bg-white/5 rounded-lg p-4">
                              <p className="text-purple-300 mb-2">Estimated EMI vs Capacity</p>
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex-grow">
                                  <p className="text-sm text-purple-200 mb-1">Your EMI</p>
                                  <p className="text-2xl font-bold text-white">
                                    {formatCurrency(calculateEMI(parseFloat(formData.loanAmount), prediction.rate, prediction.term))}
                                  </p>
                                </div>
                                <div className="flex-grow">
                                  <p className="text-sm text-purple-200 mb-1">Capacity</p>
                                  <p className="text-2xl font-bold text-white">{formatCurrency(prediction.capacity)}</p>
                                </div>
                              </div>
                              <p className="text-purple-200 text-sm">
                                {calculateEMI(parseFloat(formData.loanAmount), prediction.rate, prediction.term) <= prediction.capacity 
                                  ? '✅ EMI is within your repayment capacity' 
                                  : '⚠️ EMI exceeds recommended capacity'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Model Information */}
                      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 border border-purple-400/50">
                        <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                          About This AI Model
                        </h4>
                        <p className="text-purple-200 leading-relaxed mb-3">
                          Our AI-powered prediction model analyzes multiple financial factors including credit score, income levels, 
                          debt obligations, and employment stability to determine the optimal interest rate and loan tenure for your profile.
                        </p>
                        <p className="text-purple-200 leading-relaxed">
                          The model starts with a base rate and applies adjustments based on risk factors, ensuring fair and 
                          transparent lending decisions while maintaining financial sustainability for both borrower and lender.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

