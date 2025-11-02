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
  Zap 
} from 'lucide-react';

function App() {
  const [formData, setFormData] = useState({
    creditScore: 300,
    monthlyIncome: '',
    existingEmis: '',
    loanAmount: '',
    employmentStability: '',
  });
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePredict = () => {
    setIsLoading(true);
    setPrediction(null);

    setTimeout(() => {
      const creditScore = parseFloat(formData.creditScore) || 300;
      const monthlyIncome = parseFloat(formData.monthlyIncome) || 0;
      const existingEmis = parseFloat(formData.existingEmis) || 0;
      const loanAmount = parseFloat(formData.loanAmount) || 0;
      const employmentStability = parseFloat(formData.employmentStability) || 0;
      
      const annualIncome = (monthlyIncome * 12) || 1; // Safeguard against division by zero
      const dtiRatio = (existingEmis * 12) / annualIncome;
      const monthlyRepaymentCapacity = monthlyIncome - existingEmis;

      let explanation = [];
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
    }, 1500);
  };
  
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      value = 0;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCreditScoreColor = (score) => {
    if (score >= 780) return 'text-green-400';
    if (score >= 720) return 'text-blue-400';
    if (score >= 650) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCreditScoreLabel = (score) => {
    if (score >= 780) return 'Excellent';
    if (score >= 720) return 'Good';
    if (score >= 650) return 'Moderate';
    return 'High Risk';
  };

  const calculateEMI = (principal, annualRate, termInMonths) => {
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

