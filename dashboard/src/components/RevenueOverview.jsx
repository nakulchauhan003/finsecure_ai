import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { revenueMetrics, monthlyRevenueData, churnPredictionData } from '../data/revenueData';

const RevenueOverview = () => {
  const COLORS = ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => `${value}%`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Revenue Overview</h2>
        <div className="text-sm text-cyan-300">Last updated: {new Date().toLocaleDateString()}</div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-lg border border-cyan-400/30 p-6 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(revenueMetrics.mrr)}</p>
              <p className="text-sm text-green-400">
                +{formatCurrency(revenueMetrics.mrr - revenueMetrics.previousMrr)} from last month
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-lg border border-red-400/30 p-6 rounded-xl shadow-lg hover:shadow-red-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-300">Revenue Leakage</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(revenueMetrics.revenueLeakage)}</p>
              <p className="text-sm text-purple-300">
                {((revenueMetrics.revenueLeakage / revenueMetrics.mrr) * 100).toFixed(1)}% of MRR
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-lg border border-orange-400/30 p-6 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-300">Churn Rate</p>
              <p className="text-2xl font-bold text-orange-400">{revenueMetrics.churnRate}%</p>
              <p className="text-sm text-purple-300">Monthly churn rate</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-lg border border-blue-400/30 p-6 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Customer LTV</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(revenueMetrics.averageCustomerLifetimeValue)}</p>
              <p className="text-sm text-purple-300">Average lifetime value</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend & Leakage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#a5b4fc" />
              <YAxis tickFormatter={(value) => `$${value / 1000}K`} stroke="#a5b4fc" />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="mrr" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
              <Area type="monotone" dataKey="leakage" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} />
              <Area type="monotone" dataKey="recovered" stackId="3" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Risk Distribution */}
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
              >
                {churnPredictionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, 'Customers']} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {churnPredictionData.map((item, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className={`w-3 h-3 rounded mr-2`} style={{ backgroundColor: COLORS[index] }}></div>
                <span className="text-purple-200">{item.riskLevel.split(' ')[0]} Risk: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueOverview;