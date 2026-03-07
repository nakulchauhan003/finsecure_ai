import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Brain, Download, Sparkles, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import {
  predictLoan,
  explainLoanLime,
  getCounterfactual,
  getGlobalInsights,
  type PredictLoanRequest,
  type PredictLoanResponse,
  type LimeResponse,
  type CounterfactualResponse,
  type GlobalInsightsResponse,
} from '../../services/loanExplainabilityApi';
import { explainLoanDecision, type AILoanExplanation } from '../../utils/ai';

type RiskAssessmentContext = {
  applicantId?: string;
  name?: string;
  employmentType?: 'salaried' | 'self_employed' | 'self-employed' | string;
  creditScore?: number;
  annualIncome?: number;
  loanAmount?: number;
  term?: number;
};

const STORAGE_KEY = 'finsecure.latest_risk_assessment';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function normalizeEmploymentType(value?: string): 'salaried' | 'self_employed' {
  if (!value) return 'salaried';
  const normalized = value.toLowerCase().replace(/[-\s]/g, '_');
  return normalized === 'self_employed' ? 'self_employed' : 'salaried';
}

function buildRequest(context: RiskAssessmentContext | null): PredictLoanRequest {
  return {
    applicant_id: context?.applicantId || 'XAI-DEMO-001',
    credit_score: Number(context?.creditScore || 720),
    income: Number(context?.annualIncome || 900000),
    loan_amount: Number(context?.loanAmount || 500000),
    term: Number(context?.term || 36),
    employment_type: normalizeEmploymentType(context?.employmentType),
  };
}

function getShapColor(value: number) {
  return value >= 0 ? '#ef4444' : '#22c55e';
}

type GlobalShapResponse = {
  status: 'available' | 'unavailable' | 'error';
  global_feature_importance?: Array<{
    feature: string;
    importance: number;
    impact_direction: string;
  }>;
  shap_summary_data?: {
    features: string[];
    impacts: number[];
    directions: string[];
  };
  samples_used?: number;
  message?: string;
};

