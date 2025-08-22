import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useUserContext } from '../lib/api/dataService';

export interface WalletStatus {
  hasWallet: boolean;
  walletCount: number;
  verifiedNetworks: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if a merchant has connected wallets
 */
export const useWalletStatus = (): WalletStatus => {
  const userContext = useUserContext();
  const [status, setStatus] = useState<WalletStatus>({
    hasWallet: false,
    walletCount: 0,
    verifiedNetworks: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkWalletStatus = async () => {
      if (!userContext?.merchantId) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Query merchant_wallets table to check if wallet exists
        const { data: walletData, error: walletError } = await supabase
          .from('merchant_wallets')
          .select('wallet_id')
          .eq('merchant_id', userContext.merchantId);

        if (walletError) throw walletError;

        // Query wallet_addresses to get verified networks
        const { data: addressData, error: addressError } = await supabase
          .from('wallet_addresses')
          .select(`
            blockchain,
            is_verified,
            merchant_wallets!inner(merchant_id)
          `)
          .eq('merchant_wallets.merchant_id', userContext.merchantId)
          .eq('is_verified', true);

        if (addressError) throw addressError;

        // Get unique verified networks
        const networks = (addressData || [])
          .filter(addr => addr.is_verified)
          .map(addr => addr.blockchain);
        
        // Use Array.from instead of spread operator to avoid TypeScript issues
        const verifiedNetworks = Array.from(new Set(networks));

        setStatus({
          hasWallet: walletData && walletData.length > 0,
          walletCount: walletData?.length || 0,
          verifiedNetworks,
          loading: false,
          error: null
        });
      } catch (err: any) {
        console.error('Error checking wallet status:', err);
        setStatus({
          hasWallet: false,
          walletCount: 0,
          verifiedNetworks: [],
          loading: false,
          error: err.message
        });
      }
    };

    checkWalletStatus();
  }, [userContext?.merchantId]);

  return status;
};
