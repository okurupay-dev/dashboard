import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Hook for dashboard stats with Supabase
export const useDashboardStats = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch transaction stats
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('amount_fiat, status, created_at')
          .eq('merchant_id', userData.merchant_id);

        if (txError) throw txError;

        // Calculate stats
        const totalTransactions = transactions?.length || 0;
        const completedTransactions = transactions?.filter(tx => tx.status === 'completed') || [];
        const totalRevenue = completedTransactions.reduce((sum, tx) => sum + (tx.amount_fiat || 0), 0);
        
        // Get today's transactions
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = transactions?.filter(tx => 
          tx.created_at.startsWith(today)
        ) || [];

        setStats({
          totalTransactions,
          completedTransactions: completedTransactions.length,
          totalRevenue,
          todayTransactions: todayTransactions.length,
          pendingTransactions: transactions?.filter(tx => tx.status === 'pending').length || 0
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userData?.merchant_id]);

  return { stats, loading, error };
};

// Hook for user transactions
export const useUserTransactions = (limit = 10) => {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            terminals(name),
            locations(name)
          `)
          .eq('merchant_id', userData.merchant_id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setTransactions(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userData?.merchant_id, limit]);

  return { transactions, loading, error };
};

// Hook for user terminals
export const useUserTerminals = () => {
  const { userData } = useAuth();
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTerminals = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('terminals')
          .select(`
            *,
            locations(name, address)
          `)
          .eq('merchant_id', userData.merchant_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTerminals(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching terminals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTerminals();
  }, [userData?.merchant_id]);

  return { terminals, loading, error };
};

// Hook for user staff
export const useUserStaff = () => {
  const { userData } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('merchant_id', userData.merchant_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setStaff(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [userData?.merchant_id]);

  return { staff, loading, error };
};

// Hook for user automations
export const useUserAutomations = () => {
  const { userData } = useAuth();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAutomations = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('automations')
          .select('*')
          .eq('merchant_id', userData.merchant_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAutomations(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching automations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
  }, [userData?.merchant_id]);

  return { automations, loading, error };
};

// Hook for wallet data
export const useUserWallets = () => {
  const { userData } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWallets = async () => {
      if (!userData?.merchant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('merchant_wallets')
          .select(`
            *,
            wallet_addresses(*)
          `)
          .eq('merchant_id', userData.merchant_id);

        if (error) throw error;
        setWallets(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching wallets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, [userData?.merchant_id]);

  return { wallets, loading, error };
};
