import React, { useState } from 'react';
import AuthWrapper from './components/AuthWrapper';
import HeroPage from './components/HeroPage';
import Header from './components/Header';
import RevenueOverview from './components/RevenueOverview';
import BillingAnomalies from './components/BillingAnomalies';
import ChurnRiskAnalysis from './components/ChurnRiskAnalysis';
import PaymentFailures from './components/PaymentFailures';
import UsagePatterns from './components/UsagePatterns';
import RevenueRecovery from './components/RevenueRecovery';
import { useRevenueData } from './hooks/useRevenueData';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const revenueData = useRevenueData();

  const handleGetStarted = () => {
    setShowDashboard(true);
  };

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

  // Show hero page if dashboard is not active
  if (!showDashboard) {
    return <HeroPage onGetStarted={handleGetStarted} />;
  }

  return (
    <AuthWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-1">
          {/* Custom Sidebar for Revenue Leakage System */}
          <div className="w-64 bg-white shadow-sm border-r border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Revenue Leakage Detection</h2>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                  title="Back to Home"
                >
                  🏠
                </button>
              </div>
              
              {revenueData.loading && (
                <div className="mb-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading data...</p>
                </div>
              )}
              
              {revenueData.error && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  {revenueData.error}
                </div>
              )}
              
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    disabled={revenueData.loading}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Quick Stats */}
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">MRR</span>
                  <span className="font-medium text-gray-900">
                    {revenueData.loading ? '...' : '$485K'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Leakage</span>
                  <span className="font-medium text-red-600">
                    {revenueData.loading ? '...' : '$32.5K'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Churn Rate</span>
                  <span className="font-medium text-orange-600">
                    {revenueData.loading ? '...' : '4.2%'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Recovery Potential</span>
                  <span className="font-medium text-green-600">
                    {revenueData.loading ? '...' : '$180K'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={revenueData.refetch}
                disabled={revenueData.loading}
                className="mt-3 w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded disabled:opacity-50"
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