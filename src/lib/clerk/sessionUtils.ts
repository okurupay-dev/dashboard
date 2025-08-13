import React from 'react';
import { useUser } from '@clerk/clerk-react';

// Define user roles
export type UserRole = 'admin' | 'merchant' | 'staff';

// Interface for user metadata stored in Clerk
export interface UserMetadata {
  merchantId: string;
  role: UserRole;
  approved: boolean;
}

// Default metadata for new or unapproved users
const defaultMetadata: UserMetadata = {
  merchantId: '',
  role: 'staff',
  approved: false
};

// Hook to get current user's metadata
export const useUserMetadata = () => {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded || !user) {
    return { isLoaded: false, metadata: defaultMetadata };
  }
  
  // Extract metadata from user object with type safety
  // In a real implementation, you would validate this data more thoroughly
  const publicMeta = user.publicMetadata || {};
  const metadata: UserMetadata = {
    merchantId: (publicMeta.merchantId as string) || defaultMetadata.merchantId,
    role: ((publicMeta.role as string) || defaultMetadata.role) as UserRole,
    approved: (publicMeta.approved as boolean) || defaultMetadata.approved
  };
  
  // Development bypass: auto-approve if no metadata is set (for testing)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasNoMetadata = !publicMeta.approved && !publicMeta.role && !publicMeta.merchantId;
  const isApproved = metadata.approved === true || (isDevelopment && hasNoMetadata);

  return {
    isLoaded: true,
    metadata,
    isApproved,
    role: metadata.role,
    merchantId: metadata.merchantId
  };
};

// Hook to check if user has a specific role
export const useHasRole = (requiredRole: UserRole | UserRole[]) => {
  const { isLoaded, metadata } = useUserMetadata();
  
  if (!isLoaded) {
    return { isLoaded: false, hasRole: false };
  }
  
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasRole = requiredRoles.includes(metadata.role);
  
  return { isLoaded: true, hasRole };
};

// Higher-order component to protect routes based on role
export const withRoleProtection = (
  Component: React.ComponentType<any>,
  requiredRole: UserRole | UserRole[]
): React.FC<any> => {
  return (props: any): React.ReactElement | null => {
    const { isLoaded, hasRole } = useHasRole(requiredRole);
    const { isApproved } = useUserMetadata();
    
    if (!isLoaded) {
      return React.createElement('div', null, 'Loading...');
    }
    
    if (!isApproved) {
      // Redirect to pending review page
      window.location.href = '/pending-review';
      return null;
    }
    
    if (!hasRole) {
      // Redirect to unauthorized page or dashboard
      window.location.href = '/';
      return null;
    }
    
    return React.createElement(Component, props);
  };
};
