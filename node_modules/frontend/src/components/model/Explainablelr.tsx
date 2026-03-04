import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Brain, CheckCircle, XCircle, User, Info, ChevronDown, ChevronUp, 
  Sliders, Download, HelpCircle, BarChart3, FileText, Target, 
  Lightbulb, Scale, Lock, ArrowRight, Eye, ChevronLeft, ChevronRight,
  Shield, Sparkles
} from 'lucide-react';
import { explainLoanDecision, AILoanExplanation } from '../../utils/gemini';

type FeatureImpact = {
  feature: string;
  impact: number;
  description: string;
};

type LoanPrediction = {
  approved: boolean;
  probability: number;
  features: FeatureImpact[];
  customerId: string;
  customerName: string;
  loanAmount: number;
  applicationDate: string;
  modelConfidence: number;
};

// --- Mock Data ---

const mockPrediction1: LoanPrediction = {
  approved: false,
  probability: 0.38,
  features: [
    { feature: "Credit Score", impact: -0.35, description: "Credit Score too low (578)" },
    { feature: "Monthly Income", impact: -0.22, description: "Monthly Income below ₹30,000 (₹25,500)" },
    { feature: "Payment History", impact: -0.18, description: "Loan repayment history shows 2 late EMIs" },
    { feature: "Loan Amount", impact: -0.12, description: "Requested loan amount (₹12,50,000) high relative to income" },
    { feature: "Existing Debt", impact: -0.08, description: "Existing debt-to-income ratio is 42%" },
    { feature: "Employment Duration", impact: 0.09, description: "Stable employment for 3+ years" },
    { feature: "Age", impact: 0.06, description: "Age bracket indicates lower risk" },
    { feature: "Account History", impact: 0.05, description: "Clean banking history" }
  ],
  customerId: "CUST78452",
  customerName: "Priya Sharma",
  loanAmount: 1250000,
  applicationDate: "2025-05-12",
  modelConfidence: 0.92
};

const mockPrediction2: LoanPrediction = {
  approved: true,
  probability: 0.85,
  features: [
    { feature: "Credit Score", impact: 0.40, description: "Excellent Credit Score (780)" },
    { feature: "Monthly Income", impact: 0.25, description: "High Monthly Income (₹1,20,000)" },
    { feature: "Employment Duration", impact: 0.15, description: "Long-term employment (8+ years)" },
    { feature: "Existing Debt", impact: 0.10, description: "Low debt-to-income ratio (15%)" },
    { feature: "Loan Amount", impact: -0.05, description: "Loan amount (₹20,00,000) is reasonable for income" },
    { feature: "Account History", impact: 0.03, description: "Long-standing banking relationship" }
  ],
  customerId: "CUST12345",
  customerName: "Rohan Gupta",
  loanAmount: 2000000,
  applicationDate: "2025-05-10",
  modelConfidence: 0.95
};

const mockPrediction3: LoanPrediction = {
  approved: true,
  probability: 0.58,
  features: [
    { feature: "Monthly Income", impact: 0.30, description: "Good Monthly Income (₹75,000)" },
    { feature: "Employment Duration", impact: 0.15, description: "Stable employment (5 years)" },
    { feature: "Account History", impact: 0.12, description: "Clean banking history" },
    { feature: "Payment History", impact: -0.05, description: "1 late EMI 6 months ago" },
    { feature: "Existing Debt", impact: -0.08, description: "Moderate debt-to-income ratio (35%)" },
    { feature: "Credit Score", impact: -0.10, description: "Average Credit Score (660)" }
  ],
  customerId: "CUST98765",
  customerName: "Anjali Singh",
  loanAmount: 1500000,
  applicationDate: "2025-05-11",
  modelConfidence: 0.88
};

const allMockPredictions = [mockPrediction1, mockPrediction2, mockPrediction3];

// --- Component ---

