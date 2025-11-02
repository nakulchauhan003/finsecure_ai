import React, { useState } from 'react';
import AuthWrapper from './components/AuthWrapper';
import Header from './components/Header';
import RevenueOverview from './components/RevenueOverview';
import BillingAnomalies from './components/BillingAnomalies';
import ChurnRiskAnalysis from './components/ChurnRiskAnalysis';
import PaymentFailures from './components/PaymentFailures';
import UsagePatterns from './components/UsagePatterns';
import RevenueRecovery from './components/RevenueRecovery';
import { useRevenueData } from './hooks/useRevenueData';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const revenueData = useRevenueData();

  const renderActiveComponent = () => {
    const commonProps = { data: revenueData };
    
    switch (activeTab) {
      case 'overview':
        return <RevenueOverview {...commonProps} />;
      case 'anomalies':
        return <BillingAnomalies {...commonProps} />;
      case 'churn':
        return <ChurnRiskAnalysis {...commonProps} />;
      case 'payments':
        return <PaymentFailures {...commonProps} />;
      case 'usage':
        return <UsagePatterns {...commonProps} />;
      case 'recovery':
        return <RevenueRecovery {...commonProps} />;
      default:
        return <RevenueOverview {...commonProps} />;
    }
  };

  const navigationItems = [
    { id: 'overview', name: 'Revenue Overview', icon: '📊' },
    { id: 'anomalies', name: 'Billing Anomalies', icon: '⚠️' },
    { id: 'churn', name: 'Churn Risk', icon: '📉' },
    { id: 'payments', name: 'Payment Failures', icon: '💳' },
    { id: 'usage', name: 'Usage Patterns', icon: '📈' },
    { id: 'recovery', name: 'Revenue Recovery', icon: '💰' }
  ];

  // Show dashboard directly
  return (
    <AuthWrapper>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Header />
        <div className="flex flex-1">
          {/* Custom Sidebar for Revenue Leakage System */}
          <div className="w-64 bg-white/10 backdrop-blur-lg shadow-2xl border-r border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Revenue Analytics</h2>
              </div>
              
              {revenueData.loading && (
                <div className="mb-4 text-center">
                  <div className="w-6 h-6 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-purple-300 mt-2">Loading data...</p>
                </div>
              )}
              
              {revenueData.error && (
                <div className="mb-4 p-2 bg-red-500/20 border border-red-400/50 rounded text-xs text-red-200">
                  {revenueData.error}
                </div>
              )}
              
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    disabled={revenueData.loading}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-purple-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Quick Stats */}
            <div className="px-6 py-4 border-t border-white/20">
              <h3 className="text-sm font-medium text-purple-300 mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300">MRR</span>
                  <span className="font-medium text-white">
                    {revenueData.loading ? '...' : '$485K'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300">Leakage</span>
                  <span className="font-medium text-red-400">
                    {revenueData.loading ? '...' : '$32.5K'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300">Churn Rate</span>
                  <span className="font-medium text-orange-400">
                    {revenueData.loading ? '...' : '4.2%'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300">Recovery Potential</span>
                  <span className="font-medium text-green-400">
                    {revenueData.loading ? '...' : '$180K'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={revenueData.refetch}
                disabled={revenueData.loading}
                className="mt-3 w-full text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 px-2 rounded-lg disabled:opacity-50 transition-all"
              >
                {revenueData.loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
          
          <main className="flex-1 p-6 overflow-auto">
            {renderActiveComponent()}
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default App;