import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { analyzeFraud, AIFraudAnalysis } from '../../utils/gemini';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bvsvixkgcbslhrgdkikm.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const BACKEND_API = 'http://localhost:3002/api';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface TransactionData {
  amount?: number;
  channel?: string;
  device_id?: string;
  geo_location?: { city?: string; country?: string };
  merchant?: string;
  created_at?: string;
}

interface FraudAlert {
  id: string;
  transaction_id: string;
  user_id: string;
  fraud_score: number;
  fraud_type: string;
  fraud_signals: string[];
  status: string;
  analyst_notes: string;
  analyst_id?: string;
  confirmed_fraud: boolean;
  created_at: string;
  closed_at?: string;
  metadata?: Record<string, unknown>;
  transactions?: TransactionData;
}

interface Stats {
  totalTransactions: number;
  flaggedCases: number;
  resolvedToday: number;
  averageFraudScore: number;
  alertRate: number;
  timestamp: string;
}

interface ActivityLog {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
}

interface InvestigationData {
  alert: FraudAlert;
  transaction_details: {
    id?: string;
    amount?: number;
    channel?: string;
    merchant?: string;
    location?: { city?: string; country?: string };
    device_id?: string;
    created_at?: string;
  };
  account_history: {
    transactions_last_hour: number;
    transactions_last_day: number;
    recent_transactions: Array<{
      id: string;
      amount: number;
      channel: string;
      created_at: string;
      device_id?: string;
      geo_location?: { city?: string };
    }>;
  };
  device_information: {
    device_id: string;
    user_count: number;
    transaction_count: number;
    flagged: boolean;
  };
  model_explanation: {
    fraud_type: string;
    fraud_score: number;
    severity: Severity;
    risk_factors: string[];
    recommendation: string;
  };
}

interface ModelHealth {
  modelName: string;
  status: string;
  averageFraudScoreToday: number;
  alertRate: number;
  lastRetrain: string;
}

interface PatternResponse {
  topSignals: Array<{ name: string; count: number }>;
  topLocations: Array<{ name: string; count: number }>;
  topDevices: Array<{ name: string; count: number }>;
}

interface AlertFilters {
  status: string;
  fraudType: string;
  channel: string;
  location: string;
  minFraudScore: string;
  maxFraudScore: string;
  minAmount: string;
  maxAmount: string;
  sortBy: string;
}

const defaultFilters: AlertFilters = {
  status: 'pending',
  fraudType: '',
  channel: '',
  location: '',
  minFraudScore: '',
  maxFraudScore: '',
  minAmount: '',
  maxAmount: '',
  sortBy: 'highest_score',
};

const severityStyles: Record<Severity, string> = {
  CRITICAL: 'bg-red-500/20 text-red-300 border border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  LOW: 'bg-green-500/20 text-green-300 border border-green-500/40',
};

function getSeverity(score: number): Severity {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  return 'LOW';
}

