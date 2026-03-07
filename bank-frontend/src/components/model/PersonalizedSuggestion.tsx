import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  Sparkles, 
  Calculator,
  X,
  Target, // Added for competitor
  ShieldCheck, // Added for our offer
  FileText, // Added missing import
  User, // Added missing import
  Brain // Added missing import
} from 'lucide-react';
import { generateCounterOffer, AICounterOffer } from '../../utils/ai';

// Define types for our data structures
interface CustomerData {
  name: string;
  age: string;
  income: string;
  creditScore: string;
  existingDebt: string;
  loanType: string;
  loanAmount: string;
  tenure: string;
  competitorBankName: string;
  competitorRate: string;
}

interface RiskFactor {
  factor: string;
  impact: string;
  value: string;
}

interface RiskAnalysis {
  riskScore: string;
  category: string;
  baseRate: number;
  adjustment: number;
  finalRate: number;
  dtiRatio: string;
  factors: RiskFactor[];
}

interface OfferMetrics {
  emi: number;
  totalPayable: number;
  processingFee: number;
}

interface CompetitorOffer {
  name: string;
  rate: string;
  emi: number;
  totalPayable: number;
}

interface OurOffer {
  name: string;
  rate: string;
  strategy: string;
  emi: number;
  totalPayable: number;
}

interface ComparisonResult {
  riskAnalysis: RiskAnalysis;
  competitorOffer: CompetitorOffer;
  ourOffer: OurOffer;
  savings: number;
}

