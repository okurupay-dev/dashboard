import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { RolePermissions } from '../../lib/permissions/rolePermissions';

interface PermissionGateProps {
  permission: keyof RolePermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { checkPermission } = usePermissions();
  
  if (checkPermission(permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

interface RoleGateProps {
  allowedRoles: ('merchant_admin' | 'staff')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const { userRole } = usePermissions();
  
  if (allowedRoles.includes(userRole as 'merchant_admin' | 'staff')) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
