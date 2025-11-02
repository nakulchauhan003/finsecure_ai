import React from 'react';

const AuthWrapper = ({ children }) => {
  // Get username from localStorage or use default
  const username = localStorage.getItem('username') || 'Guest User';

  return (
    <div>
      {/* Welcome bar */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="text-white">
            Welcome back, <span className="font-semibold">{username}</span>
          </div>
          <div className="text-sm text-purple-300">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default AuthWrapper;