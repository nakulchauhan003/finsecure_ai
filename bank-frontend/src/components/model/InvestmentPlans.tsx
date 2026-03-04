import { useState, useEffect, ReactNode, useMemo } from 'react';
// Import Alpha Vantage service
import { fetchLiveMarketData as fetchMarketStackData } from '../../services/marketstack';
import { chatWithAdvisor, getInvestmentAdvice } from '../../utils/gemini';
import { 
  Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, Activity, DollarSign, ArrowUpRight, Sparkles, 
  Brain, Shield, User, Calculator, Lock, 
  PieChart as PieIcon, Target, CheckCircle, Zap, Clock, Crown, 
  Landmark,
  MessageCircle 
} from 'lucide-react';

// --- Types ---

type InvestmentGoal = 'retirement' | 'short-term' | 'tax-saving' | 'wealth-creation' | 'child-education' | 'emergency-fund';

interface UserProfile {
  name: string;
  age: number;
  income: number;
  savings: number;
  monthlyExpense: number;
  goal: InvestmentGoal;
  riskAppetite: 'low' | 'medium' | 'high';
  investmentHorizon: number; // years
  creditScore?: number;
  loanHistory?: string;
}

interface AssetOption {
  id: number;
  name: string;
  type: 'mutual_fund' | 'stock' | 'sgb' | 'fixed_deposit' | 'bonds' | 'etf';
  category: 'Equity' | 'Debt' | 'Gold' | 'Hybrid' | 'Cash';
  risk: 'low' | 'medium' | 'high';
  expectedReturn: number;
  cagr: number;
  currentPrice: number;
  minInvestment: number;
  duration: string;
  volatility: number;
  description: string;
  aiReasoning: string;
  rating?: number;
  aiConfidence: number;
  sector?: string;
  historicalCAGR?: number;
}

interface CurrentInvestment {
  id: number;
  planId: number;
  planName: string;
  units: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedDate: string;
  type: string;
  category: string;
  taxLiability?: number;
}



interface Insight {
  type: string;
  icon: ReactNode;
  title: string;
  message: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface MarketStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}



interface LiveMarketData {
  stocks: MarketStockData[];
  indices: MarketStockData[];
  lastUpdated: string;
}

interface AIChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

// --- Mock Data Generators ---

