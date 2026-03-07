import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'loan_summary' | 'risk_assessment' | 'compliance' | 'customer_journey' | 'portfolio';

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: string;
  sections: string[];
}

const REPORT_CONFIGS: ReportConfig[] = [
  { type: 'loan_summary', label: 'Loan Summary Report', description: 'Complete loan details with EMI schedule, interest breakdown, and repayment timeline', icon: '📋', sections: ['Loan Details', 'EMI Schedule', 'Interest Breakdown', 'Repayment Timeline'] },
  { type: 'risk_assessment', label: 'Risk Assessment Report', description: 'XGBoost-SHAP risk scoring with feature contributions and approval probability', icon: '🎯', sections: ['Risk Score', 'SHAP Analysis', 'Feature Contributions', 'Approval Decision', 'Fraud Flags'] },
  { type: 'compliance', label: 'Compliance Report', description: 'RBI regulatory compliance check results with pass/fail analysis', icon: '🏛️', sections: ['Compliance Score', 'Check Results', 'Violations', 'RBI Guidelines'] },
  { type: 'customer_journey', label: 'Customer Journey Report', description: 'End-to-end customer journey from application to disbursement', icon: '🗺️', sections: ['Application', 'KYC Verification', 'Risk Assessment', 'Decision', 'Disbursement'] },
  { type: 'portfolio', label: 'Portfolio Analysis Report', description: 'Investment portfolio performance with AI insights and recommendations', icon: '📊', sections: ['Portfolio Overview', 'Asset Allocation', 'Performance Metrics', 'AI Recommendations'] },
];

// Sample data generators for each report type
function generateLoanSummaryData() {
  return {
    loanId: 'LOAN-2025-7832',
    borrower: 'Rajesh Kumar Sharma',
    loanType: 'Home Loan',
    amount: 1500000,
    interestRate: 9.25,
    tenure: 120,
    emi: 19178,
    disbursementDate: '15-Jan-2026',
    totalInterest: 801360,
    totalPayable: 2301360,
    creditScore: 742,
    status: 'Active',
    emiSchedule: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      emi: 19178,
      principal: 7553 + i * 58,
      interest: 11625 - i * 58,
      balance: 1492447 - (7553 + i * 58) * (i + 1),
    })),
  };
}

function generateRiskAssessmentData() {
  return {
    applicant: 'Rajesh Kumar Sharma',
    loanId: 'LOAN-2025-7832',
    riskScore: 28,
    riskCategory: 'Low Risk',
    approvalProbability: 0.87,
    confidenceScore: 0.92,
    shapValues: [
      { feature: 'Credit Score (742)', impact: 0.35, direction: 'positive' },
      { feature: 'Monthly Income (₹85K)', impact: 0.22, direction: 'positive' },
      { feature: 'Account Age (6 years)', impact: 0.15, direction: 'positive' },
      { feature: 'DTI Ratio (22.5%)', impact: 0.12, direction: 'positive' },
      { feature: 'Existing EMIs (₹12K)', impact: -0.08, direction: 'negative' },
      { feature: 'Loan Amount (₹15L)', impact: -0.05, direction: 'negative' },
    ],
    fraudFlags: [],
    decision: 'APPROVED',
    interestRate: 9.25,
  };
}

function generateComplianceData() {
  return {
    score: 92,
    totalChecks: 10,
    passed: 8,
    warnings: 1,
    failed: 1,
    checks: [
      { id: 'IR-001', rule: 'Interest Rate Spread', status: 'Pass', threshold: '≤6% over repo', actual: '2.75%' },
      { id: 'IR-002', rule: 'Minimum Lending Rate', status: 'Pass', threshold: '≥8.5%', actual: '9.25%' },
      { id: 'FOIR-001', rule: 'FOIR Limit', status: 'Pass', threshold: '≤50%', actual: '36.8%' },
      { id: 'LTV-001', rule: 'LTV Ratio', status: 'Pass', threshold: '≤80%', actual: '75%' },
      { id: 'CS-001', rule: 'Credit Score Minimum', status: 'Pass', threshold: '≥650', actual: '742' },
      { id: 'LA-001', rule: 'Loan Amount Cap', status: 'Warning', threshold: '≤60x income', actual: '₹15L vs ₹51L cap' },
      { id: 'TN-001', rule: 'Tenure Limit', status: 'Pass', threshold: '≤360 months', actual: '120 months' },
      { id: 'AGE-001', rule: 'Age + Tenure Check', status: 'Pass', threshold: '≤65 years', actual: 'Within limits' },
      { id: 'REC-001', rule: 'Fair Practices Code', status: 'Pass', threshold: 'Compliant', actual: 'Compliant' },
      { id: 'DP-001', rule: 'Data Privacy', status: 'Fail', threshold: 'Consent Required', actual: 'Consent pending' },
    ],
  };
}

export default function ReportGenerator() {
  const { user } = useAuthContext();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<{ type: ReportType; timestamp: string; pages: number }[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSHAP, setIncludeSHAP] = useState(true);
  const [customerName, setCustomerName] = useState('Rajesh Kumar Sharma');
  const [loanId, setLoanId] = useState('LOAN-2025-7832');

  const generatePDF = async (type: ReportType) => {
    setGenerating(true);
    // Simulate processing time
    await new Promise(r => setTimeout(r, 1500));

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(30, 20, 60);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(200, 180, 255);
    doc.setFontSize(22);
    doc.text('FinScope', 14, 18);
    doc.setFontSize(8);
    doc.setTextColor(160, 150, 200);
    doc.text('See Risk. Simulate. Decide Smarter.', 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`User: ${user?.user_metadata?.name || 'System'}`, pageWidth - 80, 34);

    y = 50;

    // Report title
    doc.setTextColor(40, 40, 60);
    doc.setFontSize(18);
    const config = REPORT_CONFIGS.find(c => c.type === type)!;
    doc.text(config.label, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    doc.text(config.description, 14, y);
    y += 12;

    // Horizontal line
    doc.setDrawColor(180, 160, 220);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    if (type === 'loan_summary') {
      const data = generateLoanSummaryData();
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('Loan Details', 14, y); y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 80);
      const details = [
        [`Loan ID: ${data.loanId}`, `Borrower: ${data.borrower}`],
        [`Loan Type: ${data.loanType}`, `Amount: ₹${data.amount.toLocaleString()}`],
        [`Interest Rate: ${data.interestRate}%`, `Tenure: ${data.tenure} months`],
        [`EMI: ₹${data.emi.toLocaleString()}`, `Status: ${data.status}`],
        [`Disbursement: ${data.disbursementDate}`, `Credit Score: ${data.creditScore}`],
        [`Total Interest: ₹${data.totalInterest.toLocaleString()}`, `Total Payable: ₹${data.totalPayable.toLocaleString()}`],
      ];
      details.forEach(row => {
        doc.text(row[0], 14, y);
        doc.text(row[1], pageWidth / 2, y);
        y += 6;
      });
      y += 8;

      // EMI schedule table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('EMI Schedule (First 12 Months)', 14, y); y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Month', 'EMI (₹)', 'Principal (₹)', 'Interest (₹)', 'Balance (₹)']],
        body: data.emiSchedule.map(row => [
          row.month.toString(),
          row.emi.toLocaleString(),
          row.principal.toLocaleString(),
          row.interest.toLocaleString(),
          row.balance.toLocaleString(),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [60, 40, 100], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 240, 255] },
      });

    } else if (type === 'risk_assessment') {
      const data = generateRiskAssessmentData();
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('Risk Assessment Summary', 14, y); y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 80);
      doc.text(`Applicant: ${data.applicant}`, 14, y); y += 6;
      doc.text(`Loan ID: ${data.loanId}`, 14, y); y += 6;
      doc.text(`Risk Score: ${data.riskScore}/100 — ${data.riskCategory}`, 14, y); y += 6;
      doc.text(`Approval Probability: ${(data.approvalProbability * 100).toFixed(1)}%`, 14, y); y += 6;
      doc.text(`Confidence Score: ${(data.confidenceScore * 100).toFixed(1)}%`, 14, y); y += 6;
      doc.text(`Decision: ${data.decision}`, 14, y); y += 6;
      doc.text(`Recommended Rate: ${data.interestRate}%`, 14, y); y += 10;

      if (includeSHAP) {
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 60);
        doc.text('SHAP Feature Contributions', 14, y); y += 4;

        autoTable(doc, {
          startY: y,
          head: [['Feature', 'Impact', 'Direction']],
          body: data.shapValues.map(sv => [
            sv.feature,
            (sv.impact > 0 ? '+' : '') + sv.impact.toFixed(2),
            sv.direction === 'positive' ? '↑ Positive' : '↓ Negative'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [60, 40, 100], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
        });
      }

    } else if (type === 'compliance') {
      const data = generateComplianceData();
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('Regulatory Compliance Summary', 14, y); y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 80);
      doc.text(`Overall Score: ${data.score}%`, 14, y); y += 6;
      doc.text(`Total Checks: ${data.totalChecks} | Passed: ${data.passed} | Warnings: ${data.warnings} | Failed: ${data.failed}`, 14, y); y += 10;

      autoTable(doc, {
        startY: y,
        head: [['Check ID', 'Rule', 'Status', 'Threshold', 'Actual']],
        body: data.checks.map(c => [c.id, c.rule, c.status, c.threshold, c.actual]),
        theme: 'grid',
        headStyles: { fillColor: [60, 40, 100], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            if (data.cell.raw === 'Pass') data.cell.styles.textColor = [34, 197, 94];
            else if (data.cell.raw === 'Warning') data.cell.styles.textColor = [234, 179, 8];
            else if (data.cell.raw === 'Fail') data.cell.styles.textColor = [239, 68, 68];
          }
        },
      });

    } else if (type === 'customer_journey') {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('Customer Journey Report', 14, y); y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 80);
      doc.text(`Customer: ${customerName}`, 14, y); y += 6;
      doc.text(`Loan ID: ${loanId}`, 14, y); y += 10;

      const journey = [
        { stage: 'Application Submitted', date: '10-Jan-2026', status: 'Completed', details: 'Home Loan ₹15L, 10-year tenure' },
        { stage: 'KYC Verification', date: '11-Jan-2026', status: 'Completed', details: 'Aadhaar & PAN verified via AI OCR' },
        { stage: 'Document Verification', date: '11-Jan-2026', status: 'Completed', details: '4 documents processed, 0 fraud flags' },
        { stage: 'Risk Assessment', date: '12-Jan-2026', status: 'Completed', details: 'Risk Score: 28/100 — Low Risk' },
        { stage: 'Compliance Check', date: '12-Jan-2026', status: 'Completed', details: '10/10 checks passed' },
        { stage: 'Loan Approval', date: '13-Jan-2026', status: 'Completed', details: 'Approved at 9.25% by Loan Officer' },
        { stage: 'EMI Setup', date: '14-Jan-2026', status: 'Completed', details: 'EMI ₹19,178/month, blockchain-logged' },
        { stage: 'Disbursement', date: '15-Jan-2026', status: 'Completed', details: '₹15,00,000 disbursed to account' },
      ];

      autoTable(doc, {
        startY: y,
        head: [['Stage', 'Date', 'Status', 'Details']],
        body: journey.map(j => [j.stage, j.date, j.status, j.details]),
        theme: 'grid',
        headStyles: { fillColor: [60, 40, 100], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });

    } else if (type === 'portfolio') {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 60);
      doc.text('Portfolio Analysis', 14, y); y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 80);
      doc.text(`Investor: ${customerName}`, 14, y); y += 6;
      doc.text(`Portfolio Value: ₹24,50,000`, 14, y); y += 6;
      doc.text(`Total Returns: +12.8% (₹2,80,000)`, 14, y); y += 6;
      doc.text(`Risk Profile: Moderate`, 14, y); y += 10;

      const portfolio = [
        { asset: 'HDFC Balanced Advantage Fund', allocation: '25%', value: '₹6,12,500', returns: '+14.2%', aiScore: '92' },
        { asset: 'SBI Gold Fund', allocation: '20%', value: '₹4,90,000', returns: '+18.5%', aiScore: '88' },
        { asset: 'ICICI Prudential Equity Fund', allocation: '20%', value: '₹4,90,000', returns: '+11.3%', aiScore: '85' },
        { asset: 'Sovereign Gold Bonds', allocation: '15%', value: '₹3,67,500', returns: '+8.7%', aiScore: '90' },
        { asset: 'Fixed Deposits (SBI)', allocation: '10%', value: '₹2,45,000', returns: '+7.1%', aiScore: '95' },
        { asset: 'Reliance Industries', allocation: '10%', value: '₹2,45,000', returns: '+9.8%', aiScore: '82' },
      ];

      autoTable(doc, {
        startY: y,
        head: [['Asset', 'Allocation', 'Value', 'Returns', 'AI Score']],
        body: portfolio.map(p => [p.asset, p.allocation, p.value, p.returns, p.aiScore]),
        theme: 'grid',
        headStyles: { fillColor: [60, 40, 100], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 170);
      doc.text(`FinScope Analytics Report • Page ${i} of ${pageCount} • Confidential`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text('Powered by AI — XGBoost, SHAP, AI', pageWidth - 80, doc.internal.pageSize.getHeight() - 10);
    }

    // Save
    const fileName = `FinScope_${config.label.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    setGeneratedReports(prev => [...prev, { type, timestamp: new Date().toISOString(), pages: pageCount }]);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Analytics Report Generator
          </h1>
          <p className="text-gray-400 mt-1">Generate professional PDF reports with charts, decisions & AI explanations</p>
        </div>

        {/* Report type selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {REPORT_CONFIGS.map(config => (
            <div key={config.type}
              onClick={() => setSelectedReport(config.type)}
              className={`cursor-pointer border rounded-2xl p-5 transition-all hover:scale-[1.02] ${
                selectedReport === config.type
                  ? 'border-pink-400/60 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                  : 'border-purple-500/20 bg-slate-800/40 hover:border-pink-500/30'
              }`}>
              <div className="text-3xl mb-2">{config.icon}</div>
              <h3 className="text-white font-semibold mb-1">{config.label}</h3>
              <p className="text-xs text-gray-400 mb-3">{config.description}</p>
              <div className="flex flex-wrap gap-1">
                {config.sections.map((s, i) => (
                  <span key={i} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Configuration */}
        {selectedReport && (
          <div className="bg-gradient-to-r from-pink-600/20 to-rose-600/20 border border-pink-500/30 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Report Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-pink-300 mb-1">Customer Name</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-pink-500/30 rounded-xl text-white focus:border-pink-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-pink-300 mb-1">Loan ID</label>
                <input type="text" value={loanId} onChange={e => setLoanId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-pink-500/30 rounded-xl text-white focus:border-pink-400 focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={includeCharts} onChange={e => setIncludeCharts(e.target.checked)}
                  className="rounded border-pink-500/30" />
                Include Charts
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={includeSHAP} onChange={e => setIncludeSHAP(e.target.checked)}
                  className="rounded border-pink-500/30" />
                Include SHAP Analysis
              </label>
            </div>

            <button onClick={() => generatePDF(selectedReport)}
              disabled={generating}
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/25">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating PDF...
                </span>
              ) : (
                `Generate ${REPORT_CONFIGS.find(c => c.type === selectedReport)?.label} 📄`
              )}
            </button>
          </div>
        )}

        {/* Generated reports history */}
        {generatedReports.length > 0 && (
          <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Generated Reports</h3>
            <div className="space-y-2">
              {generatedReports.map((report, i) => {
                const config = REPORT_CONFIGS.find(c => c.type === report.type)!;
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-800/40 border border-purple-500/10 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{config.icon}</span>
                      <div>
                        <p className="text-white text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-gray-400">{new Date(report.timestamp).toLocaleString()} • {report.pages} page(s)</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Downloaded ✓</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
