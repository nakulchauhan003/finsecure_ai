import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, Sliders, Download, HelpCircle, FileText } from 'lucide-react';

// Types
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

const mockPrediction: LoanPrediction = {
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

// Color palette
const colors = {
  negative: "#e74c3c",
  positive: "#2ecc71",
  neutral: "#3498db",
  background: "#f8fafc",
  lightBorder: "#e2e8f0",
  text: "#334155",
  heading: "#1e293b"
};

export default function LoanPredictionXAI() {
  const [prediction, setPrediction] = useState<LoanPrediction | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("shap");
  
  useEffect(() => {
    // In a real app, this would fetch from an API
    setPrediction(mockPrediction);
  }, []);

  if (!prediction) {
    return <div className="flex items-center justify-center h-screen">Loading prediction data...</div>;
  }

  // Sort features by absolute impact value (most influential first)
  const sortedFeatures = [...prediction.features].sort((a, b) => 
    Math.abs(b.impact) - Math.abs(a.impact)
  );

  // Prepare data for the impact chart
  const impactData = sortedFeatures.map(feature => ({
    name: feature.feature,
    impact: feature.impact,
    fill: feature.impact >= 0 ? colors.positive : colors.negative
  }));

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Loan Prediction Explainability Dashboard</h1>
              <p className="text-gray-600">Understanding why AI made this decision</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md flex items-center">
                <Download size={16} className="mr-2" />
                Export Report
              </button>
              <button className="bg-gray-100 p-2 rounded-full">
                <HelpCircle size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Decision summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Loan Application</h2>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer ID</span>
                  <span className="font-medium">{prediction.customerId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer Name</span>
                  <span className="font-medium">{prediction.customerName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Loan Amount</span>
                  <span className="font-medium">₹{prediction.loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Application Date</span>
                  <span className="font-medium">{prediction.applicationDate}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full mr-4 ${prediction.approved ? 'bg-green-100' : 'bg-red-100'}`}>
                    {prediction.approved ? 
                      <CheckCircle size={24} className="text-green-600" /> : 
                      <AlertCircle size={24} className="text-red-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {prediction.approved ? 'Loan Approved' : 'Loan Not Approved'}
                    </h3>
                    <p className="text-gray-600">
                      {prediction.approved 
                        ? `Approval probability: ${Math.round(prediction.probability * 100)}%` 
                        : `Approval probability: ${Math.round(prediction.probability * 100)}%`}
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                  <div className="flex">
                    <Info size={20} className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                    <p className="text-blue-700 text-sm">
                      Model confidence: {Math.round(prediction.modelConfidence * 100)}%. 
                      This indicates how certain the AI is about its prediction based on the provided data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Key factors summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Key Decision Factors</h2>
                <button className="text-blue-600 text-sm font-medium" onClick={() => setExpanded(!expanded)}>
                  {expanded ? (
                    <div className="flex items-center">
                      <span>Show Less</span>
                      <ChevronUp size={16} className="ml-1" />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span>Show All</span>
                      <ChevronDown size={16} className="ml-1" />
                    </div>
                  )}
                </button>
              </div>
              
              <div className="space-y-3">
                {sortedFeatures.slice(0, expanded ? sortedFeatures.length : 4).map((feature, index) => (
                  <div key={index} className="p-3 border border-gray-100 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{feature.feature}</span>
                      <span className={`text-sm font-medium ${feature.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {feature.impact >= 0 ? '+' : ''}{(feature.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel - XAI visualizations */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 font-medium text-sm ${activeTab === 'shap' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('shap')}
                >
                  SHAP Values
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${activeTab === 'lime' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('lime')}
                >
                  LIME Explanation
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${activeTab === 'whatif' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('whatif')}
                >
                  What-If Analysis
                </button>
              </div>
              
              <div className="mt-6">
                {activeTab === 'shap' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Feature Impact on Decision (SHAP Values)</h3>
                      <div className="bg-gray-100 rounded-md p-1">
                        <Sliders size={16} className="text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="h-96 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={impactData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis 
                            type="number" 
                            domain={[
                              Math.min(-0.4, Math.floor(Math.min(...impactData.map(d => d.impact)) * 10) / 10),
                              Math.max(0.1, Math.ceil(Math.max(...impactData.map(d => d.impact)) * 10) / 10)
                            ]}
                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Impact']}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Legend />
                          <Bar dataKey="impact" name="Impact on Decision" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md mt-4">
                      <div className="flex items-start">
                        <Info size={20} className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-sm text-blue-700 mb-2">
                            <strong>How to read this chart:</strong> Bars to the right (positive values) indicate factors that 
                            improved the likelihood of loan approval. Bars to the left (negative values) indicate factors that 
                            decreased the likelihood of approval.
                          </p>
                          <p className="text-sm text-blue-700">
                            SHAP (SHapley Additive exPlanations) values show how each feature contributes to pushing the model 
                            prediction away from the baseline (average prediction).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'lime' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Local Interpretation (LIME)</h3>
                      <div className="bg-gray-100 rounded-md p-1">
                        <FileText size={16} className="text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-700 mb-4">
                        LIME creates a local surrogate model to explain individual predictions. The explanation 
                        shows how changes in feature values would affect this particular prediction.
                      </p>
                      
                      <div className="space-y-4">
                        {sortedFeatures.map((feature, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-md shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-800">{feature.feature}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                feature.impact >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {feature.impact >= 0 ? '+' : ''}{(feature.impact * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                            
                            {idx < 3 && (
                              <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700">
                                <span className="font-medium">LIME Insight:</span> {
                                  idx === 0 ? 
                                    "Most customers with Credit Score > 650 receive approval." :
                                  idx === 1 ? 
                                    "Income threshold of ₹35,000 significantly improves approval chances." :
                                    "Loans are rarely approved with 2+ late EMIs in history."
                                }
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'whatif' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">What-If Analysis</h3>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Beta Feature</span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Explore how changes to applicant data might affect the loan decision. Adjust key factors below to see the 
                      potential impact on approval probability.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="border border-gray-200 rounded-md p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Credit Score</h4>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">578</span>
                          <div className="flex-grow bg-gray-200 h-2 rounded-full">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                          </div>
                          <span className="text-sm text-gray-500 ml-2">850</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium text-gray-700">Target:</span> Improving to 650+ would significantly increase approval chances
                        </p>
                      </div>
                      
                      <div className="border border-gray-200 rounded-md p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Monthly Income</h4>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">₹25,500</span>
                          <div className="flex-grow bg-gray-200 h-2 rounded-full">
                            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <span className="text-sm text-gray-500 ml-2">₹50,000</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium text-gray-700">Target:</span> Income of ₹35,000+ would partially offset credit score concerns
                        </p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-md p-4 mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Potential Approval Scenarios</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-700">Current probability: 38%</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3">
                            <div className="bg-black h-4 w-1 ml-20"></div>
                          </div>
                          <span className="text-sm text-gray-700">If Credit Score → 650: 61%</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3">
                            <div className="bg-black h-4 w-1 ml-16"></div>
                          </div>
                          <span className="text-sm text-gray-700">If Monthly Income → ₹35,000: 52%</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-32 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mr-3">
                            <div className="bg-black h-4 w-1 ml-24"></div>
                          </div>
                          <span className="text-sm text-gray-700">If Both Improved: 78%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
                      <h4 className="font-medium text-green-800 mb-1">Recommended Actions</h4>
                      <ul className="text-sm text-green-700 list-disc pl-5 space-y-1">
                        <li>Work on improving credit score to at least 650</li>
                        <li>Consider applying for a smaller loan amount (₹8,00,000)</li>
                        <li>Provide additional income documentation or co-applicant</li>
                        <li>Ensure no missed payments for at least 6 months</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional information */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Regulatory & Compliance Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-md p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Fairness Analysis</h4>
                  <p className="text-sm text-gray-600">
                    This model has been tested for bias across protected attributes (gender, age, location). 
                    No statistically significant bias was detected.
                  </p>
                </div>
                
                <div className="border border-gray-100 rounded-md p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Model Information</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Algorithm Type:</span>
                      <span className="font-medium">Gradient Boosted Trees</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Features Used:</span>
                      <span className="font-medium">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-medium">April 12, 2025</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>
                  This explanation is provided in compliance with RBI guidelines on Responsible AI in financial services. 
                  For questions or concerns about this decision, please contact our customer service team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