const PersonalizedRateComparison = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    age: '',
    income: '',
    creditScore: '',
    existingDebt: '',
    loanType: 'home',
    loanAmount: '',
    tenure: '5',
    // --- New fields for competitor offer ---
    competitorBankName: '',
    competitorRate: ''
  });
  
  // Renamed to 'comparisonResult' to reflect the new purpose
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiOffer, setAiOffer] = useState<AICounterOffer | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- Risk Analysis Logic (Unchanged) ---
  // This logic is still needed to assess the customer's risk for our bank
  const analyzeRisk = (data: CustomerData) => {
    const creditScore = parseInt(data.creditScore);
    const income = parseInt(data.income);
    const debt = parseInt(data.existingDebt);
    const age = parseInt(data.age);

    // Handle potential division by zero if income is 0 or empty
    const dtiRatio = (income > 0) ? (debt / income) * 100 : 100;
    
    let riskScore = 0;
    
    if (creditScore >= 750) riskScore += 0.1;
    else if (creditScore >= 650) riskScore += 0.3;
    else if (creditScore >= 550) riskScore += 0.6;
    else riskScore += 0.85;
    
    if (dtiRatio < 20) riskScore += 0.05;
    else if (dtiRatio < 40) riskScore += 0.2;
    else if (dtiRatio < 60) riskScore += 0.4;
    else riskScore += 0.6;
    
    if (income >= 100000) riskScore += 0.05;
    else if (income >= 50000) riskScore += 0.15;
    else riskScore += 0.3;
    
    if (age >= 30 && age <= 50) riskScore += 0.05;
    else riskScore += 0.1;

    riskScore = riskScore / 4;

    let category: string;
    let baseRate: number;
    let adjustment: number;
    
    if (riskScore < 0.35) {
      category = 'Low Risk';
      baseRate = 8.5;
      adjustment = -0.5;
    } else if (riskScore < 0.65) {
      category = 'Moderate Risk';
      baseRate = 8.5;
      adjustment = 0.5;
    } else {
      category = 'High Risk';
      baseRate = 8.5;
      adjustment = 2.0;
    }

    const finalRate = baseRate + adjustment;

    const factors: RiskFactor[] = [];
    if (creditScore >= 750) {
      factors.push({ factor: 'Excellent Credit Score', impact: 'positive', value: creditScore.toString() });
    } else if (creditScore < 550) {
      factors.push({ factor: 'Low Credit Score', impact: 'negative', value: creditScore.toString() });
    }
    
    if (dtiRatio < 30) {
      factors.push({ factor: 'Low Debt-to-Income Ratio', impact: 'positive', value: `${dtiRatio.toFixed(1)}%` });
    } else if (dtiRatio > 50) {
      factors.push({ factor: 'High Debt-to-Income Ratio', impact: 'negative', value: `${dtiRatio.toFixed(1)}%` });
    }
    
    if (income >= 100000) {
      factors.push({ factor: 'Strong Income Stability', impact: 'positive', value: `₹${income.toLocaleString()}` });
    } else if (income < 50000) {
      factors.push({ factor: 'Limited Income', impact: 'negative', value: `₹${income.toLocaleString()}` });
    }

    return {
      riskScore: (riskScore * 100).toFixed(0),
      category,
      baseRate,
      adjustment,
      finalRate,
      dtiRatio: dtiRatio.toFixed(1),
      factors
    };
  };

  // --- Helper function to calculate EMI and Total Payment ---
  const calculateOfferMetrics = (amountStr: string, tenureStr: string, rateStr: string): OfferMetrics => {
    const amount = parseFloat(amountStr);
    const years = parseFloat(tenureStr);
    const rate = parseFloat(rateStr);

    if (!amount || !years || !rate || rate <= 0) {
      return { emi: 0, totalPayable: 0, processingFee: 0 };
    }

    const monthlyRate = rate / 12 / 100;
    const numPayments = years * 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                (Math.pow(1 + monthlyRate, numPayments) - 1);
    const totalPayable = emi * numPayments;
    const processingFee = (amount * 0.5) / 100; // Our bank's standard 0.5% fee

    return {
      emi: Math.round(emi),
      totalPayable: Math.round(totalPayable),
      processingFee: Math.round(processingFee),
    };
  };

  // --- Handlers ---
  const handleSubmit = () => {
    setFormError(null);
    if (!customerData.name || !customerData.age || !customerData.income || 
        !customerData.creditScore || !customerData.existingDebt || !customerData.loanAmount ||
        !customerData.competitorBankName || !customerData.competitorRate // Validate new fields
    ) {
      setFormError('Please fill in all fields, including competitor details');
      return;
    }
     if (parseFloat(customerData.income) <= 0) {
      setFormError('Monthly Income must be greater than zero.');
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      // 1. Analyze the customer's risk profile first
      const riskAnalysis = analyzeRisk(customerData);
      
      const competitorRate = parseFloat(customerData.competitorRate);
      const ourStandardRate = riskAnalysis.finalRate;
      const { category } = riskAnalysis;

      let ourOfferedRate: number;
      let strategy: string;

      // 2. Determine our counter-offer strategy
      if (ourStandardRate < competitorRate) {
        ourOfferedRate = ourStandardRate;
        strategy = 'Standard rate is already lower. Offer standard rate.';
      } else if (category === 'Low Risk') {
        ourOfferedRate = competitorRate - 0.25;
        strategy = 'Aggressive Undercut: Offer 0.25% below competitor.';
      } else if (category === 'Moderate Risk') {
        ourOfferedRate = competitorRate - 0.10;
        strategy = 'Moderate Undercut: Offer 0.10% below competitor.';
      } else { // High Risk
        ourOfferedRate = ourStandardRate;
        strategy = 'High Risk: Cannot match. Offer standard rate.';
      }
      
      // Safety check: Don't offer a rate lower than our base rate allows
      if (ourOfferedRate < (riskAnalysis.baseRate - 1.0)) {
         ourOfferedRate = riskAnalysis.baseRate - 1.0;
         strategy = 'Competitor rate is too low. Offered our minimum possible rate.'
      }

      // 3. Calculate metrics for both offers
      const competitorMetrics = calculateOfferMetrics(
        customerData.loanAmount,
        customerData.tenure,
        competitorRate.toString()
      );

      const ourMetrics = calculateOfferMetrics(
        customerData.loanAmount,
        customerData.tenure,
        ourOfferedRate.toString()
      );

      // 4. Set the final comparison result
      setComparisonResult({
        riskAnalysis: riskAnalysis,
        competitorOffer: {
          name: customerData.competitorBankName,
          rate: competitorRate.toFixed(2),
          ...competitorMetrics
        },
        ourOffer: {
          name: 'Our Bank',
          rate: ourOfferedRate.toFixed(2),
          strategy: strategy,
          ...ourMetrics
        },
        savings: ourMetrics.totalPayable > 0 ? (competitorMetrics.totalPayable - ourMetrics.totalPayable) : 0
      });
      
      setLoading(false);
      setStep(2);

      // Fire AI AI counter-offer in background
      setAiLoading(true);
      setAiOffer(null);
      generateCounterOffer(
        { name: customerData.name, age: customerData.age, income: customerData.income, creditScore: customerData.creditScore, existingDebt: customerData.existingDebt, loanType: customerData.loanType, loanAmount: customerData.loanAmount, tenure: customerData.tenure },
        { bankName: customerData.competitorBankName, rate: customerData.competitorRate }
      ).then(result => {
        setAiOffer(result);
      }).catch(err => console.error('AI counter-offer failed:', err))
        .finally(() => setAiLoading(false));
    }, 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerData({
      ...customerData,
      [name]: value
    });
  };

  const resetForm = () => {
    setStep(1);
    setComparisonResult(null);
    setFormError(null);
    setAiOffer(null);
    // Reset competitor fields as well
    setCustomerData({
      ...customerData,
      competitorBankName: '',
      competitorRate: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- Header --- */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">
              AI-Powered Rate Comparison
            </h1>
          </div>
          <p className="text-blue-300 text-lg">Analyze competitor offers and generate winning counter-offers</p>
        </div>

        {/* --- Stepper --- */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
              1
            </div>
            <span className="font-medium hidden sm:inline">Profile & Competitor</span>
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-500' : 'bg-white/10'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
              2
            </div>
            <span className="font-medium hidden sm:inline">Analysis & Counter-Offer</span>
          </div>
        </div>

        {/* --- Step 1: Profile Form --- */}
        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-400" />
              Customer & Competitor Details
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- Customer Fields (Unchanged) --- */}
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={customerData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer's name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={customerData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Customer's age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Monthly Income (₹)</label>
                  <input
                    type="number"
                    name="income"
                    value={customerData.income}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Credit Score (300-850)</label>
                  <input
                    type="number"
                    name="creditScore"
                    value={customerData.creditScore}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="750"
                    min="300"
                    max="850"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Existing Monthly Debt (₹)</label>
                  <input
                    type="number"
                    name="existingDebt"
                    value={customerData.existingDebt}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Loan Type</label>
                  <select
                    name="loanType"
                    value={customerData.loanType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option className="text-black" value="home">Home Loan</option>
                    <option className="text-black" value="personal">Personal Loan</option>
                    <option className="text-black" value="vehicle">Vehicle Loan</option>
                    <option className="text-black" value="business">Business Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Loan Amount (₹)</label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={customerData.loanAmount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-2">Tenure (Years)</label>
                  <select
                    name="tenure"
                    value={customerData.tenure}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option className="text-black" value="1">1 Year</option>
                    <option className="text-black" value="2">2 Years</option>
                    <option className="text-black" value="3">3 Years</option>
                    <option className="text-black" value="4">4 Years</option>
                    <option className="text-black" value="5">5 Years</option>
                    <option className="text-black" value="6">6 Years</option>
                    <option className="text-black" value="7">7 Years</option>
                    <option className="text-black" value="8">8 Years</option>
                    <option className="text-black" value="9">9 Years</option>
                    <option className="text-black" value="10">10 Years</option>
                    <option className="text-black" value="11">11 Years</option>
                    <option className="text-black" value="12">12 Years</option>
                    <option className="text-black" value="13">13 Years</option>
                    <option className="text-black" value="14">14 Years</option>
                    <option className="text-black" value="15">15 Years</option>
                    <option className="text-black" value="16">16 Years</option>
                    <option className="text-black" value="17">17 Years</option>
                    <option className="text-black" value="18">18 Years</option>
                    <option className="text-black" value="19">19 Years</option>
                    <option className="text-black" value="20">20 Years</option>
                  </select>
                </div>

                {/* --- New Competitor Fields --- */}
                <div className="md:col-span-2 border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    Competitor Offer Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-300 mb-2">Competitor Bank Name</label>
                      <input
                        type="text"
                        name="competitorBankName"
                        value={customerData.competitorBankName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., HDFC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-300 mb-2">Competitor Rate (%)</label>
                      <input
                        type="number"
                        name="competitorRate"
                        value={customerData.competitorRate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 8.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="bg-red-500/20 text-red-300 p-4 rounded-xl flex items-center mt-4 border border-red-500/50">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {formError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/50 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing & Generating Counter-Offer...
                  </span>
                ) : (
                  'Analyze & Generate Counter-Offer'
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Step 2: Results --- */}
        {step === 2 && comparisonResult && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                Customer Risk Analysis
              </h2>

              {/* --- Stats Cards (Using riskAnalysis object) --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
                  <div className="text-sm text-gray-300 mb-2">Risk Score</div>
                  <div className="text-3xl font-bold text-purple-300">{comparisonResult.riskAnalysis.riskScore}%</div>
                  <div className="text-sm text-gray-400 mt-1">{comparisonResult.riskAnalysis.category}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
                  <div className="text-sm text-gray-300 mb-2">Our Standard Rate</div>
                  <div className="text-3xl font-bold text-cyan-300">{comparisonResult.riskAnalysis.finalRate}%</div>
                  <div className="text-sm text-gray-400 mt-1">Based on profile</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-6 border border-green-500/30">
                  <div className="text-sm text-gray-300 mb-2">Debt-to-Income</div>
                  <div className="text-3xl font-bold text-green-300">{comparisonResult.riskAnalysis.dtiRatio}%</div>
                  <div className="text-sm text-gray-400 mt-1">DTI Ratio</div>
                </div>
              </div>

              {/* --- Explainable AI (Using riskAnalysis object) --- */}
              <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Risk Profile Factors (Explainable AI)
                </h3>
                <div className="space-y-3">
                  {comparisonResult.riskAnalysis.factors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-3">
                      {factor.impact === 'positive' ? (
                        <TrendingDown className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`font-medium ${factor.impact === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                          {factor.factor}
                        </div>
                        <div className="text-sm text-gray-300">{factor.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- New Competitive Comparison Section --- */}
              <h3 className="text-xl font-bold text-white mb-4">Competitive Comparison & Counter-Offer</h3>
              
              {/* --- Strategy Recommendation --- */}
              <div className={`rounded-xl p-4 mb-6 border ${
                comparisonResult.savings > 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-yellow-500/20 border-yellow-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {comparisonResult.savings > 0 ? (
                     <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  ) : (
                     <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-semibold ${comparisonResult.savings > 0 ? 'text-green-300' : 'text-yellow-300'}`}>
                      Recommendation: {comparisonResult.ourOffer.strategy}
                    </h4>
                    {comparisonResult.savings > 0 ? (
                      <p className="text-white text-lg font-bold">
                        Our offer saves the customer ₹{comparisonResult.savings.toLocaleString()}!
                      </p>
                    ) : (
                      <p className="text-white text-lg font-bold">
                        Competitor offer is strong. We cannot match profitably.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* --- AI AI Counter-Offer Insight --- */}
              <div className="rounded-xl p-5 mb-6 border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI AI Strategy
                </h4>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-purple-300 text-sm">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Generating AI-powered counter-offer strategy...
                  </div>
                ) : aiOffer ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                        AI Rate: {aiOffer.suggestedRate}%
                      </span>
                      <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                        Strategy: {aiOffer.strategy}
                      </span>
                      <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                        Confidence: {aiOffer.confidenceLevel}%
                      </span>
                    </div>
                    <p className="text-purple-200 text-sm">{aiOffer.reasoning}</p>
                    <p className="text-purple-300 text-xs"><strong>Competitor Analysis:</strong> {aiOffer.competitorAnalysis}</p>
                    {aiOffer.savingsForCustomer > 0 && (
                      <p className="text-green-300 text-sm font-semibold">AI estimates ₹{aiOffer.savingsForCustomer.toLocaleString()} monthly savings for customer</p>
                    )}
                  </div>
                ) : (
                  <p className="text-purple-300 text-sm">AI analysis will appear after comparison</p>
                )}
              </div>

              {/* --- Side-by-Side Cards --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Competitor Offer Card */}
                <div className="border-2 border-white/10 rounded-xl p-6 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-400" />
                      {comparisonResult.competitorOffer.name}
                    </h4>
                    <span className="text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/50 px-2 py-1 rounded-full">
                      Competitor
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Interest Rate</div>
                      <div className="font-bold text-white text-2xl">{comparisonResult.competitorOffer.rate}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Monthly EMI</div>
                      <div className="font-bold text-white text-xl">₹{comparisonResult.competitorOffer.emi.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Total Payable</div>
                      <div className="font-bold text-red-300 text-xl">₹{comparisonResult.competitorOffer.totalPayable.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                {/* Our Offer Card */}
                <div className="border-2 border-blue-500 rounded-xl p-6 bg-blue-500/10 ring-2 ring-blue-500/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-green-400" />
                      {comparisonResult.ourOffer.name}
                    </h4>
                    <span className="text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/50 px-2 py-1 rounded-full">
                      Our Offer
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Interest Rate</div>
                      <div className="font-bold text-green-300 text-2xl">{comparisonResult.ourOffer.rate}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Monthly EMI</div>
                      <div className="font-bold text-white text-xl">₹{comparisonResult.ourOffer.emi.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Total Payable</div>
                      <div className="font-bold text-green-300 text-xl">₹{comparisonResult.ourOffer.totalPayable.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Explanation Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowDetailedExplanation(!showDetailedExplanation)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg flex items-center gap-3 hover:scale-105"
                >
                  <FileText className="w-6 h-6" />
                  {showDetailedExplanation ? 'Hide Detailed Explanation' : 'View Detailed Explanation'}
                </button>
              </div>

              {/* Detailed Explanation Section */}
              {showDetailedExplanation && (
                <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-lg rounded-xl border-2 border-blue-400/50 p-8 shadow-2xl animate-fadeIn">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-blue-400" />
                      Complete Comparison Analysis
                    </h3>
                    <button
                      onClick={() => setShowDetailedExplanation(false)}
                      className="text-blue-300 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Customer Profile */}
                    <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                      <h4 className="text-xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Customer Profile
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Name</p>
                          <p className="text-xl font-bold text-white">{customerData.name}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Age</p>
                          <p className="text-xl font-bold text-white">{customerData.age} years</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Credit Score</p>
                          <p className="text-xl font-bold text-white">{customerData.creditScore}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Monthly Income</p>
                          <p className="text-xl font-bold text-white">₹{parseInt(customerData.income).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Loan Amount</p>
                          <p className="text-xl font-bold text-white">₹{parseInt(customerData.loanAmount).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-blue-300 text-sm mb-1">Loan Type</p>
                          <p className="text-xl font-bold text-white capitalize">{customerData.loanType}</p>
                        </div>
                      </div>
                    </div>

                    {/* Strategy Explanation */}
                    <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                      <h4 className="text-xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        AI Counter-Offer Strategy
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 font-bold text-white">1</div>
                          <div className="flex-grow">
                            <p className="text-white font-medium mb-1">Analyzed Customer Risk Profile</p>
                            <p className="text-blue-200 text-sm">Risk Category: {comparisonResult.riskAnalysis.category} (Score: {comparisonResult.riskAnalysis.riskScore}%)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 font-bold text-white">2</div>
                          <div className="flex-grow">
                            <p className="text-white font-medium mb-1">Evaluated Competitor Offer</p>
                            <p className="text-blue-200 text-sm">{customerData.competitorBankName} offering {comparisonResult.competitorOffer.rate}% interest rate</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 font-bold text-white">3</div>
                          <div className="flex-grow">
                            <p className="text-white font-medium mb-1">Generated Counter-Offer</p>
                            <p className="text-blue-200 text-sm">Strategy: {comparisonResult.ourOffer.strategy}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 font-bold text-white">4</div>
                          <div className="flex-grow">
                            <p className="text-white font-medium mb-1">Calculated Savings</p>
                            <p className="text-blue-200 text-sm">Customer saves ₹{comparisonResult.savings.toLocaleString()} with our offer</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Comparison */}
                    <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                      <h4 className="text-xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Detailed Financial Comparison
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="p-3 text-blue-200">Metric</th>
                              <th className="p-3 text-blue-200 text-center">Competitor</th>
                              <th className="p-3 text-blue-200 text-center">Our Offer</th>
                              <th className="p-3 text-blue-200 text-center">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-white/10">
                              <td className="p-3 text-white">Interest Rate</td>
                              <td className="p-3 text-center text-red-300 font-bold">{comparisonResult.competitorOffer.rate}%</td>
                              <td className="p-3 text-center text-green-300 font-bold">{comparisonResult.ourOffer.rate}%</td>
                              <td className="p-3 text-center text-white">{(parseFloat(comparisonResult.competitorOffer.rate) - parseFloat(comparisonResult.ourOffer.rate)).toFixed(2)}%</td>
                            </tr>
                            <tr className="border-b border-white/10">
                              <td className="p-3 text-white">Monthly EMI</td>
                              <td className="p-3 text-center text-red-300">₹{comparisonResult.competitorOffer.emi.toLocaleString()}</td>
                              <td className="p-3 text-center text-green-300">₹{comparisonResult.ourOffer.emi.toLocaleString()}</td>
                              <td className="p-3 text-center text-white">₹{(comparisonResult.competitorOffer.emi - comparisonResult.ourOffer.emi).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="p-3 text-white">Total Payable</td>
                              <td className="p-3 text-center text-red-300">₹{comparisonResult.competitorOffer.totalPayable.toLocaleString()}</td>
                              <td className="p-3 text-center text-green-300">₹{comparisonResult.ourOffer.totalPayable.toLocaleString()}</td>
                              <td className="p-3 text-center text-green-400 font-bold">₹{comparisonResult.savings.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Model Information */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-6 border border-blue-400/50">
                      <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        About This AI System
                      </h4>
                      <p className="text-blue-200 leading-relaxed mb-3">
                        Our AI-powered rate comparison system analyzes competitor offers and automatically generates optimal counter-offers 
                        based on customer risk profile, market conditions, and strategic pricing rules.
                      </p>
                      <p className="text-blue-200 leading-relaxed">
                        The system uses dynamic pricing strategies: aggressive undercutting for low-risk customers, moderate matching for 
                        medium-risk profiles, and conservative pricing for high-risk applicants to ensure profitability.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Action Buttons --- */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={resetForm}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  New Analysis
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transform transition-all"
                >
                  Log Offer & Proceed
                </button>
              </div>
            </div>
            
            {/* --- Confirmation Modal --- */}
            {showModal && comparisonResult && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-white/10 max-w-lg w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Log Counter-Offer</h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-300">Logging the following counter-offer for customer: {customerData.name}</p>
                    <div className="bg-white/10 rounded-xl p-4 space-y-2 border border-white/10">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Bank:</span>
                        <span className="text-white font-semibold">{comparisonResult.ourOffer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Amount:</span>
                        <span className="text-white font-semibold">₹{parseInt(customerData.loanAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Offered Rate:</span>
                        <span className="text-green-300 font-semibold">{comparisonResult.ourOffer.rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">EMI:</span>
                        <span className="text-white font-semibold">₹{comparisonResult.ourOffer.emi.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Tenure:</span>
                        <span className="text-white font-semibold">{customerData.tenure} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Strategy:</span>
                        <span className="text-white font-semibold">{comparisonResult.ourOffer.strategy}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedRateComparison;