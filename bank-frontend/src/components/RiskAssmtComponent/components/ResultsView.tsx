import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Eye, Lock, BarChart3, Sparkles, FileText, X, Brain, User, Target, Info } from 'lucide-react';
import type { ScoringResponse } from '../../../services/riskAssessmentApi';
import type { AIRiskAnalysis } from '../../../utils/gemini';
import type { FormData, SalariedFormData, SelfEmployedFormData } from '../types';

interface Props {
  scoring: ScoringResponse;
  formData: FormData;
  aiInsight: AIRiskAnalysis | null;
  isAiLoading: boolean;
  onReset: () => void;
}

function getRiskIcon(category: string) {
  switch (category) {
    case 'LOW': return CheckCircle;
    case 'MEDIUM': return AlertTriangle;
    case 'HIGH': return AlertTriangle;
    case 'CRITICAL': return XCircle;
    default: return AlertTriangle;
  }
}

function getRiskColor(category: string) {
  switch (category) {
    case 'LOW': return 'green';
    case 'MEDIUM': return 'yellow';
    case 'HIGH': return 'orange';
    case 'CRITICAL': return 'red';
    default: return 'yellow';
  }
}

function getRiskColorClasses(color: string) {
  const colors: Record<string, string> = {
    green: 'from-green-500/30 to-emerald-500/30 border-green-400/50',
    yellow: 'from-yellow-500/30 to-amber-500/30 border-yellow-400/50',
    orange: 'from-orange-500/30 to-red-500/30 border-orange-400/50',
    red: 'from-red-500/30 to-rose-500/30 border-red-400/50',
  };
  return colors[color] || colors.green;
}

