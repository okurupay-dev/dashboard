import { useAuth } from '../contexts/AuthContext';
import { getUserPermissions, getUserRoleFromJWT, getMerchantIdFromJWT, hasPermission, UserRole, RolePermissions } from '../lib/permissions/rolePermissions';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const userRole: UserRole = getUserRoleFromJWT(user);
  const merchantId = getMerchantIdFromJWT(user);
  const permissions = getUserPermissions(userRole);
  
  const checkPermission = (permission: keyof RolePermissions): boolean => {
    return hasPermission(userRole, permission);
  };
  
  return {
    userRole,
    merchantId,
    permissions,
    checkPermission,
    isMerchantAdmin: userRole === 'merchant_admin',
    isStaff: userRole === 'staff',
  };
};