async function getGlobalShapSummary(): Promise<GlobalShapResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/risk/global-shap-summary`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatPct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export default function LoanExplainabilityDashboard() {
  const [request, setRequest] = useState<PredictLoanRequest>({
    applicant_id: 'XAI-DEMO-001',
    credit_score: 720,
    income: 900000,
    loan_amount: 500000,
    term: 36,
    employment_type: 'salaried',
  });
  const [prediction, setPrediction] = useState<PredictLoanResponse | null>(null);
  const [lime, setLime] = useState<LimeResponse | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResponse | null>(null);
  const [globalInsights, setGlobalInsights] = useState<GlobalInsightsResponse | null>(null);
  const [globalShapData, setGlobalShapData] = useState<GlobalShapResponse | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AILoanExplanation | null>(null);
  const [activeTab, setActiveTab] = useState<'shap' | 'lime' | 'counterfactual' | 'global'>('shap');
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive counterfactual sliders
  const [sliderValues, setSliderValues] = useState({
    credit_score: 720,
    income: 900000,
    loan_amount: 500000,
  });
  const [sliderPrediction, setSliderPrediction] = useState<PredictLoanResponse | null>(null);
  const [showSliders, setShowSliders] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: RiskAssessmentContext | null = raw ? JSON.parse(raw) : null;
      setRequest(buildRequest(parsed));
    } catch {
      setRequest(buildRequest(null));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadCore() {
      setLoading(true);
      setError(null);
      try {
        const [pred, global, globalShap] = await Promise.all([
          predictLoan(request),
          getGlobalInsights(),
          getGlobalShapSummary(),
        ]);
        if (!mounted) return;
        setPrediction(pred);
        setGlobalInsights(global);
        setGlobalShapData(globalShap);

        const ai = await explainLoanDecision({
          applicantId: pred.applicant_id,
          decision: pred.decision,
          approvalProbability: pred.approval_probability,
          pd: pred.pd,
          shapValues: pred.shap_values,
          reasonCodes: pred.reason_codes,
          counterfactual: {},
        });
        if (!mounted) return;
        setAiExplanation(ai);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load explainability data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCore();
    return () => {
      mounted = false;
    };
  }, [request]);

  useEffect(() => {
    if (!prediction) return;
    const currentDecision = prediction.decision;
    if (activeTab !== 'lime' && activeTab !== 'counterfactual') return;

    async function loadTabData() {
      setLoadingTab(true);
      try {
        if (activeTab === 'lime' && !lime) {
          const data = await explainLoanLime(request);
          setLime(data);
        }
        if (activeTab === 'counterfactual' && !counterfactual) {
          const data = await getCounterfactual({
            applicant_id: request.applicant_id,
            target: currentDecision === 'approved' ? 'reject' : 'approve',
            features: request,
          });
          setCounterfactual(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tab data');
      } finally {
        setLoadingTab(false);
      }
    }

    loadTabData();
  }, [activeTab, prediction, lime, counterfactual, request]);

  const shapRows = useMemo(() => {
    if (!prediction?.raw?.shap_values) return [];
    return prediction.raw.shap_values.map((entry) => ({
      feature: entry.feature,
      featureKey: entry.feature_key,
      value: entry.shap_value,
      description: entry.description,
      fill: getShapColor(entry.shap_value),
    }));
  }, [prediction]);

  const limeRows = useMemo(() => {
    if (!lime?.lime_weights) return [];
    return Object.entries(lime.lime_weights).map(([feature, value]) => ({
      feature,
      value,
      fill: getShapColor(value),
    }));
  }, [lime]);

  const distribution = useMemo(() => {
    if (!globalInsights) return [];
    return [
      { name: 'Approved', value: globalInsights.approval_distribution.approved, color: '#22c55e' },
      { name: 'Rejected', value: globalInsights.approval_distribution.rejected, color: '#ef4444' },
    ];
  }, [globalInsights]);

  function exportReport() {
    if (!prediction) return;
    const report = {
      generated_at: new Date().toISOString(),
      request,
      decision: prediction.decision,
      approval_probability: prediction.approval_probability,
      pd: prediction.pd,
      reason_codes: reasonCodes,
      top_features: prediction.top_features,
      shap_values: prediction.shap_values,
      counterfactual: counterfactual?.minimal_changes || null,
      ai_explanation: aiExplanation,
      model_card: modelMetadata,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xai_report_${request.applicant_id || 'applicant'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generatePdfReport() {
    if (!prediction) return;
    try {
      const response = await fetch(`${API_BASE}/api/risk/generate_xai_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_name: localStorage.getItem('finsecure.applicant_name') || 'Applicant',
          applicant_id: request.applicant_id,
          decision: prediction.decision,
          approval_probability: prediction.approval_probability,
          pd: prediction.pd,
          shap_values: prediction.shap_values,
          reason_codes: reasonCodes,
          counterfactual_suggestions: counterfactual?.minimal_changes || {},
          global_insights: globalInsights,
          model_metadata: modelMetadata,
          financial_ratios: prediction.financial_ratios,
          lime_weights: lime?.lime_weights,
          AI_explanation: aiExplanation?.narrativeExplanation,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xai_report_${request.applicant_id || 'applicant'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF report');
    }
  }

  useEffect(() => {
    if (!showSliders) return;
    const run = async () => {
      try {
        const newRequest = {
          ...request,
          credit_score: sliderValues.credit_score,
          income: sliderValues.income,
          loan_amount: sliderValues.loan_amount,
        };
        const result = await predictLoan(newRequest);
        setSliderPrediction(result);
      } catch {
        console.error('Slider prediction failed');
      }
    };
    run();
  }, [sliderValues, showSliders, request]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-indigo-200 text-lg">Loading real model explainability...</div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto rounded-xl border border-red-400/40 bg-red-500/10 p-6 text-red-200">
          {error || 'Unable to load explainability data'}
        </div>
      </div>
    );
  }

  const reasonCodes = Array.isArray(prediction.reason_codes) ? prediction.reason_codes : [];
  const modelMetadata = prediction.model_metadata ?? {
    model_version: 'N/A',
    n_features: 0,
    auc: 0,
    train_date: 'N/A',
  };

  const ApprovedIcon = prediction.decision === 'approved' ? CheckCircle : XCircle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="text-cyan-300" /> Loan Explainability Dashboard
            </h1>
            <p className="text-indigo-200 mt-1">Live model outputs from FastAPI + SHAP + optional LIME + counterfactual analysis</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportReport} className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 flex items-center gap-2">
              <Download size={16} /> JSON Report
            </button>
            <button onClick={generatePdfReport} className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-200 flex items-center gap-2">
              <Download size={16} /> PDF Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/20 bg-white/5 p-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <ApprovedIcon className={prediction.decision === 'approved' ? 'text-green-400' : 'text-red-400'} />
              <div>
                <p className="text-sm text-indigo-200">Decision</p>
                <p className="text-xl font-semibold uppercase">{prediction.decision}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/5 p-4">
            <p className="text-sm text-indigo-200">Approval Probability</p>
            <p className="text-3xl font-bold">{formatPct(prediction.approval_probability)}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/5 p-4">
            <p className="text-sm text-indigo-200">PD</p>
            <p className="text-3xl font-bold">{formatPct(prediction.pd)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/20 bg-white/5 p-5 lg:col-span-2">
            <div className="flex gap-2 mb-4">
              {(['shap', 'lime', 'counterfactual', 'global'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm ${activeTab === tab ? 'bg-cyan-500/30 text-cyan-100' : 'bg-white/5 text-indigo-200'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {loadingTab && <p className="text-indigo-300 text-sm mb-3">Loading tab data...</p>}

            {activeTab === 'shap' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Real SHAP Contributions</h3>
                <div className="h-80 bg-slate-950/40 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shapRows} layout="vertical" margin={{ top: 8, right: 24, left: 100, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                      <XAxis type="number" stroke="#cbd5e1" />
                      <YAxis type="category" dataKey="feature" width={130} stroke="#cbd5e1" />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shapRows.slice(0, 4).map((row) => (
                    <div key={row.featureKey} className="rounded-lg border border-white/15 bg-white/5 p-3">
                      <p className="font-medium">{row.feature}</p>
                      <p className="text-xs text-indigo-200 mt-1">{row.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'lime' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">LIME Explanation</h3>
                {limeRows.length === 0 ? (
                  <p className="text-indigo-200 text-sm">LIME not available yet for this environment.</p>
                ) : (
                  <div className="h-80 bg-slate-950/40 rounded-lg p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={limeRows} layout="vertical" margin={{ top: 8, right: 24, left: 100, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                        <XAxis type="number" stroke="#cbd5e1" />
                        <YAxis type="category" dataKey="feature" width={130} stroke="#cbd5e1" />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'counterfactual' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Counterfactual Analysis & Interactive Sliders</h3>
                  <button
                    onClick={() => {
                      setShowSliders(!showSliders);
                      setSliderValues({
                        credit_score: request.credit_score,
                        income: request.income,
                        loan_amount: request.loan_amount,
                      });
                    }}
                    className="text-xs px-3 py-1 rounded bg-blue-500/20 border border-blue-400/40 text-blue-200"
                  >
                    {showSliders ? 'Hide' : 'Show'} Sliders
                  </button>
                </div>

                {counterfactual?.minimal_changes && Object.keys(counterfactual.minimal_changes).length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3 text-indigo-100">
                      <p className="text-sm font-medium mb-2">Suggested Changes to Improve Approval:</p>
                      {Object.entries(counterfactual.minimal_changes).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-sm mb-1">
                          <TrendingUp size={14} /> <strong>{k}</strong>: {v}
                        </div>
                      ))}
                      <p className="text-sm mt-2 border-t border-indigo-400/30 pt-2">New approval probability: <strong>{formatPct(counterfactual.new_probability)}</strong></p>
                    </div>
                    {counterfactual.options && counterfactual.options.length > 1 && (
                      <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-100">
                        <p className="text-sm font-medium mb-2">Alternative Options</p>
                        <div className="space-y-2">
                          {counterfactual.options.slice(0, 3).map((option, idx) => (
                            <div key={`option-${idx}`} className="rounded border border-cyan-400/20 p-2 text-xs">
                              <p className="font-semibold">Option {idx + 1}</p>
                              <p>Changes: {Object.entries(option.minimal_changes || {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'No change'}</p>
                              <p>Projected Approval Probability: {formatPct(option.new_probability)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-indigo-200 text-sm">No actionable counterfactual found in configured action bounds.</p>
                )}

                {showSliders && (
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 space-y-4">
                    <p className="text-sm text-blue-100 font-medium">Adjust features to see real-time impact on approval probability</p>
                    
                    {/* Credit Score Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-blue-100">Credit Score</label>
                        <span className="text-sm font-bold text-blue-300">{sliderValues.credit_score}</span>
                      </div>
                      <input
                        type="range"
                        min="300"
                        max="900"
                        value={sliderValues.credit_score}
                        onChange={(e) => setSliderValues({ ...sliderValues, credit_score: Number(e.target.value) })}
                        className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-blue-200">
                        <span>300</span>
                        <span>900</span>
                      </div>
                    </div>

                    {/* Income Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-blue-100">Annual Income</label>
                        <span className="text-sm font-bold text-blue-300">₹{(sliderValues.income / 100000).toFixed(1)}L</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5000000"
                        step="50000"
                        value={sliderValues.income}
                        onChange={(e) => setSliderValues({ ...sliderValues, income: Number(e.target.value) })}
                        className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-blue-200">
                        <span>₹0</span>
                        <span>₹50L</span>
                      </div>
                    </div>

                    {/* Loan Amount Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-blue-100">Loan Amount</label>
                        <span className="text-sm font-bold text-blue-300">₹{(sliderValues.loan_amount / 100000).toFixed(1)}L</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="5000000"
                        step="50000"
                        value={sliderValues.loan_amount}
                        onChange={(e) => setSliderValues({ ...sliderValues, loan_amount: Number(e.target.value) })}
                        className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-blue-200">
                        <span>₹0.1L</span>
                        <span>₹50L</span>
                      </div>
                    </div>

                    {sliderPrediction && (
                      <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-3 mt-4">
                        <p className="text-sm text-green-200 font-medium mb-2">Real-time Prediction with Adjusted Values:</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-green-300">Decision: <strong>{sliderPrediction.decision.toUpperCase()}</strong></p>
                            <p className="text-xs text-green-300">Approval Probability: <strong>{formatPct(sliderPrediction.approval_probability)}</strong></p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-green-300">Change: <strong>{formatPct(sliderPrediction.approval_probability - (prediction?.approval_probability || 0))}</strong></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'global' && globalInsights && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Global Explainability</h3>
                <div className="h-72 bg-slate-950/40 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        globalShapData?.status === 'available' && globalShapData.global_feature_importance
                          ? globalShapData.global_feature_importance.slice(0, 8)
                          : globalInsights.feature_importance.slice(0, 8)
                      }
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 120, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                      <XAxis type="number" stroke="#cbd5e1" />
                      <YAxis type="category" dataKey="feature" width={140} stroke="#cbd5e1" />
                      <Tooltip />
                      <Bar dataKey="importance" fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {globalShapData?.status === 'available' && (
                  <p className="text-xs text-cyan-200">
                    True global SHAP computed from {globalShapData.samples_used} sampled training rows.
                  </p>
                )}
                <p className="text-xs text-indigo-300">{globalInsights.fairness_metrics.note}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/20 bg-white/5 p-4">
              <h3 className="font-semibold mb-2">Top Reasons</h3>
              {reasonCodes.length === 0 ? (
                <p className="text-sm text-indigo-200">Reason codes are unavailable for this prediction.</p>
              ) : (
                <ol className="space-y-2 text-sm text-indigo-100 list-decimal pl-5">
                  {reasonCodes.slice(0, 5).map((reason, idx) => (
                    <li key={`${reason}-${idx}`}>{reason}</li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-xl border border-white/20 bg-white/5 p-4">
              <h3 className="font-semibold mb-2">Model Card</h3>
              <div className="space-y-1 text-sm text-indigo-100">
                <p>Model Version: <strong>{modelMetadata.model_version}</strong></p>
                <p>Features: <strong>{modelMetadata.n_features}</strong></p>
                <p>AUC: <strong>{modelMetadata.auc}</strong></p>
                <p>Last Retrain: <strong>{modelMetadata.train_date}</strong></p>
              </div>
            </div>

            {globalInsights && (
              <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                <h3 className="font-semibold mb-2">Approval Distribution</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={58}>
                        {distribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles size={16} /> AI Narrative</h3>
              {aiExplanation ? (
                <p className="text-sm text-purple-100">{aiExplanation.narrativeExplanation}</p>
              ) : (
                <p className="text-sm text-purple-200 flex items-center gap-2"><AlertTriangle size={14} /> Generating explanation...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