export default function ResultsView({ scoring, formData, aiInsight, isAiLoading, onReset }: Props) {
  const [showDetail, setShowDetail] = React.useState(false);
  const riskColor = getRiskColor(scoring.risk_category);
  const RiskIcon = getRiskIcon(scoring.risk_category);

  return (
    <div className="space-y-6">
      {/* Approval / Rejection Banner */}
      <div className={`rounded-xl p-5 flex items-center justify-between border-2 ${
        scoring.approved
          ? 'bg-green-500/20 border-green-400/60'
          : 'bg-red-500/20 border-red-400/60'
      }`}>
        <div className="flex items-center gap-4">
          {scoring.approved
            ? <CheckCircle className="w-10 h-10 text-green-400" />
            : <XCircle className="w-10 h-10 text-red-400" />}
          <div>
            <p className={`text-2xl font-bold ${scoring.approved ? 'text-green-300' : 'text-red-300'}`}>
              Application {scoring.approved ? 'APPROVED' : 'REJECTED'}
            </p>
            <p className="text-white/70 text-sm">
              {scoring.approved
                ? `Calibrated PD ${(scoring.pd * 100).toFixed(1)}% is within the ${scoring.threshold.risk_appetite} cutoff of ${(scoring.threshold.pd_cutoff * 100).toFixed(0)}%`
                : `Calibrated PD ${(scoring.pd * 100).toFixed(1)}% exceeds the ${scoring.threshold.risk_appetite} cutoff of ${(scoring.threshold.pd_cutoff * 100).toFixed(0)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Score Card */}
      <div className={`bg-gradient-to-br ${getRiskColorClasses(riskColor)} backdrop-blur-lg rounded-xl border p-8`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Risk Assessment Complete</h2>
            <p className="text-white/80">{formData.name || 'Customer'} — Application Analysis</p>
          </div>
          <RiskIcon className={`w-12 h-12 text-${riskColor === 'yellow' || riskColor === 'orange' ? 'yellow' : riskColor}-400 mt-4 md:mt-0`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-white/80 mb-2">Risk Score</p>
            <p className="text-5xl font-bold text-white">{scoring.risk_score.toFixed(0)}/100</p>
          </div>
          <div className="text-center">
            <p className="text-white/80 mb-2">Default Probability</p>
            <p className="text-3xl font-bold text-white">{(scoring.pd * 100).toFixed(1)}%</p>
            {scoring.raw_pd !== undefined && Math.abs(scoring.raw_pd - scoring.pd) > 0.001 && (
              <p className="text-white/60 text-xs mt-1">Raw: {(scoring.raw_pd * 100).toFixed(1)}% → Calibrated</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-white/80 mb-2">Risk Category</p>
            <p className="text-3xl font-bold text-white">{scoring.risk_category}</p>
          </div>
          <div className="text-center">
            <p className="text-white/80 mb-2">Recommended Rate</p>
            <p className="text-3xl font-bold text-white">
              {scoring.interest_rate ? `${scoring.interest_rate}%` : 'N/A'}
            </p>
            {scoring.interest_rate && <p className="text-white/80 mt-1">per annum</p>}
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20">
          <p className="text-white font-medium flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {scoring.recommendation}
          </p>
          <p className="text-indigo-200 text-sm mt-2">
            Risk appetite: <strong>{scoring.threshold.risk_appetite}</strong> (PD cutoff: {(scoring.threshold.pd_cutoff * 100).toFixed(0)}%)
            {scoring.threshold.fraud_penalty > 0 && ` | Fraud penalty applied: +${(scoring.threshold.fraud_penalty * 100).toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-indigo-400" />
          Financial Ratios (Computed)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-indigo-300 text-sm mb-1">DTI Ratio</p>
            <p className="text-2xl font-bold text-white">{(scoring.financial_ratios.dti_ratio * 100).toFixed(1)}%</p>
            <p className="text-xs text-indigo-400 mt-1">{scoring.financial_ratios.dti_ratio > 0.5 ? 'High' : 'Healthy'}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-indigo-300 text-sm mb-1">FOIR</p>
            <p className="text-2xl font-bold text-white">{(scoring.financial_ratios.foir * 100).toFixed(1)}%</p>
            <p className="text-xs text-indigo-400 mt-1">{scoring.financial_ratios.foir > 0.5 ? 'Above RBI limit' : 'Within limit'}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-indigo-300 text-sm mb-1">Loan-to-Income</p>
            <p className="text-2xl font-bold text-white">{scoring.financial_ratios.loan_to_income.toFixed(2)}x</p>
            <p className="text-xs text-indigo-400 mt-1">Annual income multiple</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-indigo-300 text-sm mb-1">DSCR</p>
            <p className="text-2xl font-bold text-white">{scoring.financial_ratios.dscr.toFixed(2)}</p>
            <p className="text-xs text-indigo-400 mt-1">{scoring.financial_ratios.dscr >= 1.5 ? 'Strong' : scoring.financial_ratios.dscr >= 1 ? 'Adequate' : 'Weak'}</p>
          </div>
        </div>
      </div>

      {/* Fraud Detection */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-6 h-6 text-red-400" />
          Fraud Detection — Isolation Forest + Rules
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">Fraud Probability</p>
            <p className={`text-xl font-bold ${scoring.fraud.probability > 0.5 ? 'text-red-400' : scoring.fraud.probability > 0.3 ? 'text-yellow-400' : 'text-green-400'}`}>
              {(scoring.fraud.probability * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">Anomaly Score</p>
            <p className="text-xl font-bold text-white">{scoring.fraud.anomaly_score.toFixed(3)}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${scoring.fraud.is_anomaly ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
            {scoring.fraud.is_anomaly ? 'Anomaly Detected' : 'Normal Pattern'}
          </div>
        </div>
        {scoring.fraud.flags.length > 0 ? (
          <div className="space-y-3">
            {scoring.fraud.flags.map((flag, i) => (
              <div key={i}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  flag.severity === 'danger' ? 'bg-red-500/20 border-red-400/50' : 'bg-yellow-500/20 border-yellow-400/50'
                }`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${flag.severity === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
                <p className="text-white">{flag.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-300 text-sm">No fraud flags detected.</p>
        )}
      </div>

      {/* SHAP Feature Analysis */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          SHAP Feature Analysis — Real XGBoost Explainability
        </h3>

        {/* AI Insight Panel */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-400/30">
          <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Analysis
          </h4>
          {isAiLoading ? (
            <div className="flex items-center gap-2 text-purple-300">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Analyzing with AI...
            </div>
          ) : aiInsight ? (
            <div className="space-y-2">
              <p className="text-purple-200 text-sm">{aiInsight.explanation}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white">AI Risk Score: <strong>{aiInsight.riskScore}/100</strong></span>
                <span className="text-white">AI Category: <strong>{aiInsight.riskCategory}</strong></span>
                <span className="text-white">AI Rate: <strong>{aiInsight.suggestedRate}%</strong></span>
              </div>
              {aiInsight.keyFactors?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiInsight.keyFactors.map((f, i) => (
                    <span key={i} className={`px-2 py-1 rounded-full text-xs ${
                      f.impact === 'positive' ? 'bg-green-500/20 text-green-300' :
                      f.impact === 'negative' ? 'bg-red-500/20 text-red-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {f.factor}: {f.detail}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-purple-300 text-sm">AI analysis unavailable</p>
          )}
        </div>

        <div className="space-y-4">
          {scoring.shap_values.map((sv, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">{sv.feature}</h4>
                  <p className="text-indigo-300 text-sm">{sv.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${sv.shap_value < -0.05 ? 'text-green-400' : sv.shap_value > 0.05 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {sv.shap_value > 0 ? '+' : ''}{sv.shap_value.toFixed(4)}
                  </p>
                  <p className="text-white/60 text-sm">SHAP Value</p>
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sv.shap_value < -0.05 ? 'bg-green-400' : sv.shap_value > 0.05 ? 'bg-red-400' : 'bg-yellow-400'
                  }`}
                  style={{ width: `${Math.min(Math.abs(sv.shap_value) / (Math.max(...scoring.shap_values.map(s => Math.abs(s.shap_value))) || 1) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Metadata */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-indigo-400" />
          Model Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">Model Version</p>
            <p className="text-lg font-bold text-white">{scoring.model_metadata.model_version}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">Trained On</p>
            <p className="text-lg font-bold text-white">{scoring.model_metadata.train_date}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">ROC-AUC</p>
            <p className="text-lg font-bold text-white">{scoring.model_metadata.auc}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-indigo-300 text-xs">Features</p>
            <p className="text-lg font-bold text-white">{scoring.model_metadata.n_features}</p>
          </div>
        </div>
      </div>

      {/* Detailed Explanation Toggle */}
      <div className="flex justify-center gap-4">
        <button onClick={() => setShowDetail(!showDetail)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center gap-3 hover:scale-105">
          <FileText className="w-6 h-6" />
          {showDetail ? 'Hide Detail' : 'View Detailed Breakdown'}
        </button>
        <button onClick={onReset}
          className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center gap-3">
          New Assessment
        </button>
      </div>

      {/* Detailed Explanation */}
      {showDetail && (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg rounded-xl border-2 border-indigo-400/50 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              Complete Risk Analysis Breakdown
            </h3>
            <button onClick={() => setShowDetail(false)} className="text-indigo-300 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Customer Profile Summary */}
            <div className="bg-white/10 rounded-lg p-6 border border-white/20">
              <h4 className="text-xl font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" /> Customer Profile Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-indigo-300 text-sm mb-1">Credit Score</p>
                  <p className="text-2xl font-bold text-white">{formData.creditScore}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-indigo-300 text-sm mb-1">Loan Amount</p>
                  <p className="text-2xl font-bold text-white">₹{parseInt(formData.loanAmount || '0').toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-indigo-300 text-sm mb-1">Previous Defaults</p>
                  <p className="text-2xl font-bold text-white">{formData.previousDefaults}</p>
                </div>
                {formData.employmentType === 'salaried' && (
                  <>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Monthly Salary</p>
                      <p className="text-2xl font-bold text-white">₹{parseInt((formData as SalariedFormData).monthlySalary || '0').toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Total Expenditure</p>
                      <p className="text-2xl font-bold text-white">₹{parseInt((formData as SalariedFormData).totalExpenditure || '0').toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Loan Enquiries</p>
                      <p className="text-2xl font-bold text-white">{(formData as SalariedFormData).loanEnquiries}</p>
                    </div>
                  </>
                )}
                {formData.employmentType === 'self_employed' && (
                  <>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Gross Revenue</p>
                      <p className="text-2xl font-bold text-white">₹{parseInt((formData as SelfEmployedFormData).grossRevenue || '0').toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Business Margin</p>
                      <p className="text-2xl font-bold text-white">{(formData as SelfEmployedFormData).expectedMargin}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-indigo-300 text-sm mb-1">Business Age</p>
                      <p className="text-2xl font-bold text-white">{(formData as SelfEmployedFormData).businessAge} years</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ML Pipeline Explanation */}
            <div className="bg-white/10 rounded-lg p-6 border border-white/20">
              <h4 className="text-xl font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" /> Real XGBoost + SHAP + Isolation Forest Pipeline
              </h4>
              <div className="space-y-3">
                {[
                  { step: 1, title: 'XGBoost v3.0 Prediction (32K real records)', desc: `Model predicted raw PD of ${(scoring.raw_pd * 100).toFixed(1)}% using ${scoring.model_metadata.n_features} features including 4 engineered interactions` },
                  { step: 2, title: 'Isotonic Calibration', desc: `Raw PD ${(scoring.raw_pd * 100).toFixed(1)}% calibrated to ${(scoring.pd * 100).toFixed(1)}% for reliable probability estimates` },
                  { step: 3, title: 'SHAP Explainability', desc: `TreeSHAP values computed — top contributor: ${scoring.shap_values[0]?.feature} (${scoring.shap_values[0]?.shap_value.toFixed(4)})` },
                  { step: 4, title: 'Fraud Detection (Isolation Forest)', desc: `Anomaly score: ${scoring.fraud.anomaly_score.toFixed(3)} — ${scoring.fraud.is_anomaly ? 'Anomaly detected' : 'Normal pattern'} — ${scoring.fraud.flags.length} flag(s)` },
                  { step: 5, title: 'Risk Appetite Threshold', desc: `${scoring.threshold.risk_appetite} policy applied (PD cutoff: ${(scoring.threshold.pd_cutoff * 100).toFixed(0)}%)` },
                  { step: 6, title: 'Final Decision', desc: `${scoring.approved ? 'Approved' : 'Rejected'} — Risk score: ${scoring.risk_score.toFixed(1)}/100 — Category: ${scoring.risk_category}` },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white">{step}</div>
                    <div className="flex-grow">
                      <p className="text-white font-medium mb-1">{title}</p>
                      <p className="text-indigo-200 text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
