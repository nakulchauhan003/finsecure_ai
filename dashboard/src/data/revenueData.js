// Enhanced Mock data for SaaS Revenue Intelligence Module

// ✅ Module 1: Revenue Data Collection Layer
export const revenueMetrics = {
  mrr: 485000,
  previousMrr: 465000,
  arr: 5820000, // ARR = MRR × 12
  revenueLeakage: 32500,
  churnRate: 4.2,
  paymentFailureRate: 2.8,
  averageCustomerLifetimeValue: 12500,
  totalCustomers: 1247,
  activeSubscriptions: 1189,
  // New metrics for enhanced intelligence
  netInterestMargin: 3.8, // NIM percentage
  defaultRatio: 2.1, // Default rate percentage
  profitabilityIndex: 87.5, // 0-100 scale
  loanPortfolioStabilityScore: 82, // 0-100 scale
  financialHealthScore: 85.3, // Overall bank health (0-100)
  emiConsistencyScore: 91.2, // Payment regularity score
  totalLoanDisbursed: 12500000,
  totalInterestEarned: 475000,
  totalLateFees: 23500,
  totalDefaults: 262500,
  outstandingDues: 1850000,
  recoveredRevenue: 145000
};

// ✅ Module 3: ML-Based Revenue Forecasting Data
export const revenueForecastData = [
  { month: 'Jan', actual: 420000, predicted: 425000, confidence: 92 },
  { month: 'Feb', actual: 435000, predicted: 438000, confidence: 89 },
  { month: 'Mar', actual: 445000, predicted: 442000, confidence: 91 },
  { month: 'Apr', actual: 455000, predicted: 458000, confidence: 94 },
  { month: 'May', actual: 465000, predicted: 462000, confidence: 93 },
  { month: 'Jun', actual: 485000, predicted: 487000, confidence: 95 },
  { month: 'Jul', predicted: 502000, confidence: 88 }, // Future predictions
  { month: 'Aug', predicted: 518000, confidence: 85 },
  { month: 'Sep', predicted: 534000, confidence: 82 },
  { month: 'Oct', predicted: 548000, confidence: 79 },
  { month: 'Nov', predicted: 562000, confidence: 76 },
  { month: 'Dec', predicted: 580000, confidence: 73 }
];

export const monthlyRevenueData = [
  { month: 'Jan', mrr: 420000, leakage: 28000, recovered: 15000, defaults: 12000, emiInflow: 405000 },
  { month: 'Feb', mrr: 435000, leakage: 31000, recovered: 18000, defaults: 15000, emiInflow: 418000 },
  { month: 'Mar', mrr: 445000, leakage: 29000, recovered: 22000, defaults: 14000, emiInflow: 428000 },
  { month: 'Apr', mrr: 455000, leakage: 35000, recovered: 19000, defaults: 18000, emiInflow: 438000 },
  { month: 'May', mrr: 465000, leakage: 33000, recovered: 25000, defaults: 16000, emiInflow: 451000 },
  { month: 'Jun', mrr: 485000, leakage: 32500, recovered: 28000, defaults: 17000, emiInflow: 470000 }
];

// ✅ Module 4: Loan Portfolio Forecasting
export const loanPortfolioForecast = {
  currentActiveLoans: 1189,
  predictedActiveLoans: [
    { month: 'Jul', active: 1205, new: 38, closed: 22, defaulted: 8 },
    { month: 'Aug', active: 1228, new: 42, closed: 19, defaulted: 7 },
    { month: 'Sep', active: 1255, new: 45, closed: 18, defaulted: 9 },
    { month: 'Oct', active: 1278, new: 41, closed: 21, defaulted: 6 },
    { month: 'Nov', active: 1298, new: 39, closed: 20, defaulted: 8 },
    { month: 'Dec', active: 1320, new: 44, closed: 22, defaulted: 7 }
  ],
  loanTypePerformance: [
    { type: 'Home Loan', avgProfit: 125000, riskScore: 15, count: 345 },
    { type: 'Personal Loan', avgProfit: 45000, riskScore: 38, count: 542 },
    { type: 'Vehicle Loan', avgProfit: 32000, riskScore: 22, count: 218 },
    { type: 'Business Loan', avgProfit: 185000, riskScore: 42, count: 84 }
  ],
  customerSegmentRisk: [
    { segment: 'Premium (Score 800+)', count: 234, defaultRate: 0.5, avgLTV: 25000 },
    { segment: 'Good (Score 700-799)', count: 456, defaultRate: 1.2, avgLTV: 18000 },
    { segment: 'Fair (Score 650-699)', count: 312, defaultRate: 3.8, avgLTV: 12000 },
    { segment: 'Risk (Score <650)', count: 187, defaultRate: 8.5, avgLTV: 6500 }
  ]
};

