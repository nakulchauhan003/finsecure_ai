import React from 'react';
import './chartConfig';
import './styles.css';

const TestDashboard: React.FC = () => {
  console.log('TestDashboard rendering');

  return (
    <div className="dashboard-revenue-content">
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Total Revenue</h3>
            <p className="text-2xl font-bold text-blue-600">$1,234,567</p>
            <span className="text-sm text-green-600">↑ 12.5%</span>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Monthly Growth</h3>
            <p className="text-2xl font-bold text-green-600">23.5%</p>
            <span className="text-sm text-green-600">↑ 5.2%</span>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Active Accounts</h3>
            <p className="text-2xl font-bold text-purple-600">8,642</p>
            <span className="text-sm text-green-600">↑ 3.1%</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Average Transaction</h3>
            <p className="text-2xl font-bold text-orange-600">$142.50</p>
            <span className="text-sm text-red-600">↓ 2.3%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;