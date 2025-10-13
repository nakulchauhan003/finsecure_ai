import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { usagePatterns } from '../data/revenueData';

const UsagePatterns = () => {
  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < -20) return 'text-red-600';
    return 'text-orange-600';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) {
      return (
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    } else {
      return (
        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
  };

  const usageComparisonData = usagePatterns.map(pattern => ({
    customer: pattern.customer.split(' ')[0], // Shorten names for chart
    current: pattern.currentUsage,
    previous: pattern.previousUsage,
    trend: pattern.trend
  }));

  const mockUsageTrendData = [
    { month: 'Jan', avgUsage: 85, activeUsers: 1180 },
    { month: 'Feb', avgUsage: 88, activeUsers: 1195 },
    { month: 'Mar', avgUsage: 82, activeUsers: 1210 },
    { month: 'Apr', avgUsage: 79, activeUsers: 1189 },
    { month: 'May', avgUsage: 76, activeUsers: 1167 },
    { month: 'Jun', avgUsage: 73, activeUsers: 1189 }
  ];

  const planDistribution = usagePatterns.reduce((acc, pattern) => {
    const existing = acc.find(item => item.plan === pattern.plan);
    if (existing) {
      existing.count += 1;
      existing.avgUsage += pattern.currentUsage;
    } else {
      acc.push({ plan: pattern.plan, count: 1, avgUsage: pattern.currentUsage });
    }
    return acc;
  }, []).map(item => ({ ...item, avgUsage: Math.round(item.avgUsage / item.count) }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Usage Pattern Analysis</h2>
        <div className="flex space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {usagePatterns.filter(p => p.trend < -20).length} Declining Usage
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {usagePatterns.filter(p => p.trend > 0).length} Growing Usage
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(usagePatterns.reduce((sum, pattern) => sum + pattern.currentUsage, 0) / usagePatterns.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growing Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {usagePatterns.filter(p => p.trend > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Declining Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {usagePatterns.filter(p => p.trend < 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {usagePatterns.filter(p => p.trend < -20).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Comparison Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current vs Previous Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="customer" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="previous" fill="#94a3b8" name="Previous Usage" />
              <Bar dataKey="current" fill="#3b82f6" name="Current Usage" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Usage Trend Over Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trend Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockUsageTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="avgUsage" stroke="#ef4444" strokeWidth={2} name="Avg Usage %" />
              <Line yAxisId="right" type="monotone" dataKey="activeUsers" stroke="#22c55e" strokeWidth={2} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Usage Patterns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Customer Usage Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usagePatterns.map((pattern, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pattern.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pattern.plan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${pattern.currentUsage}%` }}
                        ></div>
                      </div>
                      {pattern.currentUsage}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pattern.previousUsage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className={`flex items-center ${getTrendColor(pattern.trend)}`}>
                      {getTrendIcon(pattern.trend)}
                      <span className="ml-1 font-medium">
                        {pattern.trend > 0 ? '+' : ''}{pattern.trend.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {pattern.trend < -20 ? (
                      <>
                        <button className="text-red-600 hover:text-red-900 mr-3">
                          Alert
                        </button>
                        <button className="text-blue-600 hover:text-blue-900">
                          Engage
                        </button>
                      </>
                    ) : pattern.trend < 0 ? (
                      <button className="text-orange-600 hover:text-orange-900">
                        Monitor
                      </button>
                    ) : (
                      <button className="text-green-600 hover:text-green-900">
                        Optimize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Usage Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Plan Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={planDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="plan" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Customer Count" />
            <Bar yAxisId="right" dataKey="avgUsage" fill="#10b981" name="Avg Usage %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UsagePatterns;