import React from 'react';

const HeroPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: '📊',
      title: 'Revenue Analytics',
      description: 'Track MRR, identify leakage patterns, and monitor key performance indicators in real-time.'
    },
    {
      icon: '⚠️',
      title: 'Anomaly Detection',
      description: 'AI-powered detection of billing irregularities, duplicate charges, and pricing mismatches.'
    },
    {
      icon: '📉',
      title: 'Churn Prediction',
      description: 'Predictive models identify at-risk customers before they churn with 87.3% accuracy.'
    },
    {
      icon: '💳',
      title: 'Payment Recovery',
      description: 'Smart retry logic and dunning management to recover failed payments automatically.'
    },
    {
      icon: '📈',
      title: 'Usage Intelligence',
      description: 'Monitor customer usage patterns and identify optimization opportunities.'
    },
    {
      icon: '💰',
      title: 'Revenue Recovery',
      description: 'Actionable recommendations to recover up to $300K+ in annual revenue.'
    }
  ];

  const stats = [
    { value: '$300K+', label: 'Annual Revenue Recovered' },
    { value: '35%', label: 'Reduction in Involuntary Churn' },
    { value: '87.3%', label: 'Churn Prediction Accuracy' },
    { value: '24/7', label: 'Automated Monitoring' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Stop Revenue
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Leakage</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Intelligent system to identify and recover lost subscription revenue through advanced analytics, 
              ML-powered anomaly detection, and automated intervention strategies.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Start Free Analysis
              </button>
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg shadow-lg hover:shadow-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200"
              >
                View Live Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-sm md:text-base text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Revenue Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform identifies revenue leakage across your entire subscription lifecycle
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-gray-100"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Problem & Solution Section */}
      <div className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">The Hidden Cost of Revenue Leakage</h2>
              <div className="space-y-4 text-lg text-gray-300">
                <p>• Failed payments cost SaaS companies 2-9% of revenue annually</p>
                <p>• Billing errors and pricing discrepancies go undetected</p>
                <p>• Customer churn signals are missed until it's too late</p>
                <p>• Manual processes can't scale with business growth</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Our Solution Delivers</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Automated revenue leakage detection</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Predictive churn prevention</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Smart payment recovery</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Actionable business insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Recover Your Lost Revenue?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join leading SaaS companies using our platform to identify and recover millions in lost revenue.
          </p>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">$485K</div>
                <div className="text-gray-600">Monthly Recurring Revenue</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600 mb-2">$32.5K</div>
                <div className="text-gray-600">Revenue Leakage Detected</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">$180K</div>
                <div className="text-gray-600">Recovery Potential</div>
              </div>
            </div>
          </div>

          <button
            onClick={onGetStarted}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Your Revenue Analysis Now
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Free demo with sample data • Setup in under 2 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroPage;