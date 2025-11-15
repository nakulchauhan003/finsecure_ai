import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { 
  revenueMetrics, 
  revenueForecastData, 
  monthlyRevenueData, 
  loanPortfolioForecast,
  churnRiskCustomers,
  churnPredictionData,
  financialHealthComponents,
  engineeredFeatures,
  marketIntelligence
} from '../data/revenueData';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, DollarSign, Users, Activity, Target, Brain, Zap, Award, BarChart3 } from 'lucide-react';

const RevenueIntelligence = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => `${value}%`;

  // Calculate Financial Health Score
  const calculateFinancialHealth = () => {
    const { revenueStability, netInterestMargin, portfolioQuality, defaultRatio } = financialHealthComponents;
    return (
      revenueStability.contribution +
      netInterestMargin.contribution +
      portfolioQuality.contribution +
      defaultRatio.contribution
    ).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Brain className="w-10 h-10 text-cyan-400" />
            SaaS Revenue Intelligence Module
          </h1>
          <p className="text-cyan-300 mt-2">AI-Powered Banking Analytics & Forecasting System</p>
        </div>
        <div className="text-sm text-cyan-300">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'forecast', label: 'ML Forecasting', icon: TrendingUp },
          { id: 'portfolio', label: 'Portfolio Analysis', icon: BarChart3 },
          { id: 'churn', label: 'Churn Prediction', icon: AlertTriangle },
          { id: 'health', label: 'Financial Health', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-cyan-300 hover:bg-white/20'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid - Module 1 & 2: Revenue Data Collection & Feature Engineering */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MRR Card */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-lg border border-cyan-400/30 p-6 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-cyan-300">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(revenueMetrics.mrr)}</p>
                  <p className="text-sm text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{engineeredFeatures.revenueGrowthRate}% from last month
                  </p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-cyan-200">ARR: {formatCurrency(revenueMetrics.arr)}</div>
            </div>

            {/* Financial Health Score - Module 7 */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg border border-green-400/30 p-6 rounded-xl shadow-lg hover:shadow-green-500/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-green-300">Financial Health Score</p>
                  <p className="text-3xl font-bold text-white">{calculateFinancialHealth()}/100</p>
                  <p className="text-sm text-green-400">Strong & Stable</p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-green-200">Profitability Index: {revenueMetrics.profitabilityIndex}</div>
            </div>

            {/* Portfolio Stability */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg border border-purple-400/30 p-6 rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-purple-300">Portfolio Stability</p>
                  <p className="text-3xl font-bold text-white">{revenueMetrics.loanPortfolioStabilityScore}/100</p>
                  <p className="text-sm text-purple-400">{loanPortfolioForecast.currentActiveLoans} Active Loans</p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Target className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-purple-200">NIM: {revenueMetrics.netInterestMargin}%</div>
            </div>

            {/* Churn Risk */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg border border-orange-400/30 p-6 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-orange-300">Churn Rate</p>
                  <p className="text-3xl font-bold text-white">{revenueMetrics.churnRate}%</p>
                  <p className="text-sm text-orange-400">{churnRiskCustomers.length} High Risk Customers</p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="text-xs text-orange-200">Default Ratio: {revenueMetrics.defaultRatio}%</div>
            </div>
          </div>

          {/* Engineered Features Dashboard - Module 2 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Feature Engineering Layer - SaaS Intelligence Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">LTV / CAC Ratio</p>
                <p className="text-2xl font-bold text-white">{engineeredFeatures.ltvToCacRatio}x</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">EMI Consistency</p>
                <p className="text-2xl font-bold text-white">{engineeredFeatures.emiConsistency}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Gross Margin</p>
                <p className="text-2xl font-bold text-white">{engineeredFeatures.grossMargin}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Net Profit</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(engineeredFeatures.netProfit)}</p>
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Collection & Leakage Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="#a5b4fc" />
                  <YAxis tickFormatter={(value) => `${value / 1000}K`} stroke="#a5b4fc" />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="mrr" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="MRR" />
                  <Area type="monotone" dataKey="leakage" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Leakage" />
                  <Area type="monotone" dataKey="recovered" stackId="3" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Recovered" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">EMI Inflow vs Defaults</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="#a5b4fc" />
                  <YAxis tickFormatter={(value) => `${value / 1000}K`} stroke="#a5b4fc" />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="emiInflow" fill="#10b981" name="EMI Inflow" />
                  <Bar dataKey="defaults" fill="#ef4444" name="Defaults" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ML Forecasting Tab - Module 3 */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-lg border border-indigo-400/30 p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Brain className="w-7 h-7 text-indigo-400" />
              AI-Powered Revenue Forecasting (ARIMA, Prophet, LSTM)
            </h2>
            <p className="text-indigo-200">Time-series prediction with confidence intervals</p>
          </div>

          {/* Forecast Chart */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">12-Month Revenue Forecast</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#a5b4fc" />
                <YAxis tickFormatter={(value) => `${value / 1000}K`} stroke="#a5b4fc" />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={3} dot={{ r: 5 }} name="Actual Revenue" />
                <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} name="Predicted Revenue" />
                <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={2} name="Confidence %" yAxisId="right" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-white mb-3">Next Month Prediction</h4>
              <p className="text-3xl font-bold text-cyan-400">{formatCurrency(502000)}</p>
              <p className="text-sm text-cyan-200 mt-2">Confidence: 88%</p>
              <p className="text-xs text-gray-400 mt-2">Expected growth: +3.5%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-white mb-3">Q4 Projection</h4>
              <p className="text-3xl font-bold text-purple-400">{formatCurrency(1690000)}</p>
              <p className="text-sm text-purple-200 mt-2">Avg Confidence: 76%</p>
              <p className="text-xs text-gray-400 mt-2">Seasonal pattern detected</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-white mb-3">Annual Forecast</h4>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(6180000)}</p>
              <p className="text-sm text-green-200 mt-2">Growth: +6.2%</p>
              <p className="text-xs text-gray-400 mt-2">Model: Prophet + ARIMA</p>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Analysis Tab - Module 4 */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg border border-purple-400/30 p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-purple-400" />
              Loan Portfolio Health & Forecasting
            </h2>
            <p className="text-purple-200">Future portfolio stability predictions</p>
          </div>

          {/* Portfolio Forecast Chart */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Active Loans Forecast (Next 6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={loanPortfolioForecast.predictedActiveLoans}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#a5b4fc" />
                <YAxis stroke="#a5b4fc" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="active" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} name="Active Loans" />
                <Area type="monotone" dataKey="new" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} name="New Loans" />
                <Area type="monotone" dataKey="defaulted" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} name="Defaulted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Loan Type Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Loan Type Profitability</h3>
              <div className="space-y-3">
                {loanPortfolioForecast.loanTypePerformance.map((loan, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{loan.type}</span>
                      <span className="text-cyan-400 font-bold">{formatCurrency(loan.avgProfit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Count: {loan.count}</span>
                      <span className={`font-medium ${loan.riskScore < 30 ? 'text-green-400' : loan.riskScore < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        Risk: {loan.riskScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Customer Segment Risk</h3>
              <div className="space-y-3">
                {loanPortfolioForecast.customerSegmentRisk.map((segment, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{segment.segment}</span>
                      <span className="text-purple-400 font-bold">{segment.count} customers</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">LTV: {formatCurrency(segment.avgLTV)}</span>
                      <span className={`font-medium ${segment.defaultRate < 2 ? 'text-green-400' : segment.defaultRate < 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        Default: {segment.defaultRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Churn Prediction Tab - Module 6 */}
      {activeTab === 'churn' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-lg border border-red-400/30 p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              ML-Based Customer Churn Prediction
            </h2>
            <p className="text-red-200">Logistic Regression, Random Forest, XGBoost models</p>
          </div>

          {/* Churn Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Churn Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={churnPredictionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="count"
                    label={(entry) => entry.count}
                  >
                    {churnPredictionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Customers']} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {churnPredictionData.map((item, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-purple-200">{item.riskLevel.split(' ')[0]}: {item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">High-Risk Customers (Immediate Action Required)</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {churnRiskCustomers.map((customer, index) => (
                  <div key={index} className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-400/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-semibold">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{customer.riskScore}</p>
                        <p className="text-xs text-red-300">Risk Score</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Loan Amount</p>
                        <p className="text-white">{formatCurrency(customer.loanAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">EMI Delays</p>
                        <p className="text-orange-400">{customer.emiDelays}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-orange-300">
                      {customer.reason} • Churn Probability: {(customer.churnProbability * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Health Tab - Module 7 */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg border border-green-400/30 p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-7 h-7 text-green-400" />
              Financial Health Score Analysis
            </h2>
            <p className="text-green-200">Weighted ML-based bank stability metric (0-100)</p>
          </div>

          {/* Health Score Breakdown */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Health Score Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {Object.entries(financialHealthComponents).filter(([key]) => key !== 'trends').map(([key, value]) => (
                <div key={key} className="bg-white/5 rounded-lg p-4">
                  <p className="text-xs text-cyan-300 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-white">{value.score}</p>
                    <p className="text-sm text-gray-400">/100</p>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-400">Weight: {(value.weight * 100).toFixed(0)}%</span>
                    <span className="text-cyan-400 ml-2">= {value.contribution}</span>
                  </div>
                  <div className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{ width: `${value.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Score */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 rounded-xl p-6 text-center">
              <p className="text-lg text-green-300 mb-2">Overall Financial Health Score</p>
              <p className="text-6xl font-bold text-white mb-2">{calculateFinancialHealth()}</p>
              <p className="text-green-400">Excellent • Bank is stable & profitable</p>
            </div>
          </div>

          {/* Health Trend */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">6-Month Health Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={financialHealthComponents.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#a5b4fc" />
                <YAxis domain={[0, 100]} stroke="#a5b4fc" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Market Intelligence */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Market Intelligence & External Factors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Repo Rate</p>
                <p className="text-2xl font-bold text-white">{marketIntelligence.repoRate}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Inflation</p>
                <p className="text-2xl font-bold text-white">{marketIntelligence.inflation}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Competitor Avg Rate</p>
                <p className="text-2xl font-bold text-white">{marketIntelligence.competitorAvgRate}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-cyan-300 mb-1">Market Growth</p>
                <p className="text-2xl font-bold text-white">{marketIntelligence.marketGrowth}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueIntelligence;
