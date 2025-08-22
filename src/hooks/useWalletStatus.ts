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

        // First check if there are any wallet addresses at all (connected or not)
        const { data: allAddressData, error: allAddressError } = await supabase
          .from('wallet_addresses')
          .select(`
            blockchain,
            is_verified,
            wallet_id
          `)
          .in('wallet_id', walletData?.map(w => w.wallet_id) || []);
          
        if (allAddressError) throw allAddressError;
        
        // Then get verified networks if needed
        const { data: verifiedAddressData, error: addressError } = await supabase
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
        const networks = (verifiedAddressData || [])
          .filter(addr => addr.is_verified)
          .map(addr => addr.blockchain);
        
        // Use Array.from instead of spread operator to avoid TypeScript issues
        const verifiedNetworks = Array.from(new Set(networks));

        // Check if there are any wallet addresses at all
        const hasWalletAddresses = allAddressData && allAddressData.length > 0;
        
        // For debugging only
        console.log('Wallet data:', walletData);
        console.log('All address data:', allAddressData);
        console.log('Verified address data:', verifiedAddressData);
        console.log('Has wallet addresses:', hasWalletAddresses);
        console.log('Verified networks:', verifiedNetworks);
        
        // If the user is on the wallets page, don't show the indicator
        const isOnWalletsPage = window.location.pathname.includes('/wallets');
        
        // Show indicator if merchant has no wallet addresses and not on wallets page
        const shouldShowIndicator = !hasWalletAddresses && !isOnWalletsPage;
        
        console.log('Is on wallets page:', isOnWalletsPage);
        console.log('Should show indicator:', shouldShowIndicator);
        
        setStatus({
          hasWallet: hasWalletAddresses, // Use hasWalletAddresses instead of hasVerifiedWallet
          walletCount: walletData?.length || 0,
          verifiedNetworks,
          shouldShowIndicator: !hasWalletAddresses && !isOnWalletsPage,
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
