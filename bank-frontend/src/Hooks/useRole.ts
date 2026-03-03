import { useContext, createContext } from 'react';

export type UserRole = 'admin' | 'loan_officer' | 'customer' | 'auditor' | 'guest';

export interface RolePermissions {
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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
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

export interface RoleContextType {
  role: UserRole;
  permissions: RolePermissions;
  setRole: (role: UserRole) => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
}

export const RoleContext = createContext<RoleContextType>({
  role: 'customer',
  permissions: ROLE_PERMISSIONS.customer,
  setRole: () => {},
  hasPermission: () => false,
});

export const useRole = () => useContext(RoleContext);
export default useRole;
