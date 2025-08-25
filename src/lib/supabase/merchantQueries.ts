// Merchant-specific database queries with proper merchant_id filtering
import { supabase } from './client';

// Helper to get merchant_id from current session JWT
const getMerchantIdFromSession = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.user_metadata?.merchant_id || null;
};

// Transactions - filtered by merchant_id
export const getTransactions = async (filters?: {
  status?: string;
  location?: string;
  limit?: number;
  offset?: number;
}) => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  let query = supabase
    .from('transactions')
    .select(`
      transaction_id,
      amount_fiat,
      fiat_currency,
      amount_crypto,
      crypto_currency,
      blockchain,
      status,
      tx_hash,
      created_at,
      locations(name),
      terminals(name),
      users!staff_user_id(name)
    `)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.location && filters.location !== 'all') {
    query = query.eq('location_id', filters.location);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  return query;
};

// Terminals - filtered by merchant_id
export const getTerminals = async () => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('terminals')
    .select(`
      terminal_id,
      name,
      status,
      device_type,
      last_heartbeat,
      created_at,
      locations(name)
    `)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
};

// Staff users - filtered by merchant_id
export const getStaffUsers = async () => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('users')
    .select(`
      user_id,
      name,
      email,
      role,
      employee_id,
      status,
      approved,
      created_at
    `)
    .eq('merchant_id', merchantId)
    .in('role', ['merchant_admin', 'staff'])
    .order('created_at', { ascending: false });
};

// Merchant wallet addresses - filtered by merchant_id (merchant_admin only)
export const getWalletAddresses = async () => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  // Additional role check for wallet access
  const { data: { session } } = await supabase.auth.getSession();
  const userRole = session?.user?.user_metadata?.role;
  
  if (userRole !== 'merchant_admin') {
    throw new Error('Insufficient permissions: Only merchant_admin can access wallets');
  }

  return supabase
    .from('wallet_addresses')
    .select(`
      address_id,
      blockchain,
      address,
      is_verified,
      verified_at,
      created_at,
      merchant_wallets!inner(merchant_id)
    `)
    .eq('merchant_wallets.merchant_id', merchantId)
    .order('created_at', { ascending: false });
};

// Analytics data - filtered by merchant_id
export const getMerchantAnalytics = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('okuru_merchant_analytics')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('period_type', period)
    .order('period_date', { ascending: false })
    .limit(30);
};

// Revenue summary - filtered by merchant_id
export const getRevenueSummary = async (startDate: string, endDate: string) => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('transactions')
    .select(`
      amount_fiat,
      fiat_currency,
      okuru_fee_fiat,
      merchant_net_amount_fiat,
      status,
      created_at
    `)
    .eq('merchant_id', merchantId)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
};

// Locations - filtered by merchant_id
export const getLocations = async () => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('locations')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
};

// Merchant settings - filtered by merchant_id
export const getMerchantSettings = async () => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  return supabase
    .from('merchants')
    .select('*')
    .eq('merchant_id', merchantId)
    .single();
};

// Update merchant settings - with merchant_id validation
export const updateMerchantSettings = async (updates: any) => {
  const merchantId = await getMerchantIdFromSession();
  if (!merchantId) throw new Error('No merchant_id in session');

  // Additional role check for settings updates
  const { data: { session } } = await supabase.auth.getSession();
  const userRole = session?.user?.user_metadata?.role;
  
  if (userRole !== 'merchant_admin') {
    throw new Error('Insufficient permissions: Only merchant_admin can update settings');
  }

  return supabase
    .from('merchants')
    .update(updates)
    .eq('merchant_id', merchantId);
};
