import { supabase, Database, handleSupabaseError, validateMerchantAccess, validateAdminAccess } from './client';

// User context interface
interface UserContext {
  userId: string;
  merchantId: string;
  role: string;
  approved: boolean;
}

// Wallet Services
export const walletService = {
  // Get merchant wallet with addresses
  getMerchantWallet: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('*')
        .eq('merchant_id', userContext.merchantId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      if (!wallet) {
        return null; // No wallet exists yet
      }

      // Get wallet addresses
      const { data: addresses, error: addressError } = await supabase
        .from('wallet_addresses')
        .select('*')
        .eq('wallet_id', wallet.wallet_id)
        .order('blockchain');

      if (addressError) {
        throw addressError;
      }

      return {
        ...wallet,
        addresses: addresses || []
      };
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Create new merchant wallet
  createMerchantWallet: async (userContext: UserContext, web3authUserId: string) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('merchant_wallets')
        .insert({
          merchant_id: userContext.merchantId,
          web3auth_user_id: web3authUserId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Add wallet address for specific blockchain
  addWalletAddress: async (
    userContext: UserContext, 
    walletId: string, 
    blockchain: string, 
    address: string
  ) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('wallet_addresses')
        .insert({
          wallet_id: walletId,
          blockchain,
          address,
          is_verified: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Verify wallet address with signature
  verifyWalletAddress: async (
    userContext: UserContext,
    addressId: string,
    signature: string
  ) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('wallet_addresses')
        .update({
          is_verified: true,
          verification_signature: signature,
          verified_at: new Date().toISOString()
        })
        .eq('address_id', addressId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

// Dashboard Services
export const dashboardService = {
  // Get dashboard statistics
  getStats: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      // Get transaction stats
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount_fiat, status, created_at, automation_triggered')
        .eq('merchant_id', userContext.merchantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (txError) throw txError;

      // Calculate stats
      const totalRevenue = transactions?.reduce((sum, tx) => 
        tx.status === 'completed' ? sum + tx.amount_fiat : sum, 0) || 0;
      
      const pendingTransactions = transactions?.filter(tx => tx.status === 'pending').length || 0;
      
      const automationsTriggered = transactions?.filter(tx => tx.automation_triggered).length || 0;

      // Get active terminals count
      const { count: activeTerminals, error: terminalError } = await supabase
        .from('terminals')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', userContext.merchantId)
        .eq('status', 'online');

      if (terminalError) throw terminalError;

      return {
        totalRevenue,
        pendingTransactions,
        automationsTriggered,
        activeTerminals: activeTerminals || 0
      };
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Get portfolio data
  getPortfolio: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      // Get recent transactions by crypto currency
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('crypto_currency, amount_crypto, amount_fiat, status')
        .eq('merchant_id', userContext.merchantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Aggregate by currency
      const portfolio = transactions?.reduce((acc, tx) => {
        const currency = tx.crypto_currency;
        if (!acc[currency]) {
          acc[currency] = {
            symbol: currency,
            balance: 0,
            balanceUsd: 0,
            change: 0, // This would come from price API
            hasAutomation: false // Check automations table
          };
        }
        acc[currency].balance += tx.amount_crypto;
        acc[currency].balanceUsd += tx.amount_fiat;
        return acc;
      }, {} as Record<string, any>) || {};

      return Object.values(portfolio);
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

// Transaction Services
export const transactionService = {
  // Get paginated transactions
  getTransactions: async (userContext: UserContext, page = 1, limit = 10) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('transactions')
        .select(`
          *,
          locations(name),
          terminals(name),
          users(name)
        `, { count: 'exact' })
        .eq('merchant_id', userContext.merchantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        transactions: data || [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Create new transaction
  createTransaction: async (userContext: UserContext, transactionData: any) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          merchant_id: userContext.merchantId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

// Staff Services
export const staffService = {
  // Get all staff members
  getStaff: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('merchant_id', userContext.merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Create staff member
  createStaff: async (userContext: UserContext, staffData: any) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('users')
        .insert({
          ...staffData,
          merchant_id: userContext.merchantId,
          status: 'active',
          approved: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Update staff member
  updateStaff: async (userContext: UserContext, staffId: string, updateData: any) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', staffId)
        .eq('merchant_id', userContext.merchantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

// Automation Services
export const automationService = {
  // Get all automations
  getAutomations: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('merchant_id', userContext.merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Create automation
  createAutomation: async (userContext: UserContext, automationData: any) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);
      validateAdminAccess(userContext.role);

      const { data, error } = await supabase
        .from('automations')
        .insert({
          ...automationData,
          merchant_id: userContext.merchantId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

// Terminal Services
export const terminalService = {
  // Get all terminals
  getTerminals: async (userContext: UserContext) => {
    try {
      validateMerchantAccess(userContext.merchantId, userContext.merchantId);

      const { data, error } = await supabase
        .from('terminals')
        .select(`
          *,
          locations(name, address)
        `)
        .eq('merchant_id', userContext.merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};