const generateAssetOptions = (): AssetOption[] => [
  // Mutual Funds
  {
    id: 1,
    name: "Nifty 50 Index Fund",
    type: "mutual_fund",
    category: "Equity",
    risk: "medium",
    expectedReturn: 14.5,
    cagr: 12.5,
    currentPrice: 145.20,
    minInvestment: 500,
    duration: "5+ years",
    volatility: 15,
    description: "Tracks the top 50 companies. Good for long-term wealth creation.",
    aiReasoning: "Matches your long-term growth goal with moderate risk exposure to large-cap stocks.",
    rating: 4.5,
    aiConfidence: 0.89,
    historicalCAGR: 11.8
  },
  {
    id: 2,
    name: "Tax Saver ELSS Direct",
    type: "mutual_fund",
    category: "Equity",
    risk: "medium",
    expectedReturn: 16.0,
    cagr: 15.0,
    currentPrice: 89.45,
    minInvestment: 500,
    duration: "3+ years",
    volatility: 18,
    description: "Save tax under Section 80C with equity exposure. 3 year lock-in.",
    aiReasoning: "Essential for tax-saving goals while providing equity growth potential.",
    rating: 4.6,
    aiConfidence: 0.85,
    historicalCAGR: 13.5
  },
  {
    id: 3,
    name: "Corporate Bond Fund",
    type: "mutual_fund",
    category: "Debt",
    risk: "low",
    expectedReturn: 8.5,
    cagr: 7.8,
    currentPrice: 45.10,
    minInvestment: 1000,
    duration: "1-3 years",
    volatility: 3,
    description: "High quality debt papers providing stable returns better than FD.",
    aiReasoning: "Provides stability and regular income to your portfolio.",
    rating: 4.4,
    aiConfidence: 0.91,
    historicalCAGR: 7.2
  },
  {
    id: 4,
    name: "Balanced Advantage Fund",
    type: "mutual_fund",
    category: "Hybrid",
    risk: "medium",
    expectedReturn: 11.5,
    cagr: 10.2,
    currentPrice: 23.45,
    minInvestment: 1000,
    duration: "3-5 years",
    volatility: 12,
    description: "Dynamic asset allocation between equity and debt based on market valuation.",
    aiReasoning: "Automatically manages risk while participating in equity growth.",
    rating: 4.3,
    aiConfidence: 0.82,
    historicalCAGR: 9.8
  },

  // Stocks
  {
    id: 5,
    name: "Reliance Industries",
    type: "stock",
    category: "Equity",
    risk: "high",
    expectedReturn: 22.5,
    cagr: 18.2,
    currentPrice: 2450.00,
    minInvestment: 2450,
    duration: "5+ years",
    volatility: 25,
    description: "Large cap conglomerate with diversified business across energy, retail and telecom.",
    aiReasoning: "High growth potential but requires active tracking and higher risk tolerance.",
    rating: 4.3,
    aiConfidence: 0.75,
    sector: "Energy",
    historicalCAGR: 16.2
  },
  {
    id: 6,
    name: "Infosys Ltd",
    type: "stock",
    category: "Equity",
    risk: "medium",
    expectedReturn: 16.8,
    cagr: 14.5,
    currentPrice: 1650.00,
    minInvestment: 1650,
    duration: "3+ years",
    volatility: 20,
    description: "IT services giant with strong global presence and consistent dividend history.",
    aiReasoning: "Stable IT sector play with good dividend yield and growth prospects.",
    rating: 4.1,
    aiConfidence: 0.78,
    sector: "IT",
    historicalCAGR: 13.8
  },

  // Gold Bonds (SGB)
  {
    id: 7,
    name: "Sovereign Gold Bond 2024",
    type: "sgb",
    category: "Gold",
    risk: "low",
    expectedReturn: 9.5,
    cagr: 7.2,
    currentPrice: 6250,
    minInvestment: 6250,
    duration: "8 years",
    volatility: 8,
    description: "Government backed gold bonds with 2.5% annual interest and tax benefits on maturity.",
    aiReasoning: "Excellent hedge against inflation and market volatility with sovereign guarantee.",
    rating: 4.7,
    aiConfidence: 0.92,
    historicalCAGR: 6.8
  },

  // Fixed Deposits
  {
    id: 8,
    name: "Corporate Fixed Deposit",
    type: "fixed_deposit",
    category: "Debt",
    risk: "low",
    expectedReturn: 7.2,
    cagr: 7.2,
    currentPrice: 1000,
    minInvestment: 5000,
    duration: "1-5 years",
    volatility: 0,
    description: "Fixed returns from AAA rated corporate deposits with quarterly interest payouts.",
    aiReasoning: "Capital protection with guaranteed returns, suitable for risk-averse investors.",
    rating: 4.8,
    aiConfidence: 0.95,
    historicalCAGR: 7.0
  },
  {
    id: 9,
    name: "Bank Fixed Deposit",
    type: "fixed_deposit",
    category: "Debt",
    risk: "low",
    expectedReturn: 6.5,
    cagr: 6.5,
    currentPrice: 1000,
    minInvestment: 1000,
    duration: "1-10 years",
    volatility: 0,
    description: "Traditional bank FD with DICGC insurance up to ₹5 lakhs per bank.",
    aiReasoning: "Safest investment option with complete capital protection.",
    rating: 4.9,
    aiConfidence: 0.98,
    historicalCAGR: 6.2
  },

  // Bonds
  {
    id: 10,
    name: "Government Securities Fund",
    type: "bonds",
    category: "Debt",
    risk: "low",
    expectedReturn: 7.8,
    cagr: 7.1,
    currentPrice: 1250,
    minInvestment: 1000,
    duration: "3-7 years",
    volatility: 2,
    description: "Investment in government bonds with highest safety and regular income.",
    aiReasoning: "Sovereign guarantee makes this the safest debt instrument available.",
    rating: 4.6,
    aiConfidence: 0.94,
    historicalCAGR: 6.9
  }
];

