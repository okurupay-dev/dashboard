import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { userSyncService } from '../supabase/services';

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
  const isDevelopment = process.env.NODE_ENV === 'development';
  const { user, isLoaded } = useUser();
  
  // In development mode, return mock user metadata
  if (isDevelopment) {
    const mockMetadata: UserMetadata = {
      merchantId: 'merchant-dev-123',
      role: 'admin',
      approved: true
    };
    return { isLoaded: true, metadata: mockMetadata };
  }
  
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

// Hook to automatically sync user with database on first login
export const useAutoUserSync = () => {
  const { user, isLoaded } = useUser();
  const { metadata } = useUserMetadata();
  
  useEffect(() => {
    const syncUserToDatabase = async () => {
      // Only sync if user is loaded and has metadata
      if (!isLoaded || !user || !metadata.merchantId || !metadata.approved) {
        return;
      }

      try {
        console.log('Auto-syncing user to database...');
        
        // Check if user already exists in database
        const existingUser = await userSyncService.getUserByClerkId(user.id);
        
        if (!existingUser) {
          // User doesn't exist in database, sync them
          const publicMetadata = user.publicMetadata || {};
          const privateMetadata = (user as any).privateMetadata || {};
          
          await userSyncService.syncUserFromClerk(user, publicMetadata, privateMetadata);
          console.log('User successfully synced to database');
        } else {
          console.log('User already exists in database');
        }
      } catch (error) {
        console.error('Failed to auto-sync user to database:', error);
      }
    };

    syncUserToDatabase();
  }, [isLoaded, user?.id, metadata.merchantId, metadata.approved]);
};
