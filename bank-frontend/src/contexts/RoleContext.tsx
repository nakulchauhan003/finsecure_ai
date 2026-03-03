import { useState, useEffect, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import { RoleContext, ROLE_PERMISSIONS, type UserRole, type RolePermissions } from '../Hooks/useRole';

export default function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [role, setRole] = useState<UserRole>('customer');

  useEffect(() => {
    const userRole = user?.user_metadata?.role?.toLowerCase();
    if (userRole === 'admin') setRole('admin');
    else if (userRole === 'loan_officer' || userRole === 'officer') setRole('loan_officer');
    else if (userRole === 'auditor') setRole('auditor');
    else if (user) setRole('customer');
    else setRole('guest');
  }, [user]);

  const permissions: RolePermissions = ROLE_PERMISSIONS[role];
  const hasPermission = (perm: keyof RolePermissions) => permissions[perm];

  return (
    <RoleContext.Provider value={{ role, permissions, setRole, hasPermission }}>
      {children}
    </RoleContext.Provider>
  );
}