function formatCurrency(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function RiskMeter({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score * 100));
  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between text-[11px] text-purple-300 mb-1">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <div className="relative h-2 bg-white/15 rounded-full overflow-hidden">
        <div
          className={`h-full ${pct >= 80 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        ></div>
        <div className="absolute top-[-3px]" style={{ left: `calc(${pct}% - 4px)` }}>
          <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white"></div>
        </div>
      </div>
      <div className="text-right text-xs text-white mt-1 font-semibold">{pct.toFixed(0)}%</div>
    </div>
  );
}

const FraudDetectionDashboard = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    flaggedCases: 0,
    resolvedToday: 0,
    averageFraudScore: 0,
    alertRate: 0,
    timestamp: new Date().toISOString(),
  });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [patterns, setPatterns] = useState<PatternResponse>({ topSignals: [], topLocations: [], topDevices: [] });
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<AIFraudAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationData | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<AlertFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const recentActivityForAi = useMemo(
    () => activity.slice(0, 8).map((item) => ({
      time: new Date(item.created_at).toLocaleTimeString(),
      event: item.message,
      severity: item.severity === 'error' ? 'high' : item.severity === 'warning' ? 'medium' : 'low',
    })),
    [activity],
  );

  const buildAlertsQuery = useCallback(() => {
    const params = new URLSearchParams({
      status: filters.status,
      page: String(page),
      limit: String(limit),
      sortBy: filters.sortBy,
    });

    if (filters.fraudType) params.set('fraudType', filters.fraudType);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.location) params.set('location', filters.location);
    if (filters.minFraudScore) params.set('minFraudScore', filters.minFraudScore);
    if (filters.maxFraudScore) params.set('maxFraudScore', filters.maxFraudScore);
    if (filters.minAmount) params.set('minAmount', filters.minAmount);
    if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);

    return `${BACKEND_API}/fraud/alerts?${params.toString()}`;
  }, [filters, page, limit]);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch(buildAlertsQuery());
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to fetch alerts');
    }
    const data = await res.json();
    setAlerts(data.alerts || []);
    setTotalPages(data.totalPages || 1);
  }, [buildAlertsQuery]);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${BACKEND_API}/fraud/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    setStats(data);
  }, []);

  const fetchActivity = useCallback(async () => {
    const res = await fetch(`${BACKEND_API}/fraud/activity?limit=25`);
    if (!res.ok) return;
    const data = await res.json();
    setActivity(data.activity || []);
  }, []);

  const fetchPatterns = useCallback(async () => {
    const res = await fetch(`${BACKEND_API}/fraud/patterns`);
    if (!res.ok) return;
    const data = await res.json();
    setPatterns(data);
  }, []);

  const fetchModelHealth = useCallback(async () => {
    const res = await fetch(`${BACKEND_API}/fraud/model-health`);
    if (!res.ok) return;
    const data = await res.json();
    setModelHealth(data);
  }, []);

  const refreshAll = useCallback(async () => {
    setConnectionError(null);
    await Promise.all([fetchAlerts(), fetchStats(), fetchActivity(), fetchPatterns(), fetchModelHealth()]);
  }, [fetchAlerts, fetchStats, fetchActivity, fetchPatterns, fetchModelHealth]);

  useEffect(() => {
    setLoading(true);
    refreshAll()
      .catch((err) => {
        setConnectionError(err.message || 'Fraud system temporarily unavailable. Retrying connection...');
      })
      .finally(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    const channel = supabase
      .channel('fraud_alerts_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, async () => {
        try {
          await refreshAll();
        } catch {
          setConnectionError('Fraud system temporarily unavailable. Retrying connection...');
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [refreshAll]);

  const openInvestigation = async (alertId: string) => {
    if (selectedAlertId === alertId) {
      setSelectedAlertId(null);
      setInvestigation(null);
      return;
    }

    setSelectedAlertId(alertId);
    setInvestigation(null);
    try {
      const res = await fetch(`${BACKEND_API}/fraud/alerts/${alertId}/investigation`);
      if (!res.ok) throw new Error('Failed to fetch investigation details');
      const data = await res.json();
      setInvestigation(data);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Failed to fetch investigation details');
    }
  };

  const handleResolve = async (alert: FraudAlert, confirmFraud: boolean) => {
    try {
      const note = noteDrafts[alert.id] || (confirmFraud ? 'Confirmed Fraud' : 'False Positive');
      const status = confirmFraud ? 'confirmed_fraud' : 'false_positive';

      const res = await fetch(`${BACKEND_API}/fraud/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
          confirmed_fraud: confirmFraud,
          analyst_notes: `${status.toUpperCase()}: ${note}`,
          analyst_id: 'analyst_demo_01',
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to resolve alert');
      }

      setNoteDrafts((prev) => ({ ...prev, [alert.id]: '' }));
      await refreshAll();
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const handleDeepAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const pendingAlerts = alerts.map((a) => ({
        user: a.user_id,
        type: a.fraud_type,
        score: a.fraud_score,
        reason: a.analyst_notes,
        details: {
          amount: a.transactions?.amount,
          channel: a.transactions?.channel,
          location: a.transactions?.geo_location?.city || 'Unknown',
          signals: a.fraud_signals,
        },
      }));

      const result = await analyzeFraud({
        pendingAlerts,
        stats,
        recentActivity: recentActivityForAi,
      });

      setAiAnalysis(result);
      await fetchActivity();
    } catch {
      setConnectionError('AI analysis failed. Please retry.');
    } finally {
      setAiLoading(false);
    }
  };

  const severityCount = useMemo(() => {
    const counter: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    alerts.forEach((alert) => {
      counter[getSeverity(alert.fraud_score)] += 1;
    });
    return counter;
  }, [alerts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading fraud detection system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-purple-400" />
              Fraud Detection AI Ops
            </h1>
            <p className="text-purple-300">Live analyst workflow, investigation, and model observability</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-300">Last Updated</div>
            <div className="text-white font-semibold">{new Date(stats.timestamp).toLocaleTimeString()}</div>
            {connectionError && <p className="text-red-400 text-xs mt-1">{connectionError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-purple-300 text-sm mb-1">Total Transactions</p>
            <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-purple-300 text-sm mb-1">Flagged Cases</p>
            <p className="text-3xl font-bold text-white">{stats.flaggedCases}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-purple-300 text-sm mb-1">Resolved Today</p>
            <p className="text-3xl font-bold text-white">{stats.resolvedToday}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-purple-300 text-sm mb-1">Avg Fraud Score</p>
            <p className="text-3xl font-bold text-white">{(stats.averageFraudScore * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-purple-300 text-sm mb-1">Alert Rate</p>
            <p className="text-3xl font-bold text-white">{stats.alertRate}%</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="bg-slate-900/70 text-white rounded-lg p-2" value={filters.status} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, status: e.target.value })); }}>
              <option value="pending">Pending</option>
              <option value="all">All</option>
              <option value="closed">Closed</option>
              <option value="under_investigation">Under Investigation</option>
            </select>

            <select className="bg-slate-900/70 text-white rounded-lg p-2" value={filters.sortBy} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, sortBy: e.target.value })); }}>
              <option value="highest_score">Highest score</option>
              <option value="newest">Newest alerts</option>
              <option value="largest_amount">Largest amount</option>
            </select>

            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Fraud type" value={filters.fraudType} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, fraudType: e.target.value })); }} />
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Channel (UPI/CARD)" value={filters.channel} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, channel: e.target.value })); }} />
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Location" value={filters.location} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, location: e.target.value })); }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Min score (0-1)" value={filters.minFraudScore} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, minFraudScore: e.target.value })); }} />
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Max score (0-1)" value={filters.maxFraudScore} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, maxFraudScore: e.target.value })); }} />
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Min amount" value={filters.minAmount} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, minAmount: e.target.value })); }} />
            <input className="bg-slate-900/70 text-white rounded-lg p-2" placeholder="Max amount" value={filters.maxAmount} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, maxAmount: e.target.value })); }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Active Fraud Alerts ({alerts.length})
            </h2>

            <div className="space-y-4">
              {alerts.length === 0 && (
                <div className="text-center py-12 text-purple-300">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No alerts for selected filters.</p>
                </div>
              )}

              {alerts.map((alert) => {
                const severity = getSeverity(alert.fraud_score);
                const expanded = selectedAlertId === alert.id;

                return (
                  <div key={alert.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{alert.user_id.slice(0, 8)}...</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${severityStyles[severity]}`}>{severity}</span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">{alert.fraud_type}</span>
                        </div>
                        <p className="text-purple-200 text-sm mb-1">{alert.analyst_notes || 'Auto-generated alert'}</p>
                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                          {(alert.fraud_signals || []).map((signal, idx) => (
                            <span key={`${alert.id}-${idx}`} className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                              {signal}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-purple-300">
                          Amount: {formatCurrency(alert.transactions?.amount)} | Channel: {alert.transactions?.channel || '-'} | Location: {alert.transactions?.geo_location?.city || '-'}
                        </div>
                        <div className="text-xs text-purple-300 mt-1">
                          {new Date(alert.created_at).toLocaleString()} | TX: {alert.transaction_id?.slice(0, 8)}...
                        </div>
                      </div>

                      <div className="w-40">
                        <div className="text-xs text-purple-300">Fraud Score</div>
                        <RiskMeter score={alert.fraud_score} />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 mt-3">
                      <button
                        className="md:w-40 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                        onClick={() => openInvestigation(alert.id)}
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Investigate
                      </button>
                      <input
                        className="flex-1 bg-slate-900/70 text-white rounded-lg p-2"
                        placeholder="Analyst note (required for audit trail)"
                        value={noteDrafts[alert.id] || ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => handleResolve(alert, true)}
                        className="md:w-44 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Confirm Fraud
                      </button>
                      <button
                        onClick={() => handleResolve(alert, false)}
                        className="md:w-44 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        False Positive
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        {!investigation && <p className="text-sm text-purple-300">Loading investigation details...</p>}
                        {investigation && investigation.alert.id === alert.id && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-black/20 rounded-lg p-3">
                              <h4 className="text-white font-semibold mb-2">Transaction Details</h4>
                              <p className="text-purple-200">User ID: {alert.user_id}</p>
                              <p className="text-purple-200">Transaction: {formatCurrency(investigation.transaction_details.amount)}</p>
                              <p className="text-purple-200">Location: {investigation.transaction_details.location?.city || '-'}</p>
                              <p className="text-purple-200">Device: {investigation.transaction_details.device_id || '-'}</p>
                              <p className="text-purple-200">Channel: {investigation.transaction_details.channel || '-'}</p>
                            </div>

                            <div className="bg-black/20 rounded-lg p-3">
                              <h4 className="text-white font-semibold mb-2">Risk Factors</h4>
                              {(investigation.model_explanation.risk_factors || []).map((factor, i) => (
                                <p key={`${factor}-${i}`} className="text-orange-300">+ {factor}</p>
                              ))}
                              <p className="text-purple-200 mt-2">Recommendation: {investigation.model_explanation.recommendation}</p>
                            </div>

                            <div className="bg-black/20 rounded-lg p-3">
                              <h4 className="text-white font-semibold mb-2">Account History</h4>
                              <p className="text-purple-200">Last hour: {investigation.account_history.transactions_last_hour}</p>
                              <p className="text-purple-200">Last day: {investigation.account_history.transactions_last_day}</p>
                            </div>

                            <div className="bg-black/20 rounded-lg p-3">
                              <h4 className="text-white font-semibold mb-2">Device Information</h4>
                              <p className="text-purple-200">Device ID: {investigation.device_information.device_id || '-'}</p>
                              <p className="text-purple-200">Users on device: {investigation.device_information.user_count}</p>
                              <p className="text-purple-200">Transactions: {investigation.device_information.transaction_count}</p>
                              <p className="text-purple-200">Flagged: {investigation.device_information.flagged ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                className="px-3 py-2 rounded bg-white/10 text-white disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </button>
              <span className="text-purple-300 text-sm">Page {page} / {totalPages}</span>
              <button
                className="px-3 py-2 rounded bg-white/10 text-white disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-64 overflow-auto pr-1">
                {activity.length === 0 && <p className="text-sm text-purple-300">No activity yet.</p>}
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${item.severity === 'error' ? 'bg-red-400' : item.severity === 'warning' ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{item.message}</p>
                      <p className="text-purple-300 text-xs mt-1">{new Date(item.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                AI Analysis
              </h3>
              <button
                onClick={handleDeepAnalysis}
                disabled={aiLoading || alerts.length === 0}
                className="w-full mb-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
                ) : (
                  <><Activity className="w-4 h-4" /> Run Deep Analysis</>
                )}
              </button>

              {aiAnalysis ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Fraud Score</span>
                    <span className={`font-bold ${aiAnalysis.fraudScore >= 70 ? 'text-red-400' : aiAnalysis.fraudScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {aiAnalysis.fraudScore}/100
                    </span>
                  </div>
                  <div className={`text-xs px-3 py-1.5 rounded ${aiAnalysis.isFraudulent ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {aiAnalysis.recommendation}
                  </div>
                  <p className="text-purple-200 text-xs">{aiAnalysis.explanation}</p>
                </div>
              ) : (
                <p className="text-purple-300 text-sm">Run deep analysis to correlate active alerts.</p>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Model Health</h3>
              <div className="space-y-2 text-sm">
                <p className="text-purple-200">Isolation Forest: <span className="text-white font-semibold">{modelHealth?.status || 'Unknown'}</span></p>
                <p className="text-purple-200">Average Fraud Score Today: <span className="text-white font-semibold">{((modelHealth?.averageFraudScoreToday || 0) * 100).toFixed(1)}%</span></p>
                <p className="text-purple-200">Alert Rate: <span className="text-white font-semibold">{modelHealth?.alertRate ?? 0}</span></p>
                <p className="text-purple-200">Last Retrain: <span className="text-white font-semibold">{modelHealth?.lastRetrain || '-'}</span></p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Fraud Patterns (24h)</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-purple-200 mb-2">Top Fraud Signals</p>
                  {patterns.topSignals.slice(0, 4).map((row) => (
                    <div key={row.name} className="mb-2">
                      <div className="flex justify-between text-xs text-white"><span>{row.name}</span><span>{row.count}</span></div>
                      <div className="h-2 bg-white/10 rounded"><div className="h-2 bg-orange-500 rounded" style={{ width: `${Math.min(row.count * 8, 100)}%` }}></div></div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-purple-200 mb-1">Top Locations</p>
                  <p className="text-white text-xs">{patterns.topLocations.slice(0, 3).map((x) => `${x.name} (${x.count})`).join(', ') || '-'}</p>
                </div>
                <div>
                  <p className="text-purple-200 mb-1">Top Device IDs</p>
                  <p className="text-white text-xs">{patterns.topDevices.slice(0, 3).map((x) => `${x.name} (${x.count})`).join(', ') || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Severity Snapshot
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-red-500/20 rounded p-2 text-red-300">CRITICAL: {severityCount.CRITICAL}</div>
                <div className="bg-orange-500/20 rounded p-2 text-orange-300">HIGH: {severityCount.HIGH}</div>
                <div className="bg-yellow-500/20 rounded p-2 text-yellow-300">MEDIUM: {severityCount.MEDIUM}</div>
                <div className="bg-green-500/20 rounded p-2 text-green-300">LOW: {severityCount.LOW}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudDetectionDashboard;
