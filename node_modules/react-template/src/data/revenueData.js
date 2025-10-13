// Mock data for Subscription Revenue Leakage Detection System

export const revenueMetrics = {
  mrr: 485000,
  previousMrr: 465000,
  revenueLeakage: 32500,
  churnRate: 4.2,
  paymentFailureRate: 2.8,
  averageCustomerLifetimeValue: 12500,
  totalCustomers: 1247,
  activeSubscriptions: 1189
};

export const monthlyRevenueData = [
  { month: 'Jan', mrr: 420000, leakage: 28000, recovered: 15000 },
  { month: 'Feb', mrr: 435000, leakage: 31000, recovered: 18000 },
  { month: 'Mar', mrr: 445000, leakage: 29000, recovered: 22000 },
  { month: 'Apr', mrr: 455000, leakage: 35000, recovered: 19000 },
  { month: 'May', mrr: 465000, leakage: 33000, recovered: 25000 },
  { month: 'Jun', mrr: 485000, leakage: 32500, recovered: 28000 }
];

export const churnRiskCustomers = [
  { id: 'C001', name: 'TechCorp Inc', mrr: 5500, riskScore: 85, reason: 'Declining usage', daysToChurn: 15 },
  { id: 'C002', name: 'StartupXYZ', mrr: 2200, riskScore: 78, reason: 'Payment issues', daysToChurn: 8 },
  { id: 'C003', name: 'Enterprise Ltd', mrr: 12000, riskScore: 72, reason: 'Support tickets', daysToChurn: 22 },
  { id: 'C004', name: 'GrowthCo', mrr: 3400, riskScore: 69, reason: 'Feature requests', daysToChurn: 30 },
  { id: 'C005', name: 'ScaleTech', mrr: 7800, riskScore: 65, reason: 'Usage plateau', daysToChurn: 45 }
];

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

export const churnPredictionData = [
  { riskLevel: 'High Risk (80-100)', count: 23, revenue: 127000 },
  { riskLevel: 'Medium Risk (60-79)', count: 45, revenue: 198000 },
  { riskLevel: 'Low Risk (40-59)', count: 78, revenue: 245000 },
  { riskLevel: 'Safe (0-39)', count: 1101, revenue: 2150000 }
];