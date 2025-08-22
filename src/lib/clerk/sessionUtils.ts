import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabase/client';
import { userSyncService } from '../supabase/services';

// Define user roles
export type UserRole = 'admin' | 'merchant' | 'staff';

// Interface for user metadata stored in Clerk
export interface UserMetadata {
  merchantId: string;
  role: UserRole;
  approved: boolean;
  businessName?: string;
}

// Default metadata for new or unapproved users
const defaultMetadata: UserMetadata = {
  merchantId: '',
  role: 'staff',
  approved: false
};

// Helper function to extract user metadata from Clerk user object
export const getUserMetadata = (user: any): UserMetadata | null => {
  if (!user) return null;
  
  const publicMetadata = user.publicMetadata || {};
  
  return {
    merchantId: publicMetadata.merchantId || '',
    role: publicMetadata.role || 'staff',
    approved: publicMetadata.approved || false,
    businessName: publicMetadata.businessName
  };
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
    approved: (publicMeta.approved as boolean) || defaultMetadata.approved,
    businessName: (publicMeta.businessName as string) || undefined
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

// Helper function to get merchant ID from user
export const getMerchantId = async (user: any): Promise<string | null> => {
  if (!user) return null;
  
  // First check user metadata
  const metadata = user.publicMetadata as any;
  let merchantId = metadata?.merchantId;
  
  if (!merchantId) {
    // If not in metadata, query the users table using Clerk user ID
    const { data: userData } = await supabase
      .from('users')
      .select('merchant_id')
      .eq('clerk_user_id', user.id)
      .single();
    merchantId = userData?.merchant_id;
  }
  
  if (!merchantId) {
    console.error('No merchant ID found in user metadata or database');
    return null;
  }
  
  return merchantId;
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
      console.log('🔍 Auto-sync check:', {
        isLoaded,
        hasUser: !!user,
        userId: user?.id,
        merchantId: metadata.merchantId,
        approved: metadata.approved,
        role: metadata.role,
        publicMetadata: user?.publicMetadata
      });

      // Only sync if user is loaded
      if (!isLoaded || !user) {
        console.log('❌ Auto-sync skipped - user not loaded');
        return;
      }

      // Check if user has merchant metadata, if not create basic user record
      if (!metadata.merchantId || !metadata.approved) {
        console.log('⚠️ User missing merchant metadata, creating basic user record');
      }

      try {
        console.log('🚀 Auto-syncing user to database...');
        
        // Check if user already exists in database by Clerk ID
        let existingUser = await userSyncService.getUserByClerkId(user.id);
        
        // If not found by Clerk ID, try to find by email and update the Clerk ID
        if (!existingUser) {
          const userEmail = user.emailAddresses[0]?.emailAddress;
          if (userEmail) {
            console.log(`🔍 User not found by Clerk ID, searching by email: ${userEmail}`);
            
            const { data: emailUser, error: emailError } = await supabase
              .from('users')
              .select('*')
              .eq('email', userEmail)
              .maybeSingle();
            
            if (!emailError && emailUser) {
              console.log('📧 Found user by email, updating Clerk ID');
              // Update the existing user record with the current Clerk ID
              const { error: updateError } = await supabase
                .from('users')
                .update({ 
                  clerk_user_id: user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', emailUser.user_id);
              
              if (!updateError) {
                existingUser = { ...emailUser, clerk_user_id: user.id };
                console.log('✅ Successfully linked Clerk ID to existing user');
              }
            }
          }
        }
        
        if (!existingUser) {
          // User doesn't exist in database, create them
          if (metadata.merchantId && metadata.approved) {
            // User has merchant metadata, sync normally
            const publicMetadata = user.publicMetadata || {};
            const privateMetadata = {
              subscriptionTier: 'starter',
              kycStatus: 'pending'
            };
            await userSyncService.syncUserFromClerk(user, publicMetadata, privateMetadata);
            console.log('User with merchant metadata synced to database');
          } else {
            // User doesn't have merchant metadata, create sample merchant first then user
            const sampleMerchantId = '550e8400-e29b-41d4-a716-446655440000';
            
            // Create sample merchant if it doesn't exist
            await supabase
              .from('merchants')
              .upsert({
                merchant_id: sampleMerchantId,
                name: 'Sample Merchant',
                business_address: '123 Test St, Test City, TC 12345',
                website: 'https://example.com',
                industry: 'Technology',
                business_phone: '+1 (555) 123-4567',
                business_email: 'contact@example.com',
                status: 'active'
              }, {
                onConflict: 'merchant_id',
                ignoreDuplicates: true
              });
            
            // Create user with sample merchant
            await userSyncService.createBasicUser({
              clerk_user_id: user.id,
              name: user.firstName || user.fullName || 'Test User',
              email: user.emailAddresses[0]?.emailAddress || '',
              role: 'merchant',
              merchant_id: sampleMerchantId,
              status: 'active',
              approved: true
            });
            console.log('Basic user record created with sample merchant for testing');
          }
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
