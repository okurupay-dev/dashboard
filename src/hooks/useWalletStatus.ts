import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useUserContext } from '../lib/api/dataService';

export interface WalletStatus {
  hasWallet: boolean;
  walletCount: number;
  verifiedNetworks: string[];
  shouldShowIndicator: boolean;
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
    shouldShowIndicator: false,
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

        // Query wallet_addresses to get verified networks - use a simpler approach
        const { data: addressData, error: addressError } = await supabase
          .from('wallet_addresses')
          .select(`
            blockchain,
            is_verified,
            wallet_id
          `)
          .eq('is_verified', true)
          .in('wallet_id', walletData?.map(w => w.wallet_id) || []);

        if (addressError) throw addressError;

        // Get unique verified networks
        const networks = (addressData || [])
          .filter(addr => addr.is_verified)
          .map(addr => addr.blockchain);
        
        // Use Array.from instead of spread operator to avoid TypeScript issues
        const verifiedNetworks = Array.from(new Set(networks));

        // For debugging only
        console.log('Wallet data:', walletData);
        console.log('Address data:', addressData);
        console.log('Verified networks:', verifiedNetworks);
        
        // If we have any verified networks at all, consider the wallet as verified
        const hasVerifiedWallet = verifiedNetworks.length > 0;
        
        // If the user is on the wallets page, don't show the indicator
        // This prevents showing 'required' on the wallets page itself
        const isOnWalletsPage = window.location.pathname.includes('/wallets');
        const shouldShowIndicator = !hasVerifiedWallet && !isOnWalletsPage;
        
        console.log('Has verified wallet:', hasVerifiedWallet);
        console.log('Is on wallets page:', isOnWalletsPage);
        console.log('Should show indicator:', shouldShowIndicator);
        
        setStatus({
          hasWallet: hasVerifiedWallet,
          walletCount: walletData?.length || 0,
          verifiedNetworks,
          shouldShowIndicator: !hasVerifiedWallet && !isOnWalletsPage,
          loading: false,
          error: null
        });
      } catch (err: any) {
        console.error('Error checking wallet status:', err);
        setStatus({
          hasWallet: false,
          walletCount: 0,
          verifiedNetworks: [],
          shouldShowIndicator: !window.location.pathname.includes('/wallets'),
          loading: false,
          error: err.message
        });
      }
    };

    checkWalletStatus();
  }, [userContext?.merchantId]);

  return status;
};