export default function LoanPredictionXAI() {
  const [predictions, setPredictions] = useState<LoanPrediction[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("shap");
  const [aiExplanation, setAiExplanation] = useState<AILoanExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setPredictions(allMockPredictions);
  }, []);

  // Reset tab and expansion when changing prediction
  useEffect(() => {
    setExpanded(false);
    setActiveTab('shap');
    setAiExplanation(null);
    // Fire Gemini AI explanation in background
    if (predictions[currentIndex]) {
      const pred = predictions[currentIndex];
      setAiLoading(true);
      explainLoanDecision({
        customerId: pred.customerId,
        customerName: pred.customerName,
        loanAmount: pred.loanAmount,
        approved: pred.approved,
        probability: pred.probability,
        modelConfidence: pred.modelConfidence,
        features: pred.features,
      }).then(result => setAiExplanation(result))
        .catch(err => console.error('AI loan explanation failed:', err))
        .finally(() => setAiLoading(false));
    }
  }, [currentIndex, predictions]);

  const prediction = predictions[currentIndex];

  if (predictions.length === 0 || !prediction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading prediction data...</div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(predictions.length - 1, prev + 1));
  };

  const sortedFeatures = [...prediction.features].sort((a, b) =>
    Math.abs(b.impact) - Math.abs(a.impact)
  );

  const impactData = sortedFeatures.map(feature => ({
    name: feature.feature,
    impact: feature.impact,
    fill: feature.impact >= 0 ? '#2ecc71' : '#e74c3c'
  }));

  const getDecisionColor = () => {
    if (prediction.probability >= 0.75) return 'green';
    if (prediction.probability >= 0.55) return 'yellow';
    if (prediction.probability >= 0.35) return 'orange';
    return 'red';
  };

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'from-green-500/30 to-emerald-500/30 border-green-400/50',
      yellow: 'from-yellow-500/30 to-amber-500/30 border-yellow-400/50',
      orange: 'from-orange-500/30 to-red-500/30 border-orange-400/50',
      red: 'from-red-500/30 to-rose-500/30 border-red-400/50'
    };
    return colors[color as keyof typeof colors] || colors.green;
  };

  const decisionColor = getDecisionColor();
  const DecisionIcon = prediction.approved ? CheckCircle : XCircle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Brain className="w-10 h-10 text-purple-400" />
                Explainable Loan Recommendation (XLR) System
              </h1>
              <p className="text-purple-300">AI-powered loan decisions with transparent SHAP-based explanations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2 border border-purple-400/50 transition-all">
                <Download size={16} />
                Export Report
              </button>
              <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg border border-white/20 transition-all">
                <HelpCircle size={20} className="text-purple-300" />
              </button>
            </div>
          </div>
        </div>

        {/* --- NEW NAVIGATION --- */}
        <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Select Application:</h2>
            <select
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="bg-purple-500/30 text-white p-2 rounded-lg border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ minWidth: '200px' }}
            >
              {predictions.map((pred, index) => (
                <option key={pred.customerId} value={index} className="bg-slate-800">
                  {pred.customerName} ({pred.customerId})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg border border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} className="text-purple-300" />
            </button>
            <span className="text-white font-medium w-16 text-center">
              {currentIndex + 1} / {predictions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === predictions.length - 1}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg border border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} className="text-purple-300" />
            </button>
          </div>
        </div>
        {/* --- END NEW NAVIGATION --- */}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Application Summary */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Customer Info Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-400" />
                Loan Application
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-purple-200">Customer ID</span>
                  <span className="font-medium text-white">{prediction.customerId}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-purple-200">Customer Name</span>
                  <span className="font-medium text-white">{prediction.customerName}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-purple-200">Loan Amount</span>
                  <span className="font-medium text-white">₹{prediction.loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-purple-200">Application Date</span>
                  <span className="font-medium text-white">{prediction.applicationDate}</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-6">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full mr-4 ${prediction.approved ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <DecisionIcon size={28} className={prediction.approved ? 'text-green-400' : 'text-red-400'} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-white">
                      {prediction.approved ? 'Loan Approved' : 'Loan Not Approved'}
                    </h3>
                    <p className="text-purple-300">
                      Approval probability: {Math.round(prediction.probability * 100)}%
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-500/20 border-l-4 border-blue-400 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-200 text-sm">
                      Model confidence: {Math.round(prediction.modelConfidence * 100)}%. 
                      This indicates how certain the AI is about its prediction based on the provided data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Key Decision Factors */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Target className="w-6 h-6 text-cyan-400" />
                  Key Decision Factors
                </h2>
                <button 
                  className="text-purple-300 text-sm font-medium hover:text-purple-200 transition-colors" 
                  onClick={() => setExpanded(!expanded)}
                >
                  <div className="flex items-center gap-1">
                    <span>{expanded ? 'Show Less' : 'Show All'}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
              </div>
              
              <div className="space-y-3">
                {sortedFeatures.slice(0, expanded ? sortedFeatures.length : 4).map((feature, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white">{feature.feature}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        feature.impact >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {feature.impact >= 0 ? '+' : ''}{(feature.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-purple-200 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - XAI Visualizations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Decision Summary Card */}
            <div className={`bg-gradient-to-br ${getColorClasses(decisionColor)} backdrop-blur-lg rounded-xl border p-8`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Loan Decision</h2>
                  <p className="text-white/80">{prediction.customerName} - AI Analysis Report</p>
                </div>
                <DecisionIcon className={`w-16 h-16 ${
                  decisionColor === 'green' ? 'text-green-400' : 
                  decisionColor === 'yellow' ? 'text-yellow-400' :
                  decisionColor === 'orange' ? 'text-orange-400' : 'text-red-400'
                }`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white/10 rounded-lg">
                  <p className="text-white/80 mb-2">Approval Probability</p>
                  <p className="text-5xl font-bold text-white">{Math.round(prediction.probability * 100)}%</p>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-lg">
                  <p className="text-white/80 mb-2">Model Confidence</p>
                  <p className="text-5xl font-bold text-white">{Math.round(prediction.modelConfidence * 100)}%</p>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <div className="flex border-b border-white/20 mb-6">
                <button
                  className={`px-4 py-2 font-medium text-sm transition-all ${
                    activeTab === 'shap' 
                      ? 'border-b-2 border-purple-400 text-purple-400' 
                      : 'text-purple-200 hover:text-purple-300'
                  }`}
                  onClick={() => setActiveTab('shap')}
                >
                  SHAP Values
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm transition-all ${
                    activeTab === 'lime' 
                      ? 'border-b-2 border-purple-400 text-purple-400' 
                      : 'text-purple-200 hover:text-purple-300'
                  }`}
                  onClick={() => setActiveTab('lime')}
                >
                  LIME Explanation
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm transition-all ${
                    activeTab === 'whatif' 
                      ? 'border-b-2 border-purple-400 text-purple-400' 
                      : 'text-purple-200 hover:text-purple-300'
                  }`}
                  onClick={() => setActiveTab('whatif')}
                >
                  What-If Analysis
                </button>
              </div>
              
              {/* SHAP Tab */}
              {activeTab === 'shap' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-purple-400" />
                      Feature Impact on Decision (SHAP Values)
                    </h3>
                    <Sliders size={20} className="text-purple-400" />
                  </div>
                  
                  <div className="h-96 mb-4 bg-white/5 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={impactData}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff20" />
                        <XAxis 
                          type="number" 
                          domain={[
                            Math.min(-0.4, Math.floor(Math.min(...impactData.map(d => d.impact)) * 10) / 10),
                            Math.max(0.1, Math.ceil(Math.max(...impactData.map(d => d.impact)) * 10) / 10)
                          ]}
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          stroke="#ffffff80"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#ffffff80"
                          style={{ fontSize: '12px' }}
                          width={120} // Ensure enough space for long feature names
                        />
                        <Tooltip 
                          formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Impact']}
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#ffffff'
                          }}
                        />
                        <Legend wrapperStyle={{ color: '#ffffff' }} />
                        <Bar dataKey="impact" name="Impact on Decision" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-blue-500/20 border-l-4 border-blue-400 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-200 mb-2">
                          <strong className="text-white">How to read this chart:</strong> Bars to the right (positive values) indicate factors that 
                          improved the likelihood of loan approval. Bars to the left (negative values) indicate factors that 
                          decreased the likelihood of approval.
                        </p>
                        <p className="text-sm text-blue-200">
                          SHAP (SHapley Additive exPlanations) values show how each feature contributes to pushing the model 
                          prediction away from the baseline (average prediction).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* LIME Tab */}
              {activeTab === 'lime' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <FileText className="w-6 h-6 text-purple-400" />
                      Local Interpretation (LIME)
                    </h3>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg mb-4">
                    <p className="text-purple-200 mb-4">
                      LIME creates a local surrogate model to explain individual predictions. The explanation 
                      shows how changes in feature values would affect this particular prediction.
                    </p>
                    
                    {/* This is a placeholder for a real LIME viz. We'll reuse the feature list for demo. */}
                    <div className="space-y-4">
                      {sortedFeatures.map((feature, idx) => (
                        <div key={idx} className="bg-white/10 p-4 rounded-lg border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white">{feature.feature}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              feature.impact >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {feature.impact >= 0 ? 'Supports' : 'Contradicts'} Decision
                            </span>
                          </div>
                          <p className="text-sm text-purple-200 mb-2">{feature.description}</p>
                          
                          {idx < 3 && (
                            <div className="mt-2 bg-blue-500/20 p-3 rounded-lg border border-blue-400/30">
                              <p className="text-xs text-blue-200">
                                <span className="font-medium text-blue-300">LIME Insight:</span> {
                                  feature.impact < 0 ? 
                                  `This feature's value strongly pushes the prediction towards "Not Approved".` :
                                  `This feature's value strongly pushes the prediction towards "Approved".`
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* What-If Tab */}
              {activeTab === 'whatif' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <Lightbulb className="w-6 h-6 text-yellow-400" />
                      What-If Analysis
                    </h3>
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full font-medium">Demo</span>
                  </div>
                  
                  <p className="text-purple-200 mb-6">
                    Explore how changes to applicant data might affect the loan decision. Adjust key factors below to see the 
                    potential impact on approval probability. (This is a static demo for {prediction.customerName}).
                  </p>
                  
                  {/* What-if content - This remains a static example per customer */}
                  {/* You would need a more complex state management and simulation logic for a real one */}
                  {prediction.customerId === 'CUST78452' ? (
                     <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
                            <h4 className="font-medium text-white mb-3">Credit Score</h4>
                            <div className="flex items-center mb-3">
                              <span className="text-sm text-purple-300 mr-2">578</span>
                              <div className="flex-grow bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-400 h-2 rounded-full" style={{ width: '40%' }}></div>
                              </div>
                              <span className="text-sm text-purple-300 ml-2">850</span>
                            </div>
                            <p className="text-sm text-purple-200">
                              <span className="font-medium text-white">Target:</span> Improving to 650+ would significantly increase approval chances
                            </p>
                          </div>
                          
                          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
                            <h4 className="font-medium text-white mb-3">Monthly Income</h4>
                            <div className="flex items-center mb-3">
                              <span className="text-sm text-purple-300 mr-2">₹25,500</span>
                              <div className="flex-grow bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                              </div>
                              <span className="text-sm text-purple-300 ml-2">₹50,000</span>
                            </div>
                            <p className="text-sm text-purple-200">
                              <span className="font-medium text-white">Target:</span> Income of ₹35,000+ would partially offset credit score concerns
                            </p>
                          </div>
                        </div>
                        
                        <div className="border border-white/20 rounded-lg p-5 mb-4 bg-white/5">
                          <h4 className="font-medium text-white mb-4">Potential Approval Scenarios</h4>
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3 relative">
                                <div className="absolute bg-white h-full w-0.5" style={{ left: '38%' }}></div>
                              </div>
                              <span className="text-sm text-white">Current probability: 38%</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3 relative">
                                <div className="absolute bg-white h-full w-0.5" style={{ left: '61%' }}></div>
                              </div>
                              <span className="text-sm text-white">If Credit Score → 650: 61%</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3 relative">
                                <div className="absolute bg-white h-full w-0.5" style={{ left: '52%' }}></div>
                              </div>
                              <span className="text-sm text-white">If Monthly Income → ₹35,000: 52%</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3 relative">
                                <div className="absolute bg-white h-full w-0.5" style={{ left: '78%' }}></div>
                              </div>
                              <span className="text-sm text-white">If Both Improved: 78%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-green-500/20 border-l-4 border-green-400 p-4 rounded-lg">
                          <h4 className="font-medium text-green-300 mb-2">Recommended Actions</h4>
                          <ul className="text-sm text-green-200 space-y-1.5">
                            <li className="flex items-start gap-2">
                              <ArrowRight size={16} className="mt-0.5 flex-shrink-0" />
                              <span>Work on improving credit score to at least 650</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <ArrowRight size={16} className="mt-0.5 flex-shrink-0" />
                              <span>Consider applying for a smaller loan amount (₹8,00,000)</span>
                            </li>
                          </ul>
                        </div>
                     </div>
                  ) : (
                    <div className="bg-blue-500/20 border-l-4 border-blue-400 p-4 rounded-lg">
                      <p className="text-blue-200 text-sm">
                        What-If Analysis demo is only configured for Priya Sharma's application (CUST78452).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gemini AI Explanation */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                Gemini AI Explanation
              </h3>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-purple-300 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Generating AI explanation for {prediction.customerName}...
                </div>
              ) : aiExplanation ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      aiExplanation.decision === 'Approved' ? 'bg-green-500/20 text-green-400' : 
                      aiExplanation.decision === 'Rejected' ? 'bg-red-500/20 text-red-400' : 
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      AI: {aiExplanation.decision} ({Math.round(aiExplanation.confidence * 100)}%)
                    </span>
                  </div>
                  <p className="text-purple-200 text-sm">{aiExplanation.narrativeExplanation}</p>
                  {aiExplanation.topFactors && aiExplanation.topFactors.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {aiExplanation.topFactors.slice(0, 4).map((f, i) => (
                        <div key={i} className={`text-xs px-3 py-2 rounded ${
                          f.impact >= 0 ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                        }`}>
                          <strong>{f.feature}</strong>: {f.explanation}
                        </div>
                      ))}
                    </div>
                  )}
                  {aiExplanation.whatIfSuggestions && aiExplanation.whatIfSuggestions.length > 0 && (
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
                      <p className="text-xs text-blue-300 font-semibold mb-1">AI What-If Suggestions:</p>
                      {aiExplanation.whatIfSuggestions.map((s, i) => (
                        <p key={i} className="text-xs text-blue-200 flex items-start gap-1">
                          <ArrowRight size={12} className="mt-0.5 flex-shrink-0" /> {s}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-purple-300 text-sm">AI explanation loading...</p>
              )}
            </div>

            {/* Regulatory & Compliance */}
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-lg rounded-xl border border-indigo-400/50 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-400" />
                Regulatory & Compliance Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-400" />
                    Fairness Analysis
                  </h4>
                  <p className="text-sm text-purple-200">
                    This model has been tested for bias across protected attributes. 
                    No statistically significant bias was detected.
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-purple-400" />
                    Model Information
                  </h4>
                  <div className="space-y-1 text-sm text-purple-200">
                    <div className="flex justify-between">
                      <span>Algorithm Type:</span>
                      <span className="font-medium text-white">Gradient Boosted Trees</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Features Used:</span>
                      <span className="font-medium text-white">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-medium text-white">April 12, 2025</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-purple-200 flex items-start gap-2">
                  <Eye size={16} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                  <span>
                    This explanation is provided in compliance with RBI guidelines on Responsible AI in financial services. 
                    For questions or concerns, please contact our customer service team.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}