export const paymentFailures = [
  { date: '2024-08-28', customer: 'TechCorp Inc', amount: 5500, reason: 'Expired card', status: 'Pending' },
  { date: '2024-08-27', customer: 'DataFlow LLC', amount: 3200, reason: 'Insufficient funds', status: 'Recovered' },
  { date: '2024-08-26', customer: 'CloudSync Pro', amount: 1800, reason: 'Declined', status: 'Failed' },
  { date: '2024-08-25', customer: 'AutoScale Inc', amount: 4500, reason: 'Bank error', status: 'Recovered' },
  { date: '2024-08-24', customer: 'DevTools Co', amount: 2700, reason: 'Expired card', status: 'Pending' }
];

export const usagePatterns = [
  { customer: 'TechCorp Inc', currentUsage: 45, previousUsage: 78, trend: -42.3, plan: 'Enterprise' },
  { customer: 'StartupXYZ', currentUsage: 23, previousUsage: 25, trend: -8.0, plan: 'Professional' },
  { customer: 'Enterprise Ltd', currentUsage: 156, previousUsage: 145, trend: 7.6, plan: 'Enterprise Plus' },
  { customer: 'GrowthCo', currentUsage: 67, previousUsage: 89, trend: -24.7, plan: 'Professional' },
  { customer: 'ScaleTech', currentUsage: 98, previousUsage: 102, trend: -3.9, plan: 'Enterprise' }
];

export const billingAnomalies = [
  { id: 'A001', type: 'Duplicate Charge', customer: 'TechCorp Inc', amount: 5500, severity: 'High', detected: '2024-08-28' },
  { id: 'A002', type: 'Pricing Mismatch', customer: 'StartupXYZ', amount: 2200, severity: 'Medium', detected: '2024-08-27' },
  { id: 'A003', type: 'Failed Proration', customer: 'Enterprise Ltd', amount: 1200, severity: 'Low', detected: '2024-08-26' },
  { id: 'A004', type: 'Currency Error', customer: 'GrowthCo', amount: 3400, severity: 'High', detected: '2024-08-25' },
  { id: 'A005', type: 'Tax Calculation', customer: 'ScaleTech', amount: 780, severity: 'Medium', detected: '2024-08-24' }
];

export const recoveryOpportunities = [
  {
    category: 'Payment Recovery',
    potential: 45000,
    actions: [
      'Implement smart retry logic for failed payments',
      'Update expired payment methods proactively',
      'Set up dunning management campaigns'
    ]
  },
  {
    category: 'Churn Prevention',
    potential: 78000,
    actions: [
      'Engage high-risk customers with success managers',
      'Offer usage optimization consultations',
      'Implement feature adoption campaigns'
    ]
  },
  {
    category: 'Billing Optimization',
    potential: 23000,
    actions: [
      'Fix pricing discrepancies',
      'Implement automated proration',
      'Resolve duplicate billing issues'
    ]
  },
  {
    category: 'Usage Optimization',
    potential: 34000,
    actions: [
      'Identify underutilized features',
      'Provide training for declining usage customers',
      'Optimize pricing tiers based on usage patterns'
    ]
  }
];

