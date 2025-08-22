import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../clerk/sessionUtils';

// Supabase configuration with error handling
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('REACT_APP_SUPABASE_URL is not set in environment variables');
}
if (!supabaseAnonKey) {
  console.error('REACT_APP_SUPABASE_ANON_KEY is not set in environment variables');
}

// Create Supabase client with fallback for development
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Database types for TypeScript safety
export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          merchant_id: string;
          name: string;
          logo_url: string | null;
          business_address: string | null;
          website: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
          status: 'active' | 'inactive' | 'suspended';
        };
        Insert: Omit<Database['public']['Tables']['merchants']['Row'], 'merchant_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['merchants']['Insert']>;
      };
      users: {
        Row: {
          user_id: string;
          clerk_user_id: string;
          merchant_id: string;
          name: string;
          email: string;
          role: 'admin' | 'merchant' | 'staff';
          employee_id: string | null;
          pin_hash: string | null;
          status: 'active' | 'inactive';
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'user_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      merchant_wallets: {
        Row: {
          wallet_id: string;
          merchant_id: string;
          web3auth_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['merchant_wallets']['Row'], 'wallet_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['merchant_wallets']['Insert']>;
      };
      wallet_addresses: {
        Row: {
          address_id: string;
          wallet_id: string;
          blockchain: string;
          address: string;
          is_verified: boolean;
          verification_signature: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['wallet_addresses']['Row'], 'address_id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['wallet_addresses']['Insert']>;
      };
      transactions: {
        Row: {
          transaction_id: string;
          merchant_id: string;
          location_id: string | null;
          terminal_id: string | null;
          staff_user_id: string | null;
          amount_fiat: number;
          fiat_currency: string;
          amount_crypto: number;
          crypto_currency: string;
          blockchain: string;
          tx_hash: string | null;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          confirmations: number;
          required_confirmations: number;
          fee: number | null;
          tip: number | null;
          notes: string | null;
          automation_triggered: boolean;
          automation_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'transaction_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      automations: {
        Row: {
          automation_id: string;
          merchant_id: string;
          name: string;
          token: string;
          action_type: 'convert' | 'transfer' | 'split' | 'swap';
          condition_type: string;
          condition_value: number;
          action_description: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['automations']['Row'], 'automation_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['automations']['Insert']>;
      };
      locations: {
        Row: {
          location_id: string;
          merchant_id: string;
          name: string;
          address: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'location_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
      };
      terminals: {
        Row: {
          terminal_id: string;
          merchant_id: string;
          location_id: string | null;
          name: string;
          pairing_code: string | null;
          status: 'online' | 'offline' | 'maintenance';
          firmware_version: string | null;
          ip_address: string | null;
          last_heartbeat: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['terminals']['Row'], 'terminal_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['terminals']['Insert']>;
      };
    };
  };
}

// Typed Supabase client
export type SupabaseClient = typeof supabase;

// Hook to get authenticated Supabase client with user context
export const useSupabaseAuth = () => {
  const { user } = useUser();
  const { metadata } = useUserMetadata();

  // Set up Supabase auth context with Clerk user data
  const getAuthenticatedClient = async () => {
    if (!user || !metadata) {
      throw new Error('User not authenticated');
    }

    // Create custom JWT payload for Supabase RLS
    const customClaims = {
      clerk_user_id: user.id,
      merchant_id: metadata.merchantId,
      role: metadata.role,
      approved: metadata.approved
    };

    // Set custom claims in Supabase session
    // Note: In production, this should be handled by a secure backend endpoint
    // that validates the Clerk session and creates a Supabase JWT
    await supabase.auth.setSession({
      access_token: `custom_token_${user.id}`,
      refresh_token: '',
    });

    return supabase;
  };

  return {
    getAuthenticatedClient,
    isAuthenticated: !!user && !!metadata,
    userContext: user && metadata ? {
      userId: user.id,
      merchantId: metadata.merchantId,
      role: metadata.role,
      approved: metadata.approved
    } : null
  };
};

// Security utilities
export const validateMerchantAccess = (merchantId: string, userMerchantId: string) => {
  if (merchantId !== userMerchantId) {
    throw new Error('Unauthorized: Access denied to merchant data');
  }
};

export const validateAdminAccess = (role: string) => {
  if (role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
};

// Error handling for Supabase operations
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error.code === 'PGRST301') {
    throw new Error('Unauthorized: Insufficient permissions');
  }
  
  if (error.code === 'PGRST116') {
    throw new Error('Resource not found');
  }
  
  throw new Error(error.message || 'Database operation failed');
};
