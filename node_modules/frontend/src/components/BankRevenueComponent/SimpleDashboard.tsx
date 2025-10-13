import React from 'react';

const BankRevenueDashboard: React.FC = () => {
  console.log('Simple BankRevenueDashboard rendering');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Bank Revenue Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-lg">Simple dashboard content</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-medium">Total Revenue</h3>
            <p className="text-2xl">$1,234,567</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-medium">Monthly Growth</h3>
            <p className="text-2xl">23.5%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankRevenueDashboard;