import { useState } from 'react';

// ---------- Role system types ----------
type UserRole = 'admin' | 'loan_officer' | 'customer' | 'auditor' | 'guest';

interface RolePermissions {
  canViewRiskBreakdown: boolean;
  canViewFullDashboard: boolean;
  canApproveLoans: boolean;
  canViewCustomerData: boolean;
  canExportReports: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canViewComplianceReport: boolean;
  canModifySettings: boolean;
  canViewBlockchainLedger: boolean;
  canRunMLModels: boolean;
  canViewRevenueDashboard: boolean;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  status: 'allowed' | 'denied';
  details: string;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewRiskBreakdown: true, canViewFullDashboard: true, canApproveLoans: true,
    canViewCustomerData: true, canExportReports: true, canManageUsers: true,
    canViewAuditLogs: true, canViewComplianceReport: true, canModifySettings: true,
    canViewBlockchainLedger: true, canRunMLModels: true, canViewRevenueDashboard: true,
  },
  loan_officer: {
    canViewRiskBreakdown: true, canViewFullDashboard: true, canApproveLoans: true,
    canViewCustomerData: true, canExportReports: true, canManageUsers: false,
    canViewAuditLogs: false, canViewComplianceReport: true, canModifySettings: false,
    canViewBlockchainLedger: true, canRunMLModels: true, canViewRevenueDashboard: false,
  },
  auditor: {
    canViewRiskBreakdown: true, canViewFullDashboard: true, canApproveLoans: false,
    canViewCustomerData: true, canExportReports: true, canManageUsers: false,
    canViewAuditLogs: true, canViewComplianceReport: true, canModifySettings: false,
    canViewBlockchainLedger: true, canRunMLModels: false, canViewRevenueDashboard: true,
  },
  customer: {
    canViewRiskBreakdown: false, canViewFullDashboard: false, canApproveLoans: false,
    canViewCustomerData: false, canExportReports: false, canManageUsers: false,
    canViewAuditLogs: false, canViewComplianceReport: false, canModifySettings: false,
    canViewBlockchainLedger: false, canRunMLModels: false, canViewRevenueDashboard: false,
  },
  guest: {
    canViewRiskBreakdown: false, canViewFullDashboard: false, canApproveLoans: false,
    canViewCustomerData: false, canExportReports: false, canManageUsers: false,
    canViewAuditLogs: false, canViewComplianceReport: false, canModifySettings: false,
    canViewBlockchainLedger: false, canRunMLModels: false, canViewRevenueDashboard: false,
  }
};

