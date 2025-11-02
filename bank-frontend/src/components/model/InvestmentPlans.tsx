import { useState, useEffect, ReactNode } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, PieChart as PieIcon, Target, CheckCircle, Activity, DollarSign, Info, ArrowUpRight, Sparkles, Brain, Shield } from 'lucide-react';

// Mock data generator
interface UserProfile {
  name: string;
  income: number;
  savings: number;
  monthlyExpense: number;
  riskProfile: string;
  creditScore: number;
  loanHistory: string;
}

interface InvestmentPlan {
  id: number;
  name: string;
  type: string;
  risk: 'low'|'medium'|'high'|string;
  expectedReturn: number;
  minInvestment: number;
  duration: string;
  category: string;
  rating: number;
  aiConfidence: number;
  description: string;
}

interface CurrentInvestment {
  id: number;
  planName: string;
  amount: number;
  currentValue: number;
  returns: number;
  investedDate: string;
  status: string;
}

interface PortfolioPoint {
  month: string;
  value: number;
  returns: number;
}

interface RiskEntry {
  name: string;
  value: number;
  color: string;
}

interface DataShape {
  userProfile: UserProfile;
  investmentPlans: InvestmentPlan[];
  currentInvestments: CurrentInvestment[];
  portfolioPerformance: PortfolioPoint[];
  riskDistribution: RiskEntry[];
}

interface Insight {
  type: string;
  icon: ReactNode;
  title: string;
  message: string;
  confidence: number;
  priority: string;
}
const generateMockData = (): DataShape => {
  const userProfile = {
    name: "Alex Johnson",
    income: 75000,
    savings: 25000,
    monthlyExpense: 3500,
    riskProfile: "medium",
    creditScore: 720,
    loanHistory: "good"
  };

  const investmentPlans = [
    {
      id: 1,
      name: "Balanced Growth Fund",
      type: "Mutual Fund",
      risk: "medium",
      expectedReturn: 12.5,
      minInvestment: 5000,
      duration: "3-5 years",
      category: "Balanced",
      rating: 4.5,
      aiConfidence: 0.89,
      description: "Diversified portfolio with 60% equity and 40% debt"
    },
    {
      id: 2,
      name: "Equity Maximizer SIP",
      type: "SIP",
      risk: "high",
      expectedReturn: 18.2,
      minInvestment: 1000,
      duration: "5+ years",
      category: "Equity",
      rating: 4.2,
      aiConfidence: 0.72,
      description: "High-growth potential with large-cap stocks"
    },
    {
      id: 3,
      name: "Fixed Deposit Plus",
      type: "Fixed Deposit",
      risk: "low",
      expectedReturn: 7.5,
      minInvestment: 10000,
      duration: "1-3 years",
      category: "Debt",
      rating: 4.8,
      aiConfidence: 0.95,
      description: "Guaranteed returns with capital protection"
    },
    {
      id: 4,
      name: "Tax Saver ELSS",
      type: "Mutual Fund",
      risk: "medium",
      expectedReturn: 14.8,
      minInvestment: 500,
      duration: "3+ years",
      category: "Tax Saving",
      rating: 4.6,
      aiConfidence: 0.85,
      description: "Save tax under Section 80C with equity exposure"
    },
    {
      id: 5,
      name: "Debt Stabilizer",
      type: "Mutual Fund",
      risk: "low",
      expectedReturn: 8.2,
      minInvestment: 3000,
      duration: "1-2 years",
      category: "Debt",
      rating: 4.4,
      aiConfidence: 0.91,
      description: "Low volatility with steady income generation"
    },
    {
      id: 6,
      name: "Tech Innovation Fund",
      type: "Mutual Fund",
      risk: "high",
      expectedReturn: 22.5,
      minInvestment: 7500,
      duration: "5+ years",
      category: "Sectoral",
      rating: 4.0,
      aiConfidence: 0.68,
      description: "Focused on technology and innovation sectors"
    }
  ];

  const currentInvestments = [
    {
      id: 1,
      planName: "Balanced Growth Fund",
      amount: 15000,
      currentValue: 16850,
      returns: 12.33,
      investedDate: "2024-01-15",
      status: "active"
    },
    {
      id: 2,
      planName: "Fixed Deposit Plus",
      amount: 20000,
      currentValue: 21200,
      returns: 6.0,
      investedDate: "2023-10-20",
      status: "active"
    }
  ];

  const portfolioPerformance = [
    { month: 'Apr', value: 30000, returns: 0 },
    { month: 'May', value: 31200, returns: 4 },
    { month: 'Jun', value: 32500, returns: 8.33 },
    { month: 'Jul', value: 33800, returns: 12.67 },
    { month: 'Aug', value: 35500, returns: 18.33 },
    { month: 'Sep', value: 36200, returns: 20.67 },
    { month: 'Oct', value: 38050, returns: 26.83 }
  ];

  const riskDistribution = [
    { name: 'Low Risk', value: 20000, color: '#10b981' },
    { name: 'Medium Risk', value: 15000, color: '#f59e0b' },
    { name: 'High Risk', value: 3050, color: '#ef4444' }
  ];

  return {
    userProfile,
    investmentPlans,
    currentInvestments,
    portfolioPerformance,
    riskDistribution
  };
};

