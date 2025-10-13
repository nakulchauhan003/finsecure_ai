import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import BankRevenueDashboard from '../components/BankRevenueComponent/BankRevenueDashboard';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600">
          Error loading dashboard. Please try refreshing the page.
        </div>
      );
    }
    return this.props.children;
  }
}

const BankRevenuePage: React.FC = () => {
  console.log('BankRevenuePage rendering');
  
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardLayout>
        <ErrorBoundary>
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Bank Revenue Dashboard</h1>
            <TestDashboard />
          </div>
        </ErrorBoundary>
      </DashboardLayout>
    </div>
  );
};

export default BankRevenuePage;