const ROLE_LABELS: Record<UserRole, { label: string; color: string; icon: string }> = {
  admin: { label: 'Administrator', color: 'text-red-400 bg-red-500/20 border-red-500/30', icon: '🛡️' },
  loan_officer: { label: 'Loan Officer', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', icon: '👔' },
  auditor: { label: 'Auditor', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30', icon: '🔍' },
  customer: { label: 'Customer', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: '👤' },
  guest: { label: 'Guest', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30', icon: '👁️' },
};

// Mock audit logs
const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'AL-001', userId: 'U-001', userName: 'Admin User', role: 'admin', action: 'MODIFY_SETTINGS', resource: '/settings/compliance', timestamp: '2026-03-03T09:15:00Z', ipAddress: '192.168.1.10', status: 'allowed', details: 'Updated compliance thresholds' },
  { id: 'AL-002', userId: 'U-003', userName: 'Rajesh Officer', role: 'loan_officer', action: 'APPROVE_LOAN', resource: '/loans/LOAN-2025-3456', timestamp: '2026-03-03T08:45:00Z', ipAddress: '192.168.1.25', status: 'allowed', details: 'Approved home loan ₹45L for Vikram Singh' },
  { id: 'AL-003', userId: 'U-005', userName: 'Customer User', role: 'customer', action: 'VIEW_RISK_BREAKDOWN', resource: '/dashboard/RA', timestamp: '2026-03-03T08:30:00Z', ipAddress: '203.94.10.42', status: 'denied', details: 'Attempted to access risk breakdown — insufficient permissions' },
  { id: 'AL-004', userId: 'U-002', userName: 'Priya Auditor', role: 'auditor', action: 'EXPORT_REPORT', resource: '/reports/compliance-Q4', timestamp: '2026-03-02T17:20:00Z', ipAddress: '192.168.1.18', status: 'allowed', details: 'Exported Q4 compliance report as PDF' },
  { id: 'AL-005', userId: 'U-003', userName: 'Rajesh Officer', role: 'loan_officer', action: 'RUN_ML_MODEL', resource: '/dashboard/RA/risk-score', timestamp: '2026-03-02T16:55:00Z', ipAddress: '192.168.1.25', status: 'allowed', details: 'Ran XGBoost risk assessment for Amit Patel' },
  { id: 'AL-006', userId: 'U-005', userName: 'Customer User', role: 'customer', action: 'VIEW_AUDIT_LOGS', resource: '/security/audit', timestamp: '2026-03-02T16:10:00Z', ipAddress: '203.94.10.42', status: 'denied', details: 'Attempted to view audit logs — insufficient permissions' },
  { id: 'AL-007', userId: 'U-001', userName: 'Admin User', role: 'admin', action: 'MANAGE_USERS', resource: '/users/U-006', timestamp: '2026-03-02T15:40:00Z', ipAddress: '192.168.1.10', status: 'allowed', details: 'Changed role of user Sneha from customer to loan_officer' },
  { id: 'AL-008', userId: 'U-004', userName: 'Guest Viewer', role: 'guest', action: 'VIEW_DASHBOARD', resource: '/dashboard', timestamp: '2026-03-02T14:20:00Z', ipAddress: '45.63.128.90', status: 'denied', details: 'Guest access to full dashboard denied' },
];

// Mock RLS policies
const RLS_POLICIES = [
  { table: 'loan_applications', policy: 'loan_app_access', rule: 'auth.uid() = borrower_id OR role IN (admin, loan_officer, auditor)', enabled: true },
  { table: 'risk_assessments', policy: 'risk_view_policy', rule: 'role IN (admin, loan_officer, auditor)', enabled: true },
  { table: 'customer_profiles', policy: 'customer_data_access', rule: 'auth.uid() = id OR role IN (admin, loan_officer)', enabled: true },
  { table: 'emi_payments', policy: 'emi_history_access', rule: 'auth.uid() = borrower_id OR role IN (admin, loan_officer, auditor)', enabled: true },
  { table: 'audit_logs', policy: 'audit_view_policy', rule: 'role IN (admin, auditor)', enabled: true },
  { table: 'compliance_reports', policy: 'compliance_access', rule: 'role IN (admin, loan_officer, auditor)', enabled: true },
  { table: 'revenue_metrics', policy: 'revenue_access', rule: 'role = admin', enabled: true },
  { table: 'settings', policy: 'settings_modify', rule: 'role = admin', enabled: true },
];

// ---------- Security Dashboard Component ----------
export default function SecurityDashboard() {
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<'overview' | 'rls' | 'audit' | 'simulator'>('overview');
  const [simulatorRole, setSimulatorRole] = useState<UserRole>('customer');

  const permissions = ROLE_PERMISSIONS[currentRole];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Role selector (admin simulation) */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Role-Based Access Control</h2>
        <p className="text-sm text-gray-400 mb-4">Switch role to see different permission levels</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
            <button key={role} onClick={() => setCurrentRole(role)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                currentRole === role ? ROLE_LABELS[role].color + ' border' : 'text-gray-400 border-gray-600/30 hover:text-white hover:border-gray-500'
              }`}>
              {ROLE_LABELS[role].icon} {ROLE_LABELS[role].label}
            </button>
          ))}
        </div>
      </div>

      {/* Current role permissions matrix */}
      <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Permissions for: <span className={ROLE_LABELS[currentRole].color.split(' ')[0]}>{ROLE_LABELS[currentRole].icon} {ROLE_LABELS[currentRole].label}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(permissions) as [keyof RolePermissions, boolean][]).map(([perm, allowed]) => (
            <div key={perm} className={`flex items-center gap-3 p-3 rounded-xl border ${allowed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <span className={`text-lg ${allowed ? 'text-green-400' : 'text-red-400'}`}>{allowed ? '✅' : '🚫'}</span>
              <span className="text-sm text-white">{perm.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role comparison matrix */}
      <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Full Role-Permission Matrix</h3>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-400">Permission</th>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <th key={r} className={`p-2 text-center ${ROLE_LABELS[r].color.split(' ')[0]}`}>{ROLE_LABELS[r].icon}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(ROLE_PERMISSIONS.admin) as (keyof RolePermissions)[]).map(perm => (
              <tr key={perm} className="border-t border-white/5">
                <td className="p-2 text-gray-300 whitespace-nowrap">{perm.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</td>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                  <td key={r} className="p-2 text-center">
                    {ROLE_PERMISSIONS[r][perm] ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: '24', icon: '🔐', trend: '+3 today' },
          { label: 'Access Denials', value: '12', icon: '🚫', trend: 'Last 24h' },
          { label: 'RLS Policies', value: '8', icon: '🛡️', trend: 'All active' },
          { label: 'Security Score', value: '94%', icon: '💚', trend: 'Excellent' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800/40 border border-red-500/15 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xs text-gray-500 mt-1">{s.trend}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRLS = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Supabase Row Level Security Policies</h2>
        <p className="text-sm text-gray-400">Database-level access control for all tables</p>
      </div>

      <div className="space-y-3">
        {RLS_POLICIES.map((policy, i) => (
          <div key={i} className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">{policy.table}</span>
                <span className="text-white font-medium">{policy.policy}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${policy.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {policy.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <pre className="text-xs text-cyan-300 bg-slate-900/60 rounded-lg p-2 font-mono overflow-x-auto">
              {policy.rule}
            </pre>
          </div>
        ))}
      </div>

      {/* Suggested SQL for RLS */}
      <div className="bg-slate-800/60 border border-cyan-500/20 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-3">Supabase RLS SQL (Ready to Deploy)</h3>
        <pre className="bg-slate-900/80 rounded-xl p-4 overflow-x-auto text-xs text-cyan-300 font-mono leading-relaxed">
{`-- Enable RLS on all tables
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Loan applications: owner + staff access
CREATE POLICY loan_app_access ON loan_applications
  FOR ALL USING (
    auth.uid() = borrower_id
    OR (auth.jwt() ->> 'role') IN ('admin', 'loan_officer', 'auditor')
  );

-- Risk assessments: staff only
CREATE POLICY risk_view_policy ON risk_assessments
  FOR SELECT USING (
    (auth.jwt() ->> 'role') IN ('admin', 'loan_officer', 'auditor')
  );

-- Customer profiles: self + staff
CREATE POLICY customer_data_access ON customer_profiles
  FOR ALL USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'role') IN ('admin', 'loan_officer')
  );

-- Audit logs: admin + auditor only
CREATE POLICY audit_view_policy ON audit_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'role') IN ('admin', 'auditor')
  );

-- Revenue metrics: admin only
CREATE POLICY revenue_access ON revenue_metrics
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin'
  );`}
        </pre>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Audit Trail</h2>
        <p className="text-sm text-gray-400">Complete log of all access attempts and actions</p>
      </div>

      <div className="bg-slate-800/40 border border-purple-500/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left p-3 text-gray-400 font-medium">ID</th>
                <th className="text-left p-3 text-gray-400 font-medium">User</th>
                <th className="text-left p-3 text-gray-400 font-medium">Role</th>
                <th className="text-left p-3 text-gray-400 font-medium">Action</th>
                <th className="text-left p-3 text-gray-400 font-medium">Resource</th>
                <th className="text-center p-3 text-gray-400 font-medium">Status</th>
                <th className="text-left p-3 text-gray-400 font-medium">Time</th>
                <th className="text-left p-3 text-gray-400 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_LOGS.map(log => (
                <tr key={log.id} className={`border-t border-white/5 ${log.status === 'denied' ? 'bg-red-500/5' : ''}`}>
                  <td className="p-3 font-mono text-xs text-gray-400">{log.id}</td>
                  <td className="p-3 text-white">{log.userName}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_LABELS[log.role].color}`}>
                      {ROLE_LABELS[log.role].icon} {ROLE_LABELS[log.role].label}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300 font-mono text-xs">{log.action}</td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{log.resource}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'allowed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 text-gray-500 font-mono text-xs">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSimulator = () => {
    const simPerms = ROLE_PERMISSIONS[simulatorRole];
    const modules = [
      { name: 'Dashboard Overview', permission: 'canViewFullDashboard' as keyof RolePermissions, path: '/dashboard' },
      { name: 'Risk Assessment (Full)', permission: 'canViewRiskBreakdown' as keyof RolePermissions, path: '/dashboard/RA' },
      { name: 'Approve Loans', permission: 'canApproveLoans' as keyof RolePermissions, path: '/loans/approve' },
      { name: 'Customer Data', permission: 'canViewCustomerData' as keyof RolePermissions, path: '/customers' },
      { name: 'Revenue Dashboard', permission: 'canViewRevenueDashboard' as keyof RolePermissions, path: '/dashboard/revenue' },
      { name: 'Export Reports', permission: 'canExportReports' as keyof RolePermissions, path: '/reports/export' },
      { name: 'Audit Logs', permission: 'canViewAuditLogs' as keyof RolePermissions, path: '/security/audit' },
      { name: 'Compliance Report', permission: 'canViewComplianceReport' as keyof RolePermissions, path: '/dashboard/compliance' },
      { name: 'User Management', permission: 'canManageUsers' as keyof RolePermissions, path: '/settings/users' },
      { name: 'Blockchain Ledger', permission: 'canViewBlockchainLedger' as keyof RolePermissions, path: '/dashboard/blockchain' },
      { name: 'ML Model Inference', permission: 'canRunMLModels' as keyof RolePermissions, path: '/ml/run' },
      { name: 'System Settings', permission: 'canModifySettings' as keyof RolePermissions, path: '/settings' },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-1">Access Simulator</h2>
          <p className="text-sm text-gray-400 mb-4">Test what each role can see and access</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
              <button key={role} onClick={() => setSimulatorRole(role)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  simulatorRole === role ? ROLE_LABELS[role].color + ' border' : 'text-gray-400 border-gray-600/30 hover:text-white'
                }`}>
                {ROLE_LABELS[role].icon} {ROLE_LABELS[role].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod, i) => {
            const allowed = simPerms[mod.permission];
            return (
              <div key={i} className={`border rounded-xl p-4 transition ${
                allowed ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10' : 'bg-red-500/5 border-red-500/20 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{mod.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${allowed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {allowed ? '✓ Allowed' : '✗ Denied'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">{mod.path}</p>
                {!allowed && (
                  <p className="text-xs text-red-400 mt-2">⚠ Requires: {mod.permission.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Security & Access Control
          </h1>
          <p className="text-gray-400 mt-1">Role-based access • Supabase RLS • Audit trail • Access simulator</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview' as const, label: 'RBAC Overview', icon: '🛡️' },
            { id: 'rls' as const, label: 'RLS Policies', icon: '🔒' },
            { id: 'audit' as const, label: 'Audit Trail', icon: '📋' },
            { id: 'simulator' as const, label: 'Access Simulator', icon: '🎮' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white hover:bg-slate-800/40'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'rls' && renderRLS()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'simulator' && renderSimulator()}
      </div>
    </div>
  );
}