const InvestmentPlansDashboard = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [showInvestModal, setShowInvestModal] = useState<boolean>(false);
  const [data, setData] = useState<DataShape | null>(null);
  const [aiInsights, setAiInsights] = useState<Insight[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    // Simulate data loading
    const mockData = generateMockData();
    setData(mockData);
    
    // Generate AI insights
    const insights = [
      {
        type: 'recommendation',
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Portfolio Rebalancing Suggested',
        message: 'Your equity exposure is optimal. Consider adding 10% to debt funds for better stability.',
        confidence: 0.87,
        priority: 'medium'
      },
      {
        type: 'alert',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Strong Performance Detected',
        message: 'Your Balanced Growth Fund has outperformed market by 3.2% this quarter.',
        confidence: 0.95,
        priority: 'high'
      },
      {
        type: 'opportunity',
        icon: <Target className="w-5 h-5" />,
        title: 'SIP Increase Opportunity',
        message: 'Based on your income growth, you can increase SIP by ₹2,000/month.',
        confidence: 0.82,
        priority: 'low'
      }
    ];
    setAiInsights(insights as Insight[]);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Investment Dashboard...</div>
      </div>
    );
  }

  const totalInvested = data.currentInvestments.reduce((sum: number, inv: CurrentInvestment) => sum + inv.amount, 0);
  const totalCurrent = data.currentInvestments.reduce((sum: number, inv: CurrentInvestment) => sum + inv.currentValue, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnPercentage = ((totalReturns / totalInvested) * 100).toFixed(2);

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch(risk) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Activity className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const handleInvest = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setShowInvestModal(true);
  };

  const confirmInvestment = () => {
    // Use in-app confirmation message instead of blocking alert
    setShowInvestModal(false);
    const planName = selectedPlan && selectedPlan.name ? selectedPlan.name : '';
    const amountNum = Number(investmentAmount) || 0;
    setInvestmentAmount('');
    setSelectedPlan(null);
    // set temporary success message
    setSuccessMessage(`Investment of ₹${amountNum.toLocaleString()} in ${planName} processed`);
    // auto-clear after 4 seconds
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Success toast */}
        {successMessage && (
          <div className="fixed top-6 right-6 z-50 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg">
            <span className="sr-only">Success</span>
            {successMessage}
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">AI Investment Manager</h1>
              <p className="text-purple-300">Intelligent wealth building powered by machine learning</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 backdrop-blur-lg rounded-xl p-2">
          {['dashboard', 'recommendations', 'portfolio', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-green-300 text-sm">Total Invested</p>
                <p className="text-3xl font-bold text-white">₹{totalInvested.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                  <ArrowUpRight className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-blue-300 text-sm">Current Value</p>
                <p className="text-3xl font-bold text-white">₹{totalCurrent.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-purple-400" />
                  <span className="text-purple-400 text-sm font-semibold">+{returnPercentage}%</span>
                </div>
                <p className="text-purple-300 text-sm">Total Returns</p>
                <p className="text-3xl font-bold text-white">₹{totalReturns.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur-lg rounded-2xl p-6 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-amber-400" />
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-amber-300 text-sm">Risk Profile</p>
                <p className="text-3xl font-bold text-white capitalize">{data.userProfile.riskProfile}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Performance */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                  Portfolio Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.portfolioPerformance}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #8b5cf6', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Distribution */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <PieIcon className="w-6 h-6 text-purple-400" />
                  Risk Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                                      {data.riskDistribution.map((entry: RiskEntry, index: number) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #8b5cf6', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Investments */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Current Investments</h3>
              <div className="space-y-4">
                {data.currentInvestments.map((inv: CurrentInvestment) => (
                  <div key={inv.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{inv.planName}</h4>
                        <p className="text-sm text-purple-300">Invested on {new Date(inv.investedDate).toLocaleDateString()}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                        Active
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-400">Invested</p>
                        <p className="text-lg font-bold text-white">₹{inv.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Current Value</p>
                        <p className="text-lg font-bold text-white">₹{inv.currentValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Returns</p>
                        <p className="text-lg font-bold text-green-400">+{inv.returns.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">AI-Powered Recommendations</h3>
                  <p className="text-purple-300">Personalized investment plans based on your risk profile and financial goals</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.investmentPlans
                .filter((plan: InvestmentPlan) => plan.risk === data.userProfile.riskProfile || plan.aiConfidence > 0.8)
                .map((plan: InvestmentPlan) => (
                  <div key={plan.id} className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">{plan.name}</h4>
                        <p className="text-sm text-purple-300">{plan.type}</p>
                      </div>
                      <div className={`p-2 rounded-lg border ${getRiskColor(plan.risk)}`}>
                        {getRiskIcon(plan.risk)}
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4">{plan.description}</p>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Expected Return</span>
                        <span className="text-green-400 font-bold">{plan.expectedReturn}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Min Investment</span>
                        <span className="text-white font-semibold">₹{plan.minInvestment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Duration</span>
                        <span className="text-white font-semibold">{plan.duration}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">AI Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${plan.aiConfidence * 100}%` }}
                            />
                          </div>
                          <span className="text-purple-400 font-semibold text-sm">{(plan.aiConfidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInvest(plan)}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all group-hover:scale-[1.02]"
                    >
                      Invest Now
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6">Portfolio Analysis</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Asset Allocation</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.riskDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="name" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #8b5cf6', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {data.riskDistribution.map((entry: RiskEntry, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Returns Over Time</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.portfolioPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="month" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #8b5cf6', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="returns" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">AI Insights & Recommendations</h3>
                  <p className="text-purple-300">Real-time analysis and actionable insights from our AI engine</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {aiInsights.map((insight, index) => (
                <div key={index} className={`bg-white/5 backdrop-blur-lg rounded-2xl p-6 border transition-all hover:scale-[1.02] ${
                  insight.priority === 'high' ? 'border-green-500/50' :
                  insight.priority === 'medium' ? 'border-amber-500/50' :
                  'border-blue-500/50'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      insight.priority === 'high' ? 'bg-green-500/20 text-green-400' :
                      insight.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-white">{insight.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          insight.priority === 'high' ? 'bg-green-500/20 text-green-400' :
                          insight.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {insight.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{insight.message}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">AI Confidence:</span>
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${insight.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-purple-400 font-semibold text-sm">{(insight.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* User Profile Card */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Your Financial Profile</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Annual Income</p>
                  <p className="text-lg font-bold text-white">₹{data.userProfile.income.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Savings</p>
                  <p className="text-lg font-bold text-white">₹{data.userProfile.savings.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Credit Score</p>
                  <p className="text-lg font-bold text-green-400">{data.userProfile.creditScore}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Risk Profile</p>
                  <p className="text-lg font-bold text-purple-400 capitalize">{data.userProfile.riskProfile}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Investment Modal */}
        {showInvestModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full border-purple-500/30 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Invest in {selectedPlan.name}</h3>
                  <p className="text-gray-300">{selectedPlan.type}</p>
                </div>
                <button 
                  onClick={() => setShowInvestModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Expected Return</p>
                      <p className="text-lg font-bold text-green-400">{selectedPlan.expectedReturn}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Risk Level</p>
                      <p className="text-lg font-bold text-white capitalize">{selectedPlan.risk}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Min Investment</p>
                      <p className="text-lg font-bold text-white">₹{selectedPlan.minInvestment.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Duration</p>
                      <p className="text-lg font-bold text-white">{selectedPlan.duration}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Investment Amount (₹)</label>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder={`Min: ${selectedPlan.minInvestment}`}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {investmentAmount && parseFloat(investmentAmount) >= selectedPlan.minInvestment && (
                  <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-4">
                    <p className="text-sm text-purple-300 mb-2">Projected Returns</p>
                    <p className="text-2xl font-bold text-white">
                      ₹{(parseFloat(investmentAmount) * (1 + selectedPlan.expectedReturn / 100)).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </p>
                    <p className="text-sm text-green-400 mt-1">
                      +₹{(parseFloat(investmentAmount) * (selectedPlan.expectedReturn / 100)).toLocaleString(undefined, {maximumFractionDigits: 0})} estimated gain
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInvestModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInvestment}
                  disabled={!investmentAmount || parseFloat(investmentAmount) < selectedPlan.minInvestment}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Investment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentPlansDashboard;