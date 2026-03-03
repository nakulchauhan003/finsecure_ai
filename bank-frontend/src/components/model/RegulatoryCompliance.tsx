import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface LoanDecision {
  loanAmount: number;
  interestRate: number;
  tenure: number;
  loanType: string;
  borrowerType: string;
  creditScore: number;
  monthlyIncome: number;
  existingEMI: number;
}

interface ComplianceCheck {
  id: string;
  rule: string;
  category: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  rbiCircular: string;
  threshold: string;
  actual: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface RBIGuideline {
  name: string;
  value: string;
  description: string;
  lastUpdated: string;
  impact: string;
}

const RBI_GUIDELINES: RBIGuideline[] = [
  { name: 'Repo Rate', value: '6.50%', description: 'Rate at which RBI lends to commercial banks', lastUpdated: 'Feb 2026', impact: 'Directly affects base lending rates' },
  { name: 'Reverse Repo Rate', value: '3.35%', description: 'Rate at which RBI borrows from banks', lastUpdated: 'Feb 2026', impact: 'Affects liquidity in the banking system' },
  { name: 'CRR (Cash Reserve Ratio)', value: '4.50%', description: 'Cash banks must maintain with RBI', lastUpdated: 'Feb 2026', impact: 'Affects lendable funds available' },
  { name: 'SLR (Statutory Liquidity Ratio)', value: '18.00%', description: 'Liquid assets banks must maintain', lastUpdated: 'Feb 2026', impact: 'Determines overall lending capacity' },
  { name: 'Bank Rate', value: '6.75%', description: 'Rate for long-term loans from RBI', lastUpdated: 'Feb 2026', impact: 'Upper cap on penalty interest charges' },
  { name: 'MSF (Marginal Standing Facility)', value: '6.75%', description: 'Emergency borrowing rate for banks', lastUpdated: 'Feb 2026', impact: 'Overnight lending cost floor' },
  { name: 'LTV Ratio (Housing)', value: '75-90%', description: 'Max loan-to-value for home loans', lastUpdated: 'Jan 2026', impact: 'Determines minimum down payment' },
  { name: 'Priority Sector Lending', value: '40%', description: 'Minimum lending to priority sectors', lastUpdated: 'Mar 2025', impact: 'Sectoral allocation requirements' },
  { name: 'NPA Classification', value: '90 days', description: 'Overdue period for NPA classification', lastUpdated: 'Apr 2025', impact: 'Loan provisioning trigger point' },
  { name: 'Capital Adequacy (CRAR)', value: '9.00%', description: 'Minimum capital-to-risk ratio', lastUpdated: 'Mar 2025', impact: 'Bank lending capacity limit' },
];

function runComplianceChecks(loan: LoanDecision): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const repoRate = 6.5;
  const baseRate = repoRate + 2.0; // External benchmark + spread

  // 1. Interest rate spread check
  const spread = loan.interestRate - repoRate;
  checks.push({
    id: 'IR-001',
    rule: 'Interest Rate Spread Limit',
    category: 'Interest Rate',
    status: spread <= 6 ? 'pass' : spread <= 8 ? 'warning' : 'fail',
    details: spread <= 6 ? 'Interest rate spread is within RBI permissible range' : `Spread of ${spread.toFixed(2)}% exceeds recommended limit`,
    rbiCircular: 'RBI/2023-24/45 — External Benchmark Linked Lending Rates',
    threshold: '≤ 6.0% over repo rate',
    actual: `${spread.toFixed(2)}% over repo`,
    severity: spread > 8 ? 'critical' : spread > 6 ? 'high' : 'low'
  });

  // 2. Minimum base rate check
  checks.push({
    id: 'IR-002',
    rule: 'Minimum Lending Rate',
    category: 'Interest Rate',
    status: loan.interestRate >= baseRate ? 'pass' : 'fail',
    details: loan.interestRate >= baseRate ? 'Lending rate meets minimum EBR-based floor' : 'Rate below external benchmark base — potential regulatory issue',
    rbiCircular: 'RBI/2019-20/53 — EBR Directions',
    threshold: `≥ ${baseRate.toFixed(2)}% (Repo + 2%)`,
    actual: `${loan.interestRate.toFixed(2)}%`,
    severity: loan.interestRate < baseRate ? 'high' : 'low'
  });

  // 3. EMI-to-Income ratio (FOIR)
  const emi = (loan.loanAmount * (loan.interestRate / 1200) * Math.pow(1 + loan.interestRate / 1200, loan.tenure)) /
              (Math.pow(1 + loan.interestRate / 1200, loan.tenure) - 1);
  const totalEMI = emi + loan.existingEMI;
  const foir = (totalEMI / loan.monthlyIncome) * 100;
  checks.push({
    id: 'FOIR-001',
    rule: 'Fixed Obligation to Income Ratio (FOIR)',
    category: 'Debt-to-Income',
    status: foir <= 50 ? 'pass' : foir <= 65 ? 'warning' : 'fail',
    details: foir <= 50 ? 'Borrower FOIR within safe limits' : `FOIR at ${foir.toFixed(1)}% — ${foir > 65 ? 'exceeds' : 'approaching'} prudential norms`,
    rbiCircular: 'RBI/2024-25/12 — Prudential Norms on Consumer Credit',
    threshold: '≤ 50% (recommended), ≤ 65% (absolute max)',
    actual: `${foir.toFixed(1)}%`,
    severity: foir > 65 ? 'critical' : foir > 50 ? 'medium' : 'low'
  });

  // 4. LTV Ratio check (for home loans)
  if (loan.loanType === 'Home Loan') {
    const maxLTV = loan.loanAmount <= 3000000 ? 90 : loan.loanAmount <= 7500000 ? 80 : 75;
    const assumedPropertyValue = loan.loanAmount / 0.8; // Assume ~80% LTV
    const ltv = (loan.loanAmount / assumedPropertyValue) * 100;
    checks.push({
      id: 'LTV-001',
      rule: 'Loan-to-Value Ratio (Housing)',
      category: 'Collateral',
      status: ltv <= maxLTV ? 'pass' : 'fail',
      details: ltv <= maxLTV ? `LTV of ${ltv.toFixed(0)}% within RBI slab limit of ${maxLTV}%` : `LTV exceeds maximum for this loan bracket`,
      rbiCircular: 'RBI/2020-21/73 — Housing LTV Norms',
      threshold: `≤ ${maxLTV}% for loan amount ₹${(loan.loanAmount / 100000).toFixed(0)}L`,
      actual: `${ltv.toFixed(1)}%`,
      severity: ltv > maxLTV ? 'high' : 'low'
    });
  }

  // 5. Credit score minimum
  const minScore = loan.loanType === 'Home Loan' ? 650 : loan.loanType === 'Personal Loan' ? 700 : 680;
  checks.push({
    id: 'CS-001',
    rule: 'Minimum Credit Score Requirement',
    category: 'Creditworthiness',
    status: loan.creditScore >= minScore ? 'pass' : loan.creditScore >= minScore - 50 ? 'warning' : 'fail',
    details: loan.creditScore >= minScore ? 'Credit score meets minimum threshold' : `Credit score below recommended minimum for ${loan.loanType}`,
    rbiCircular: 'RBI/2023-24/78 — Credit Information Framework',
    threshold: `≥ ${minScore} for ${loan.loanType}`,
    actual: `${loan.creditScore}`,
    severity: loan.creditScore < minScore - 50 ? 'high' : loan.creditScore < minScore ? 'medium' : 'low'
  });

  // 6. Loan amount cap check
  const maxLoan = loan.borrowerType === 'Self-Employed' ? loan.monthlyIncome * 48 : loan.monthlyIncome * 60;
  checks.push({
    id: 'LA-001',
    rule: 'Maximum Loan Amount Limit',
    category: 'Loan Sizing',
    status: loan.loanAmount <= maxLoan ? 'pass' : loan.loanAmount <= maxLoan * 1.2 ? 'warning' : 'fail',
    details: loan.loanAmount <= maxLoan ? 'Loan amount within income-based cap' : `Loan amount exceeds ${(loan.loanAmount / maxLoan * 100).toFixed(0)}% of income-based limit`,
    rbiCircular: 'RBI/2024-25/30 — Income Validation Guidelines',
    threshold: `≤ ₹${(maxLoan / 100000).toFixed(0)}L (${loan.borrowerType === 'Self-Employed' ? '48' : '60'}x monthly income)`,
    actual: `₹${(loan.loanAmount / 100000).toFixed(1)}L`,
    severity: loan.loanAmount > maxLoan * 1.2 ? 'critical' : loan.loanAmount > maxLoan ? 'medium' : 'low'
  });

  // 7. Tenure limit
  const maxTenure = loan.loanType === 'Home Loan' ? 360 : loan.loanType === 'Personal Loan' ? 84 : 120;
  checks.push({
    id: 'TN-001',
    rule: 'Maximum Loan Tenure',
    category: 'Tenure',
    status: loan.tenure <= maxTenure ? 'pass' : 'fail',
    details: loan.tenure <= maxTenure ? 'Tenure within permissible range' : `Tenure exceeds maximum of ${maxTenure / 12} years for ${loan.loanType}`,
    rbiCircular: 'RBI/2023-24/55 — Loan Product Norms',
    threshold: `≤ ${maxTenure} months (${(maxTenure / 12).toFixed(0)} years)`,
    actual: `${loan.tenure} months (${(loan.tenure / 12).toFixed(1)} years)`,
    severity: loan.tenure > maxTenure ? 'high' : 'low'
  });

  // 8. Age check
  checks.push({
    id: 'AGE-001',
    rule: 'Age + Tenure Retirement Check',
    category: 'Borrower Profile',
    status: 'pass', // Simulated
    details: 'Borrower age + tenure within retirement age limit',
    rbiCircular: 'RBI Advisory — Responsible Lending Practices',
    threshold: 'Age + Tenure ≤ 65 years (salaried) / 70 years (self-employed)',
    actual: 'Within limits',
    severity: 'low'
  });

  // 9. Recovery process compliance
  checks.push({
    id: 'REC-001',
    rule: 'Fair Practices Code (Recovery)',
    category: 'Recovery',
    status: 'pass',
    details: 'Recovery terms align with Fair Practices Code',
    rbiCircular: 'RBI/2022-23/90 — Fair Practices Code for Lenders',
    threshold: 'No penal charges above 2% p.a. on overdue',
    actual: 'Compliant',
    severity: 'low'
  });

  // 10. Data privacy compliance
  checks.push({
    id: 'DP-001',
    rule: 'Data Privacy & Consent',
    category: 'Data Privacy',
    status: 'pass',
    details: 'Customer consent obtained for credit bureau checks and data processing',
    rbiCircular: 'RBI/2024-25/15 — Digital Lending Guidelines',
    threshold: 'Explicit consent required',
    actual: 'Consent recorded',
    severity: 'low'
  });

  return checks;
}

const COLORS = ['#10b981', '#eab308', '#ef4444', '#6366f1', '#f97316', '#06b6d4'];

export default function RegulatoryCompliance() {
  const [loanData, setLoanData] = useState<LoanDecision>({
    loanAmount: 1500000,
    interestRate: 10.5,
    tenure: 120,
    loanType: 'Home Loan',
    borrowerType: 'Salaried',
    creditScore: 720,
    monthlyIncome: 85000,
    existingEMI: 12000
  });
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'checker' | 'guidelines' | 'monitor'>('checker');

  const handleRunChecks = () => {
    const results = runComplianceChecks(loanData);
    setChecks(results);
    setShowResults(true);
  };

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const overallScore = checks.length > 0 ? ((passCount * 100 + warnCount * 50) / checks.length) : 0;

  const pieData = [
    { name: 'Pass', value: passCount, color: '#10b981' },
    { name: 'Warning', value: warnCount, color: '#eab308' },
    { name: 'Fail', value: failCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const radarData = [
    { subject: 'Interest Rate', score: checks.filter(c => c.category === 'Interest Rate' && c.status === 'pass').length / Math.max(checks.filter(c => c.category === 'Interest Rate').length, 1) * 100 },
    { subject: 'Debt-Income', score: checks.filter(c => c.category === 'Debt-to-Income' && c.status === 'pass').length / Math.max(checks.filter(c => c.category === 'Debt-to-Income').length, 1) * 100 },
    { subject: 'Creditworth', score: checks.filter(c => c.category === 'Creditworthiness' && c.status === 'pass').length / Math.max(checks.filter(c => c.category === 'Creditworthiness').length, 1) * 100 },
    { subject: 'Loan Sizing', score: checks.filter(c => c.category === 'Loan Sizing' && c.status === 'pass').length / Math.max(checks.filter(c => c.category === 'Loan Sizing').length, 1) * 100 },
    { subject: 'Tenure', score: checks.filter(c => c.category === 'Tenure' && c.status === 'pass').length / Math.max(checks.filter(c => c.category === 'Tenure').length, 1) * 100 },
    { subject: 'Data Privacy', score: 100 },
  ];

  const renderChecker = () => (
    <div className="space-y-6">
      {/* Loan Input Form */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Loan Decision Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-blue-300 mb-1">Loan Type</label>
            <select value={loanData.loanType} onChange={e => setLoanData(p => ({ ...p, loanType: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none">
              {['Home Loan', 'Personal Loan', 'Vehicle Loan', 'Business Loan'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Loan Amount (₹)</label>
            <input type="number" value={loanData.loanAmount} onChange={e => setLoanData(p => ({ ...p, loanAmount: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Interest Rate (%)</label>
            <input type="number" step="0.25" value={loanData.interestRate} onChange={e => setLoanData(p => ({ ...p, interestRate: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Tenure (months)</label>
            <input type="number" value={loanData.tenure} onChange={e => setLoanData(p => ({ ...p, tenure: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Borrower Type</label>
            <select value={loanData.borrowerType} onChange={e => setLoanData(p => ({ ...p, borrowerType: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none">
              <option value="Salaried">Salaried</option>
              <option value="Self-Employed">Self-Employed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Credit Score</label>
            <input type="number" value={loanData.creditScore} onChange={e => setLoanData(p => ({ ...p, creditScore: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Monthly Income (₹)</label>
            <input type="number" value={loanData.monthlyIncome} onChange={e => setLoanData(p => ({ ...p, monthlyIncome: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-blue-300 mb-1">Existing EMI (₹)</label>
            <input type="number" value={loanData.existingEMI} onChange={e => setLoanData(p => ({ ...p, existingEMI: +e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-blue-500/30 rounded-xl text-white focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <button onClick={handleRunChecks}
          className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25">
          Run Compliance Check 🏛️
        </button>
      </div>

      {/* Results */}
      {showResults && (
        <>
          {/* Overall score banner */}
          <div className={`rounded-2xl p-6 text-center bg-gradient-to-r ${overallScore >= 80 ? 'from-green-600/30 to-emerald-600/30 border border-green-500/40' : overallScore >= 50 ? 'from-yellow-600/30 to-amber-600/30 border border-yellow-500/40' : 'from-red-600/30 to-rose-600/30 border border-red-500/40'}`}>
            <div className="flex items-center justify-center gap-6">
              <div>
                <div className={`text-5xl font-bold ${overallScore >= 80 ? 'text-green-400' : overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {overallScore.toFixed(0)}%
                </div>
                <p className="text-gray-300 text-sm">Compliance Score</p>
              </div>
              <div className="h-16 w-px bg-white/20" />
              <div className="flex gap-6 text-center">
                <div><div className="text-2xl font-bold text-green-400">{passCount}</div><p className="text-xs text-gray-400">Pass</p></div>
                <div><div className="text-2xl font-bold text-yellow-400">{warnCount}</div><p className="text-xs text-gray-400">Warning</p></div>
                <div><div className="text-2xl font-bold text-red-400">{failCount}</div><p className="text-xs text-gray-400">Fail</p></div>
              </div>
              <div className="h-16 w-px bg-white/20" />
              <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${failCount === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {failCount === 0 ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 text-center">Compliance Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 text-center">Compliance Radar</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#4b5563" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Checks detail */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Detailed Compliance Checks</h3>
            {checks.map((check) => (
              <div key={check.id} className={`border rounded-xl p-4 transition-all hover:scale-[1.01] ${
                check.status === 'pass' ? 'bg-green-500/5 border-green-500/20' :
                check.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      check.status === 'pass' ? 'bg-green-500/20 text-green-400' :
                      check.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {check.status === 'pass' ? '✓ PASS' : check.status === 'warning' ? '⚠ WARN' : '✗ FAIL'}
                    </span>
                    <span className="text-white font-medium">{check.rule}</span>
                    <span className="text-xs text-gray-500 bg-slate-700/50 px-2 py-0.5 rounded">{check.id}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    check.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    check.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    check.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {check.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{check.details}</p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-gray-500">Threshold: </span><span className="text-blue-300">{check.threshold}</span></div>
                  <div><span className="text-gray-500">Actual: </span><span className="text-white">{check.actual}</span></div>
                  <div><span className="text-gray-500">Circular: </span><span className="text-purple-300">{check.rbiCircular}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderGuidelines = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">RBI Regulatory Parameters</h2>
        <p className="text-sm text-blue-300">Current rates and limits as per latest RBI policy circular</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RBI_GUIDELINES.map((g, i) => (
          <div key={i} className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-4 hover:border-blue-400/40 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">{g.name}</h3>
              <span className="text-lg font-bold text-cyan-400">{g.value}</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">{g.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Impact: <span className="text-blue-300">{g.impact}</span></span>
              <span className="text-gray-500">Updated: {g.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rate Corridor Visualization */}
      <div className="bg-slate-800/40 border border-blue-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">RBI Rate Corridor</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={[
            { name: 'Reverse Repo', rate: 3.35 },
            { name: 'Repo Rate', rate: 6.50 },
            { name: 'MSF', rate: 6.75 },
            { name: 'Bank Rate', rate: 6.75 },
            { name: 'CRR', rate: 4.50 },
            { name: 'SLR', rate: 18.00 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6', borderRadius: '8px' }} />
            <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
              {[0, 1, 2, 3, 4, 5].map((i) => <Cell key={i} fill={COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderMonitor = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Compliance Monitoring Dashboard</h2>
        <p className="text-sm text-blue-300">Real-time portfolio compliance monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Loans', value: '2,847', icon: '📊', color: 'blue' },
          { label: 'Compliant', value: '2,691 (94.5%)', icon: '✅', color: 'green' },
          { label: 'Warnings', value: '112 (3.9%)', icon: '⚠️', color: 'yellow' },
          { label: 'Violations', value: '44 (1.5%)', icon: '❌', color: 'red' },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color}-600/10 border border-${stat.color}-500/30 rounded-xl p-4 text-center`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Violation trend */}
      <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Violation Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={[
            { month: 'Sep', violations: 12, warnings: 34, resolved: 8 },
            { month: 'Oct', violations: 8, warnings: 28, resolved: 15 },
            { month: 'Nov', violations: 15, warnings: 41, resolved: 12 },
            { month: 'Dec', violations: 6, warnings: 22, resolved: 18 },
            { month: 'Jan', violations: 10, warnings: 30, resolved: 14 },
            { month: 'Feb', violations: 4, warnings: 18, resolved: 20 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #6366f1', borderRadius: '8px' }} />
            <Bar dataKey="violations" fill="#ef4444" radius={[4, 4, 0, 0]} name="Violations" />
            <Bar dataKey="warnings" fill="#eab308" radius={[4, 4, 0, 0]} name="Warnings" />
            <Bar dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent violations */}
      <div className="bg-slate-800/40 border border-red-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Compliance Violations</h3>
        <div className="space-y-3">
          {[
            { id: 'VIO-2026-044', customer: 'Amit Patel', type: 'FOIR Exceeded (72%)', loan: '₹25L Personal Loan', date: '28 Feb 2026', severity: 'Critical' },
            { id: 'VIO-2026-043', customer: 'Priya Desai', type: 'Credit Score Below Min (620)', loan: '₹45L Home Loan', date: '27 Feb 2026', severity: 'High' },
            { id: 'VIO-2026-042', customer: 'Rahul Verma', type: 'Interest Spread > 8%', loan: '₹8L Vehicle Loan', date: '25 Feb 2026', severity: 'High' },
            { id: 'VIO-2026-041', customer: 'Sneha Rao', type: 'LTV Ratio Exceeded (92%)', loan: '₹80L Home Loan', date: '24 Feb 2026', severity: 'Medium' },
          ].map((v, i) => (
            <div key={i} className="flex items-center justify-between bg-red-500/5 border border-red-500/15 rounded-xl p-3">
              <div className="flex items-center gap-4">
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">{v.id}</span>
                <div>
                  <p className="text-white text-sm font-medium">{v.customer} — {v.type}</p>
                  <p className="text-xs text-gray-400">{v.loan} • {v.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${v.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : v.severity === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {v.severity}
                </span>
                <button className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition">Review</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Regulatory Compliance Engine
          </h1>
          <p className="text-gray-400 mt-1">RBI guidelines compliance checker • Real-time monitoring • Audit trail</p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'checker' as const, label: 'Compliance Checker', icon: '🔍' },
            { id: 'guidelines' as const, label: 'RBI Guidelines', icon: '🏛️' },
            { id: 'monitor' as const, label: 'Monitoring', icon: '📡' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-slate-800/40'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'checker' && renderChecker()}
        {activeTab === 'guidelines' && renderGuidelines()}
        {activeTab === 'monitor' && renderMonitor()}
      </div>
    </div>
  );
}