// ✅ Module 7: Financial Health Score Components
export const financialHealthComponents = {
  revenueStability: { score: 88, weight: 0.30, contribution: 26.4 },
  netInterestMargin: { score: 76, weight: 0.25, contribution: 19.0 },
  portfolioQuality: { score: 92, weight: 0.25, contribution: 23.0 },
  defaultRatio: { score: 85, weight: 0.20, contribution: 17.0 },
  // Overall score: 85.4
  trends: [
    { month: 'Jan', score: 78.2 },
    { month: 'Feb', score: 80.5 },
    { month: 'Mar', score: 82.1 },
    { month: 'Apr', score: 83.7 },
    { month: 'May', score: 84.8 },
    { month: 'Jun', score: 85.4 }
  ]
};

// ✅ Module 2: Feature Engineering Layer
export const engineeredFeatures = {
  mrr: revenueMetrics.mrr,
  arr: revenueMetrics.arr,
  averageLTV: revenueMetrics.averageCustomerLifetimeValue,
  churnProbability: revenueMetrics.churnRate / 100,
  profitabilityIndex: revenueMetrics.profitabilityIndex,
  portfolioStability: revenueMetrics.loanPortfolioStabilityScore,
  nim: revenueMetrics.netInterestMargin,
  defaultRatio: revenueMetrics.defaultRatio,
  emiConsistency: revenueMetrics.emiConsistencyScore,
  // Derived metrics
  revenueGrowthRate: ((revenueMetrics.mrr - revenueMetrics.previousMrr) / revenueMetrics.previousMrr * 100).toFixed(2),
  customerAcquisitionCost: 2500, // Avg cost to acquire a customer
  ltvToCacRatio: (revenueMetrics.averageCustomerLifetimeValue / 2500).toFixed(2),
  grossMargin: 68.5, // Percentage
  netProfit: revenueMetrics.mrr * 0.35 // 35% net margin
};

// ✅ Module 6: Customer Churn Risk Prediction
export const churnRiskCustomers = [
  { id: 'L001', name: 'Rajesh Kumar', loanAmount: 550000, emiDelays: 2, riskScore: 85, reason: 'EMI delays pattern', daysToDefault: 15, churnProbability: 0.82 },
  { id: 'L002', name: 'Priya Sharma', loanAmount: 220000, emiDelays: 4, riskScore: 78, reason: 'Payment stress signals', daysToDefault: 8, churnProbability: 0.75 },
  { id: 'L003', name: 'Amit Patel', loanAmount: 1200000, emiDelays: 1, riskScore: 72, reason: 'Income fluctuation', daysToDefault: 22, churnProbability: 0.68 },
  { id: 'L004', name: 'Sneha Reddy', loanAmount: 340000, emiDelays: 3, riskScore: 69, reason: 'Repayment behavior change', daysToDefault: 30, churnProbability: 0.64 },
  { id: 'L005', name: 'Vikram Singh', loanAmount: 780000, emiDelays: 2, riskScore: 65, reason: 'DTI ratio increase', daysToDefault: 45, churnProbability: 0.59 }
];

export const churnPredictionData = [
  { riskLevel: 'Critical Risk (80-100)', count: 23, revenue: 127000, color: '#ef4444' },
  { riskLevel: 'High Risk (60-79)', count: 45, revenue: 198000, color: '#f97316' },
  { riskLevel: 'Medium Risk (40-59)', count: 78, revenue: 245000, color: '#eab308' },
  { riskLevel: 'Low Risk (0-39)', count: 1101, revenue: 2150000, color: '#22c55e' }
];

// Market Intelligence Data
export const marketIntelligence = {
  repoRate: 6.5,
  inflation: 4.2,
  competitorAvgRate: 9.2,
  marketGrowth: 12.5,
  regulatoryChanges: [
    { date: '2024-06-15', impact: 'Medium', description: 'RBI rate cut by 0.25%' },
    { date: '2024-05-01', impact: 'Low', description: 'New loan reporting norms' }
  ]
};