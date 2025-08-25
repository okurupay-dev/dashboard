// Role-based permissions for merchant dashboard
export type UserRole = 'merchant_admin' | 'staff' | 'super_admin';

export interface RolePermissions {
  // Transaction permissions
  canViewTransactions: boolean;
  canCreateTransactions: boolean;
  canRefundTransactions: boolean;
  
  // Terminal permissions
  canViewTerminals: boolean;
  canManageTerminals: boolean;
  canConfigureTerminals: boolean;
  
  // Staff permissions
  canViewStaff: boolean;
  canManageStaff: boolean;
  canInviteStaff: boolean;
  
  // Wallet permissions
  canViewWallets: boolean;
  canManageWallets: boolean;
  canVerifyWallets: boolean;
  
  // Analytics permissions
  canViewAnalytics: boolean;
  canViewReports: boolean;
  
  // Document permissions
  canViewDocuments: boolean;
  canManageDocuments: boolean;
  
  // Settings permissions
  canViewSettings: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  merchant_admin: {
    // Full access to all merchant data
    canViewTransactions: true,
    canCreateTransactions: true,
    canRefundTransactions: true,
    
    canViewTerminals: true,
    canManageTerminals: true,
    canConfigureTerminals: true,
    
    canViewStaff: true,
    canManageStaff: true,
    canInviteStaff: true,
    
    canViewWallets: true,
    canManageWallets: true,
    canVerifyWallets: true,
    
    canViewAnalytics: true,
    canViewReports: true,
    
    canViewDocuments: true,
    canManageDocuments: true,
    
    canViewSettings: true,
    canManageSettings: true,
  },
  
  staff: {
    // Read-only access to operational data only
    canViewTransactions: true,
    canCreateTransactions: true, // Staff can process payments
    canRefundTransactions: false, // No refunds for staff
    
    canViewTerminals: true,
    canManageTerminals: false,
    canConfigureTerminals: false,
    
    canViewStaff: true,
    canManageStaff: false,
    canInviteStaff: false,
    
    // No wallet access for staff
    canViewWallets: false,
    canManageWallets: false,
    canVerifyWallets: false,
    
    canViewAnalytics: true, // Basic analytics only
    canViewReports: false,
    
    // No document access for staff
    canViewDocuments: false,
    canManageDocuments: false,
    
    canViewSettings: false,
    canManageSettings: false,
  },
  
  super_admin: {
    // Super admin should be redirected to admin dashboard
    canViewTransactions: false,
    canCreateTransactions: false,
    canRefundTransactions: false,
    
    canViewTerminals: false,
    canManageTerminals: false,
    canConfigureTerminals: false,
    
    canViewStaff: false,
    canManageStaff: false,
    canInviteStaff: false,
    
    canViewWallets: false,
    canManageWallets: false,
    canVerifyWallets: false,
    
    canViewAnalytics: false,
    canViewReports: false,
    
    canViewDocuments: false,
    canManageDocuments: false,
    
    canViewSettings: false,
    canManageSettings: false,
  },
};

// Helper function to get permissions for a user
export const getUserPermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.staff;
};

// Helper function to check if user has specific permission
export const hasPermission = (role: UserRole, permission: keyof RolePermissions): boolean => {
  const permissions = getUserPermissions(role);
  return permissions[permission];
};

// Helper function to get merchant_id from JWT
export const getMerchantIdFromJWT = (user: any): string | null => {
  return user?.user_metadata?.merchant_id || null;
};

// Helper function to get user role from JWT
export const getUserRoleFromJWT = (user: any): UserRole => {
  return user?.user_metadata?.role || 'staff';
};
