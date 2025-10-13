import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { recoveryOpportunities } from '../data/revenueData';

const RevenueRecovery = () => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalRecoveryPotential = recoveryOpportunities.reduce((sum, opp) => sum + opp.potential, 0);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Payment Recovery': return 'bg-blue-50 border-blue-200';
      case 'Churn Prevention': return 'bg-red-50 border-red-200';
      case 'Billing Optimization': return 'bg-green-50 border-green-200';
      case 'Usage Optimization': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Payment Recovery':
        return (
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'Churn Prevention':
        return (
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      case 'Billing Optimization':
        return (
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'Usage Optimization':
        return (
          <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Recovery Opportunities</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Recovery Potential</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRecoveryPotential)}</p>
        </div>
      </div>

      {/* Recovery Potential Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Potential by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={recoveryOpportunities} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `$${value / 1000}K`} />
            <YAxis dataKey="category" type="category" width={120} />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Recovery Potential']} />
            <Bar dataKey="potential" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery Opportunities Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recoveryOpportunities.map((opportunity, index) => (
          <div key={index} className={`rounded-lg border-2 p-6 ${getCategoryColor(opportunity.category)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  {getCategoryIcon(opportunity.category)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{opportunity.category}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(opportunity.potential)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {((opportunity.potential / totalRecoveryPotential) * 100).toFixed(1)}% of total
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Recommended Actions:</h4>
              <ul className="space-y-2">
                {opportunity.actions.map((action, actionIndex) => (
                  <li key={actionIndex} className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  View Details
                </button>
                <button className="flex-1 bg-blue-600 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Implement
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Implementation Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Implementation Priority Matrix</h3>
          <p className="text-sm text-gray-600 mt-1">Recommended implementation order based on impact and effort</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                    1
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">High Priority - Quick Wins</p>
                  <p className="text-sm text-gray-600">Payment Recovery & Billing Optimization</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(68000)}</p>
                <p className="text-xs text-gray-500">2-4 weeks</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
                    2
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Medium Priority - Strategic Impact</p>
                  <p className="text-sm text-gray-600">Churn Prevention Initiatives</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(78000)}</p>
                <p className="text-xs text-gray-500">6-8 weeks</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                    3
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Long-term - Optimization</p>
                  <p className="text-sm text-gray-600">Usage Pattern Optimization</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(34000)}</p>
                <p className="text-xs text-gray-500">10-12 weeks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected ROI Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Projected Annual Recovery</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRecoveryPotential * 4)}</p>
            <p className="text-xs text-gray-500 mt-1">Based on quarterly implementation</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Implementation Cost</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(45000)}</p>
            <p className="text-xs text-gray-500 mt-1">Estimated total investment</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">ROI</p>
            <p className="text-2xl font-bold text-purple-600">
              {(((totalRecoveryPotential * 4 - 45000) / 45000) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">First year return</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueRecovery;