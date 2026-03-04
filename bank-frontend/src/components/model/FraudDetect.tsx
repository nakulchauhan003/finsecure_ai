import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Activity, Shield, Sparkles } from 'lucide-react';
import { analyzeFraud, AIFraudAnalysis } from '../../utils/gemini';

const FraudDetectionDashboard = () => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      user: 'John Doe',
      type: 'Synthetic Identity',
      score: 0.89,
      reason: 'Same device ID used for 3 different accounts within 24 hours',
      timestamp: new Date(Date.now() - 3600000),
      status: 'pending',
      details: { deviceId: 'DEV-8492', applications: 3, timeFrame: '24h' }
    },
    {
      id: 2,
      user: 'Sarah Miller',
      type: 'Data Mismatch',
      score: 0.76,
      reason: 'Income declaration inconsistent with employment verification',
      timestamp: new Date(Date.now() - 7200000),
      status: 'pending',
      details: { declared: '₹80,000', verified: '₹45,000' }
    },
    {
      id: 3,
      user: 'Mike Johnson',
      type: 'Geographic Anomaly',
      score: 0.72,
      reason: 'Login from 4 different cities within 6 hours',
      timestamp: new Date(Date.now() - 10800000),
      status: 'pending',
      details: { locations: ['Mumbai', 'Delhi', 'Bangalore', 'Pune'] }
    }
  ]);

  const [stats, setStats] = useState({
    totalTransactions: 1247,
    flaggedCases: 23,
    resolvedToday: 18,
    accuracyRate: 94.2
  });

  const [recentActivity] = useState([
    { time: '2 min ago', event: 'High-risk application detected', severity: 'high' },
    { time: '15 min ago', event: 'Fraud case resolved - confirmed fraud', severity: 'medium' },
    { time: '28 min ago', event: 'False positive corrected', severity: 'low' },
    { time: '1 hour ago', event: 'Multiple device login flagged', severity: 'high' }
  ]);

  const [aiAnalysis, setAiAnalysis] = useState<AIFraudAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleDeepAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const alertData = alerts.filter(a => a.status === 'pending').map(a => ({
        user: a.user,
        type: a.type,
        score: a.score,
        reason: a.reason,
        details: a.details,
      }));
      const result = await analyzeFraud({
        pendingAlerts: alertData,
        stats,
        recentActivity,
      });
      setAiAnalysis(result);
    } catch (err) {
      console.error('AI fraud analysis failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResolve = (id: number, decision: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: decision } : alert
    ));
    setStats(prev => ({ ...prev, resolvedToday: prev.resolvedToday + 1 }));
  };

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.7) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return 'bg-red-100 text-red-700';
    if (status === 'rejected') return 'bg-green-100 text-green-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-purple-400" />
              Fraud Detection AI
            </h1>
            <p className="text-purple-300">Real-time monitoring & anomaly detection</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-300">Last Updated</div>
            <div className="text-white font-semibold">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
              </div>
              <Activity className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm mb-1">Flagged Cases</p>
                <p className="text-3xl font-bold text-white">{stats.flaggedCases}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm mb-1">Resolved Today</p>
                <p className="text-3xl font-bold text-white">{stats.resolvedToday}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm mb-1">Accuracy Rate</p>
                <p className="text-3xl font-bold text-white">{stats.accuracyRate}%</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Fraud Alerts - Main Section */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Active Fraud Alerts
            </h2>
            
            <div className="space-y-4">
              {alerts.filter(a => a.status === 'pending').map(alert => (
                <div key={alert.id} className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-purple-400 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{alert.user}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-purple-200 text-sm mb-3">{alert.reason}</p>
                      
                      {/* Details */}
                      <div className="bg-black/20 rounded p-3 mb-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(alert.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-purple-300 capitalize">{key}: </span>
                              <span className="text-white font-medium">
                                {Array.isArray(value) ? value.join(', ') : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span>{alert.timestamp.toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>ID: #{alert.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-xs text-purple-300 mb-1">Fraud Score</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.score)}`}></div>
                          <span className="text-2xl font-bold text-white">{(alert.score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleResolve(alert.id, 'approved')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Confirm Fraud
                    </button>
                    <button 
                      onClick={() => handleResolve(alert.id, 'rejected')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      False Positive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.severity === 'high' ? 'bg-red-400' :
                      activity.severity === 'medium' ? 'bg-orange-400' : 'bg-green-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.event}</p>
                      <p className="text-purple-300 text-xs mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemini AI Deep Analysis */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Gemini AI Analysis
              </h3>
              <button
                onClick={handleDeepAnalysis}
                disabled={aiLoading}
                className="w-full mb-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Run Deep Analysis</>
                )}
              </button>
              {aiAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 text-sm">Fraud Score</span>
                    <span className={`font-bold text-lg ${aiAnalysis.fraudScore >= 70 ? 'text-red-400' : aiAnalysis.fraudScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {aiAnalysis.fraudScore}/100
                    </span>
                  </div>
                  <div className={`text-xs px-3 py-1.5 rounded ${aiAnalysis.isFraudulent ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {aiAnalysis.recommendation}
                  </div>
                  {aiAnalysis.patterns.slice(0, 3).map((p, i) => (
                    <div key={i} className={`text-xs px-2 py-1 rounded ${
                      p.severity === 'high' ? 'bg-red-500/10 text-red-300' :
                      p.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-300' :
                      'bg-green-500/10 text-green-300'
                    }`}>
                      <strong>{p.type}:</strong> {p.description}
                    </div>
                  ))}
                  <p className="text-purple-200 text-xs mt-2">{aiAnalysis.explanation}</p>
                </div>
              ) : (
                <p className="text-purple-300 text-sm">Click above to run Gemini AI analysis on all pending alerts</p>
              )}
            </div>

            {/* Detection Methods */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">AI Models Active</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Isolation Forest</span>
                  <span className="text-green-400 text-sm">●  Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Random Forest</span>
                  <span className="text-green-400 text-sm">●  Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">XGBoost</span>
                  <span className="text-green-400 text-sm">●  Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Autoencoders</span>
                  <span className="text-green-400 text-sm">●  Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Gemini 2.5 Flash</span>
                  <span className="text-green-400 text-sm">●  Active</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Resolved Cases */}
        {alerts.filter(a => a.status !== 'pending').length > 0 && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recently Resolved</h2>
            <div className="space-y-3">
              {alerts.filter(a => a.status !== 'pending').map(alert => (
                <div key={alert.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">{alert.user}</span>
                    <span className="text-purple-300 text-sm">{alert.type}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(alert.status)}`}>
                      {alert.status === 'approved' ? 'Confirmed Fraud' : 'False Positive'}
                    </span>
                  </div>
                  <span className="text-purple-300 text-sm">{alert.timestamp.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FraudDetectionDashboard;