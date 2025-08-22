import { useState, useEffect } from 'react';
import { useUserContext, dashboardService } from '../lib/api/dataService';

// Hook for dashboard stats with user context
export const useDashboardStats = () => {
  const userContext = useUserContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getStats(userContext);
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userContext?.userId, userContext?.merchantId]);

  const fetchStats = async () => {
    if (!userContext) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await dashboardService.getStats(userContext);
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
};

// Hook for user transactions
export const useUserTransactions = (limit = 10) => {
  const userContext = useUserContext();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getTransactions(userContext, limit);
        setTransactions(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userContext?.userId, userContext?.merchantId, limit]);

  return { transactions, loading, error };
};

// Hook for user portfolio
export const useUserPortfolio = () => {
  const userContext = useUserContext();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getPortfolio(userContext);
        setPortfolio(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [userContext?.userId, userContext?.merchantId]);

  return { portfolio, loading, error };
};

// Hook for user terminals
export const useUserTerminals = () => {
  const userContext = useUserContext();
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTerminals = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getTerminals(userContext);
        setTerminals(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching terminals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTerminals();
  }, [userContext?.userId, userContext?.merchantId]);

  return { terminals, loading, error };
};

// Hook for user staff
export const useUserStaff = () => {
  const userContext = useUserContext();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getStaff(userContext);
        setStaff(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [userContext?.userId, userContext?.merchantId]);

  return { staff, loading, error };
};

// Hook for user automations
export const useUserAutomations = () => {
  const userContext = useUserContext();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAutomations = async () => {
      if (!userContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getAutomations(userContext);
        setAutomations(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching automations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
  }, [userContext?.userId, userContext?.merchantId]);

  return { automations, loading, error };
};