const INITIAL_PORTFOLIO: CurrentInvestment[] = [
  { 
    id: 1, 
    planId: 1, 
    planName: "Nifty 50 Index Fund", 
    units: 100, 
    avgBuyPrice: 120, 
    currentPrice: 145.20, 
    investedDate: "2023-01-15", 
    type: "Mutual Fund",
    category: "Equity",
    taxLiability: 450
  },
  { 
    id: 2, 
    planId: 7, 
    planName: "Sovereign Gold Bond 2024", 
    units: 5, 
    avgBuyPrice: 5800, 
    currentPrice: 6250, 
    investedDate: "2023-06-20", 
    type: "SGB",
    category: "Gold",
    taxLiability: 320
  },
  { 
    id: 3, 
    planId: 9, 
    planName: "Bank Fixed Deposit", 
    units: 50000, 
    avgBuyPrice: 1, 
    currentPrice: 1, 
    investedDate: "2023-03-10", 
    type: "Fixed Deposit",
    category: "Debt",
    taxLiability: 1850
  },
];

// --- Main Component ---

const InvestmentPlansDashboard = () => {
  // --- State ---
  const [profileSetup, setProfileSetup] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '', 
    age: 25, 
    income: 0, 
    savings: 0,
    monthlyExpense: 0,
    goal: 'wealth-creation', 
    riskAppetite: 'medium', 
    investmentHorizon: 5
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [plans, setPlans] = useState<AssetOption[]>(generateAssetOptions());
  const [portfolio, setPortfolio] = useState<CurrentInvestment[]>(INITIAL_PORTFOLIO);
  const [aiInsights, setAiInsights] = useState<Insight[]>([]);
  
  // Modal State
  const [selectedPlan, setSelectedPlan] = useState<AssetOption | null>(null);
  const [investAmount, setInvestAmount] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [simulatedData, setSimulatedData] = useState<{ month: number; portfolio: number; bankSavings: number }[]>([]);
  const [liveData, setLiveData] = useState<LiveMarketData | null>(null);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState<boolean>(false);

  // AI Chat State
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState<string>('');
  

  // --- Effects ---

  // Live Market Simulation
  useEffect(() => {
    if (!profileSetup) return;

    const interval = setInterval(() => {
      const fluctuation = () => 1 + (Math.random() * 0.01 - 0.005);

      setPlans(prev => prev.map(p => ({ 
        ...p, 
        currentPrice: p.type === 'fixed_deposit' ? p.currentPrice : p.currentPrice * fluctuation() 
      })));
      
      setPortfolio(prev => prev.map(p => ({ 
        ...p, 
        currentPrice: p.type === 'Fixed Deposit' ? p.currentPrice : p.currentPrice * fluctuation() 
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [profileSetup]);

  // Load Live Data
  useEffect(() => {
    if (profileSetup) {
      fetchLiveMarketData();
    }
  }, [profileSetup]);

  // Generate AI Insights
  useEffect(() => {
    if (profileSetup) {
      const insights: Insight[] = [
        {
          type: 'recommendation',
          icon: <Sparkles className="w-5 h-5" />,
          title: 'Portfolio Rebalancing Suggested',
          message: 'Your equity exposure is optimal. Consider adding 15% to debt funds for better stability.',
          confidence: 0.87,
          priority: 'medium' as const,
          action: 'Rebalance Now'
        },
        {
          type: 'alert',
          icon: <TrendingUp className="w-5 h-5" />,
          title: 'Strong Performance Detected',
          message: 'Your Nifty 50 Index Fund has outperformed market by 3.2% this quarter.',
          confidence: 0.95,
          priority: 'high' as const,
          action: 'View Details'
        },
        {
          type: 'opportunity',
          icon: <Target className="w-5 h-5" />,
          title: 'SIP Increase Opportunity',
          message: 'Based on your income growth, you can increase SIP by ₹2,000/month.',
          confidence: 0.82,
          priority: 'low' as const,
          action: 'Increase SIP'
        },
        {
          type: 'warning',
          icon: <Shield className="w-5 h-5" />,
          title: 'Tax Saving Deadline Approaching',
          message: 'Consider ELSS funds to save up to ₹46,800 in taxes under Section 80C.',
          confidence: 0.91,
          priority: 'high' as const,
          action: 'Explore ELSS'
        }
      ];
      setAiInsights(insights);

      // Enhance with real Gemini AI insight
      getInvestmentAdvice({
        name: userProfile.name,
        age: userProfile.age,
        income: userProfile.income,
        savings: userProfile.savings,
        goal: userProfile.goal,
        riskAppetite: userProfile.riskAppetite,
        investmentHorizon: userProfile.investmentHorizon,
      }).then(advice => {
        const aiInsight: Insight = {
          type: 'ai-recommendation',
          icon: <Brain className="w-5 h-5" />,
          title: 'Gemini AI Portfolio Strategy',
          message: advice.recommendation + (advice.tips?.[0] ? ` Tip: ${advice.tips[0]}` : ''),
          confidence: 0.93,
          priority: 'high' as const,
          action: `Expected ${advice.expectedReturn}% return`
        };
        setAiInsights(prev => [aiInsight, ...prev]);
      }).catch(err => console.error('AI investment advice failed:', err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileSetup]);

  // --- Helper Functions ---

  const fetchLiveMarketData = async () => {
    setIsLoadingLiveData(true);
    try {
      // Use Alpha Vantage API service
      const liveData = await fetchMarketStackData();
      
      setLiveData({
        stocks: liveData.stocks,
        indices: liveData.indices,
        lastUpdated: liveData.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching live data from MarketStack:', error);
      // Fallback to mock data in case of API failure
      setLiveData({
        stocks: [
          { symbol: "RELIANCE.XBOM", price: 2450, change: 1.5, changePercent: 0.06, lastUpdated: new Date().toISOString() },
          { symbol: "TCS.XBOM", price: 3850, change: -0.8, changePercent: -0.02, lastUpdated: new Date().toISOString() },
          { symbol: "INFY.XBOM", price: 1650, change: 1.2, changePercent: 0.07, lastUpdated: new Date().toISOString() },
          { symbol: "HDFCBANK.XBOM", price: 1550, change: 0.7, changePercent: 0.04, lastUpdated: new Date().toISOString() },
          { symbol: "ICICIBANK.XBOM", price: 1050, change: -0.3, changePercent: -0.01, lastUpdated: new Date().toISOString() }
        ],
        indices: [
          { symbol: "BSE.BSESN", price: 72500, change: 0.5, changePercent: 0.01, lastUpdated: new Date().toISOString() },
          { symbol: "NSE.NIFTY50", price: 22500, change: 0.3, changePercent: 0.01, lastUpdated: new Date().toISOString() }
        ],
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  const calculateTotalValue = () => 
    portfolio.reduce((acc, curr) => acc + (curr.units * curr.currentPrice), 0);

  const calculateInvestedValue = () => 
    portfolio.reduce((acc, curr) => acc + (curr.units * curr.avgBuyPrice), 0);

  const generateSimulation = (amount: number, cagr: number, volatility: number) => {
    const data = [];
    let currentVal = amount;
    const monthlyRate = cagr / 100 / 12;
    
    for (let i = 0; i <= 60; i++) {
      const randomVar = 1 + ((Math.random() * volatility - (volatility/2)) / 1000);
      if (i > 0) currentVal = currentVal * (1 + monthlyRate) * randomVar;
      
      data.push({
        month: i,
        portfolio: Math.round(currentVal),
        bankSavings: Math.round(amount * Math.pow(1 + 0.04/12, i))
      });
    }
    setSimulatedData(data);
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch(type) {
      case 'mutual_fund': return <PieIcon className="w-4 h-4" />;
      case 'sgb': return <Crown className="w-4 h-4" />;
      case 'stock': return <Zap className="w-4 h-4" />;
      case 'fixed_deposit': return <Lock className="w-4 h-4" />;
      case 'bonds': return <Landmark className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const handleAIChat = async (message: string) => {
    const userMessageObj: AIChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessageObj]);
    setUserMessage('');

    try {
      const context = `User profile: ${userProfile.name}, age ${userProfile.age}, income ₹${userProfile.income}, risk appetite: ${userProfile.riskAppetite}, goal: ${userProfile.goal}, horizon: ${userProfile.investmentHorizon} years. Portfolio value: ₹${calculateTotalValue().toLocaleString()}.`;
      const response = await chatWithAdvisor(message, context);
      const aiResponse: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: response,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI chat failed:', err);
      const fallback: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: `Based on your profile (${userProfile.riskAppetite} risk, ${userProfile.goal} goal), I recommend considering a diversified portfolio. For your ₹${investAmount || 10000} investment, you could allocate:\n\n• 60% Equity Funds (Higher growth)\n• 30% Debt Funds (Stability)\n• 10% Gold (Hedge)\n\nThis aligns with your ${userProfile.investmentHorizon}-year horizon.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, fallback]);
    }
  };

  // --- Computed Values ---
  const totalValue = calculateTotalValue();
  const investedValue = calculateInvestedValue();
  const totalReturns = totalValue - investedValue;
  const returnsPercent = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0;

  const assetAllocation = useMemo(() => {
    const allocation = portfolio.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + (curr.units * curr.currentPrice);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(allocation).map(([name, value]) => ({
      name,
      value,
      color: name === 'Equity' ? '#8b5cf6' : name === 'Gold' ? '#f59e0b' : name === 'Debt' ? '#10b981' : '#ef4444'
    }));
  }, [portfolio]);

  const riskDistribution = useMemo(() => [
    { name: 'Low Risk', value: portfolio.filter(p => p.type === 'Fixed Deposit').reduce((sum, p) => sum + (p.units * p.currentPrice), 0), color: '#10b981' },
    { name: 'Medium Risk', value: portfolio.filter(p => p.type === 'Mutual Fund').reduce((sum, p) => sum + (p.units * p.currentPrice), 0), color: '#f59e0b' },
    { name: 'High Risk', value: portfolio.filter(p => p.type === 'Stock').reduce((sum, p) => sum + (p.units * p.currentPrice), 0), color: '#ef4444' }
  ], [portfolio]);

  // --- Profile Setup View ---
  if (!profileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl max-w-2xl w-full border border-purple-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Setup Your Investment Profile</h1>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 mb-2">Name</label>
                <input 
                  type="text" 
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-2">Age</label>
                <input 
                  type="number" 
                  value={userProfile.age}
                  onChange={(e) => setUserProfile({...userProfile, age: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-2">Annual Income (₹)</label>
                <input 
                  type="number" 
                  value={userProfile.income}
                  onChange={(e) => setUserProfile({...userProfile, income: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-2">Current Savings (₹)</label>
                <input 
                  type="number" 
                  value={userProfile.savings}
                  onChange={(e) => setUserProfile({...userProfile, savings: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Monthly Expenses (₹)</label>
              <input 
                type="number" 
                value={userProfile.monthlyExpense}
                onChange={(e) => setUserProfile({...userProfile, monthlyExpense: parseInt(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Investment Goal</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['retirement', 'wealth-creation', 'tax-saving', 'child-education', 'short-term', 'emergency-fund'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setUserProfile({...userProfile, goal: g as InvestmentGoal})}
                    className={`p-3 rounded-xl capitalize text-sm border transition-all ${
                      userProfile.goal === g 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent' 
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {g.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Risk Appetite</label>
              <div className="flex gap-4">
                {['low', 'medium', 'high'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserProfile({...userProfile, riskAppetite: r as 'low' | 'medium' | 'high'})}
                    className={`flex-1 p-4 rounded-xl capitalize border transition-all ${
                      userProfile.riskAppetite === r
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent' 
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Investment Horizon (Years)</label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={userProfile.investmentHorizon}
                onChange={(e) => setUserProfile({...userProfile, investmentHorizon: parseInt(e.target.value)})}
                className="w-full"
              />
              <div className="flex justify-between text-slate-400 text-sm">
                <span>1 Year</span>
                <span className="text-purple-400 font-semibold">{userProfile.investmentHorizon} Years</span>
                <span>30 Years</span>
              </div>
            </div>

            <button 
              onClick={() => setProfileSetup(true)}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all mt-4"
            >
              Generate Personalized Investment Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Investment Manager</h1>
              <p className="text-purple-300">Welcome back, {userProfile.name}! Optimized for your {userProfile.goal.replace('-', ' ')} goal</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-slate-300">Market Live</span>
            </div>
            <button onClick={() => setAiChatOpen(true)} className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button onClick={() => setProfileSetup(false)} className="p-3 bg-white/5 backdrop-blur-lg rounded-xl hover:bg-white/10 transition-all border border-white/10">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['dashboard', 'discover', 'portfolio', 'insights', 'simulate'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === tab 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20' 
                : 'bg-white/5 backdrop-blur-lg text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-green-300 text-sm">Total Invested</p>
                <p className="text-3xl font-bold text-white">₹{investedValue.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                  <ArrowUpRight className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-blue-300 text-sm">Current Value</p>
                <p className="text-3xl font-bold text-white">₹{totalValue.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-purple-400" />
                  <span className="text-purple-400 text-sm font-semibold">+{returnsPercent.toFixed(2)}%</span>
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
                <p className="text-3xl font-bold text-white capitalize">{userProfile.riskAppetite}</p>
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
                  <AreaChart data={simulatedData.length > 0 ? simulatedData.slice(0, 12) : Array.from({length: 12}, (_, i) => ({month: i, portfolio: totalValue * (1 + i * 0.02)}))}>
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
                    <Area type="monotone" dataKey="portfolio" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Distribution */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <PieIcon className="w-6 h-6 text-purple-400" />
                  Asset Allocation
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assetAllocation.map((entry, index) => (
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

            {/* Live Market Data */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Live Market Data
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  Last updated: {liveData ? new Date(liveData.lastUpdated).toLocaleTimeString() : 'Loading...'}
                  <button 
                    onClick={fetchLiveMarketData}
                    disabled={isLoadingLiveData}
                    className="ml-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {isLoadingLiveData ? 'Refreshing...' : 'Refresh'}
                  </button>
                  {liveData && (
                    <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                      Demo Data
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Popular Stocks */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-400" />
                    Popular Stocks
                  </h4>
                  <div className="space-y-2">
                    {liveData && liveData.stocks.length > 0 ? (
                      liveData.stocks.slice(0, 3).map((stock, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                          <div>
                            <p className="text-white text-sm font-medium">{stock.symbol}</p>
                            <p className="text-gray-400 text-xs">Price: ₹{stock.price.toFixed(2)}</p>
                          </div>
                          <span className={`text-sm font-semibold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <p>No stock data available - showing demo data instead</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Market Indices */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    Market Indices
                  </h4>
                  <div className="space-y-2">
                    {liveData && liveData.indices.length > 0 ? (
                      liveData.indices.slice(0, 3).map((index, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10">
                          <div>
                            <p className="text-white text-sm font-medium">{index.symbol}</p>
                            <p className="text-gray-400 text-xs">Price: ₹{index.price.toFixed(2)}</p>
                          </div>
                          <span className={`text-sm font-semibold ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <p>No index data available - showing demo data instead</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* More Stocks */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-400" />
                    More Stocks
                  </h4>
                  <div className="space-y-2">
                    {liveData && liveData.stocks.length > 3 ? (
                      liveData.stocks.slice(3, 6).map((stock, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                          <div>
                            <p className="text-white text-sm font-medium">{stock.symbol}</p>
                            <p className="text-gray-400 text-xs">₹{stock.price.toFixed(2)}</p>
                          </div>
                          <span className={`text-sm font-semibold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <p>No additional stock data - showing demo data instead</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Deposits */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    Fixed Deposits
                  </h4>
                  <div className="space-y-2">
                    {/* Fixed Deposits - Not available in MarketStack API */}
                    <div className="text-center py-4 text-gray-400">
                      <p>Fixed deposit data not available</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: DISCOVER */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* AI Recommendation */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">AI-Powered Recommendations</h3>
                  <p className="text-purple-300">
                    Based on your <span className="font-bold capitalize">{userProfile.riskAppetite}</span> risk profile and <span className="font-bold capitalize">{userProfile.goal.replace('-', ' ')}</span> goal
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans
                .filter(plan => {
                  if (userProfile.riskAppetite === 'low') return plan.risk === 'low';
                  if (userProfile.riskAppetite === 'medium') return plan.risk !== 'high';
                  return true; // high risk accepts all
                })
                .map((plan) => (
                <div key={plan.id} className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getRiskColor(plan.risk)}`}>
                        {getAssetTypeIcon(plan.type)}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">{plan.name}</h4>
                        <p className="text-sm text-purple-300 capitalize">{plan.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg border ${getRiskColor(plan.risk)}`}>
                      <Activity className="w-4 h-4" />
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
                      <span className="text-gray-400 text-sm">Historical CAGR</span>
                      <span className="text-blue-400 font-semibold">{plan.cagr}%</span>
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

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 mb-4">
                    <p className="text-xs text-purple-300 flex gap-2">
                      <Brain size={14} />
                      {plan.aiReasoning}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedPlan(plan);
                      setInvestAmount(plan.minInvestment);
                      generateSimulation(plan.minInvestment, plan.cagr, plan.volatility);
                      setShowModal(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                  >
                    Simulate & Invest
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Current Investments & Tax Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="p-4 font-medium">Investment</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium text-right">Invested</th>
                      <th className="p-4 font-medium text-right">Current Value</th>
                      <th className="p-4 font-medium text-right">Returns</th>
                      <th className="p-4 font-medium text-right">Est. Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => {
                      const currentValue = item.units * item.currentPrice;
                      const investedValue = item.units * item.avgBuyPrice;
                      const returns = currentValue - investedValue;
                      const returnsPercent = (returns / investedValue) * 100;

                      return (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div>
                              <p className="text-white font-semibold">{item.planName}</p>
                              <p className="text-slate-400 text-sm">{item.category}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs bg-white/10 px-2 py-1 rounded border border-white/20 capitalize">
                              {item.type.toLowerCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right text-white">₹{investedValue.toLocaleString()}</td>
                          <td className="p-4 text-right text-white font-mono">₹{Math.round(currentValue).toLocaleString()}</td>
                          <td className={`p-4 text-right font-bold ${returns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {returns >= 0 ? '+' : ''}₹{Math.round(returns).toLocaleString()} ({returnsPercent.toFixed(1)}%)
                          </td>
                          <td className="p-4 text-right text-amber-400 flex items-center justify-end gap-1">
                            <Calculator size={14} /> ₹{item.taxLiability}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Portfolio Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-4">Risk Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #8b5cf6', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-4">Performance Metrics</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sharpe Ratio</span>
                    <span className="text-green-400 font-bold">1.24</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Alpha</span>
                    <span className="text-blue-400 font-bold">2.15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Beta</span>
                    <span className="text-amber-400 font-bold">0.89</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max Drawdown</span>
                    <span className="text-red-400 font-bold">-8.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Volatility</span>
                    <span className="text-purple-400 font-bold">15.3%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INSIGHTS */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <p className="text-gray-300 mb-4">{insight.message}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">AI Confidence:</span>
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${insight.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-purple-400 font-semibold text-sm">{(insight.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {insight.action && (
                          <button className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors">
                            {insight.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Health Score */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Financial Health Score</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">82</span>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin"></div>
                  </div>
                  <p className="text-green-400 font-semibold mt-2">Excellent</p>
                </div>
                
                <div className="space-y-3 col-span-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Diversification</span>
                      <span className="text-green-400 text-sm">85%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Risk Management</span>
                      <span className="text-amber-400 text-sm">72%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Return Potential</span>
                      <span className="text-blue-400 text-sm">78%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Tax Efficiency</span>
                      <span className="text-purple-400 text-sm">65%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SIMULATE */}
        {activeTab === 'simulate' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Portfolio Simulation</h3>
                  <p className="text-purple-300">Test different investment strategies and see potential outcomes</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">Coming Soon</h4>
              <p className="text-gray-400">
                Advanced portfolio simulation tools are under development. This will include multi-asset portfolio testing, 
                scenario analysis, and Monte Carlo simulations for better investment planning.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Investment Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <div>
                <h2 className="text-2xl font-bold">{selectedPlan.name}</h2>
                <span className="text-purple-400 text-sm capitalize">{selectedPlan.type.replace('_', ' ')} • {selectedPlan.risk} risk</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">Close</button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Input Section */}
              <div className="bg-slate-950 p-4 rounded-xl">
                <label className="text-sm text-slate-400">Investment Amount</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="number" 
                      value={investAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setInvestAmount(val);
                        generateSimulation(val, selectedPlan.cagr, selectedPlan.volatility);
                      }}
                      min={selectedPlan.minInvestment}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Expected CAGR</p>
                    <p className="font-bold text-green-400 text-lg">{selectedPlan.cagr}%</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Minimum investment: ₹{selectedPlan.minInvestment.toLocaleString()}</p>
              </div>

              {/* Simulation Chart */}
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-purple-400"/> 5-Year Projection
                </h3>
                <div className="h-64 bg-slate-950 rounded-xl p-2 border border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulatedData}>
                      <defs>
                        <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#64748b" hide />
                      <YAxis stroke="#64748b" tickFormatter={(Val) => `₹${Val/1000}k`} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}} 
                        labelFormatter={(l) => `Month ${l}`}
                      />
                      <Area name="This Plan" type="monotone" dataKey="portfolio" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorSim)" />
                      <Line name="Bank Savings" type="monotone" dataKey="bankSavings" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  *Grey line represents standard 4% savings account returns for comparison
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 p-4 rounded-lg">
                   <span className="text-slate-400">Est. Maturity (5Y)</span>
                   <p className="text-xl font-bold text-white">
                     ₹{simulatedData.length > 0 ? simulatedData[simulatedData.length-1].portfolio.toLocaleString() : 0}
                   </p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                   <span className="text-slate-400">Total Profit</span>
                   <p className="text-xl font-bold text-green-400">
                     +₹{simulatedData.length > 0 ? (simulatedData[simulatedData.length-1].portfolio - investAmount).toLocaleString() : 0}
                   </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800">
              <button 
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                onClick={() => {
                  // Add investment logic here
                  setShowModal(false);
                  // setSuccessMessage(`Successfully invested ₹${investAmount.toLocaleString()} in ${selectedPlan.name}`);
                }}
              >
                Confirm Investment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {aiChatOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-bold text-white">AI Investment Advisor</h3>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="text-slate-400 hover:text-white">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.type === 'user' 
                      ? 'bg-purple-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-300 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && userMessage.trim() && handleAIChat(userMessage)}
                  placeholder="Ask about investments..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => userMessage.trim() && handleAIChat(userMessage)}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentPlansDashboard;