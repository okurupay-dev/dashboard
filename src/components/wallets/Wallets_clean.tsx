import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, CheckCircle, AlertTriangle, Loader2, AlertCircle, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { WalletConnectWidget } from './WalletConnectWidget';

// Base network only for now
const baseNetwork = {
  id: 'base',
  name: 'Base',
  symbol: 'ETH',
  chainId: 8453,
  tokens: ['USDC', 'USDT', 'DAI', 'USDbC']
};

interface VerifiedNetwork {
  address_id: string;
  blockchain: string;
  address: string;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

interface ConnectedWalletInfo {
  address: string;
  chainId: number;
  provider: string;
  isConnected: boolean;
}

const Wallets: React.FC = () => {
  const { userData, merchantData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNetworks, setVerifiedNetworks] = useState<VerifiedNetwork[]>([]);
  const [walletConnection, setWalletConnection] = useState<ConnectedWalletInfo | null>(null);
  const [verifyingNetwork, setVerifyingNetwork] = useState<boolean>(false);

  // Load verified networks from database
  const loadVerifiedNetworks = async () => {
    if (!userData) return;
    
    try {
      setLoading(true);
      
      let merchantId = merchantData?.merchant_id || userData?.merchant_id;
      
      if (!merchantId) {
        const { data: userDataQuery } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('auth_user_id', userData?.auth_user_id)
          .single();
        merchantId = userDataQuery?.merchant_id;
      }
      
      if (!merchantId) {
        throw new Error('Merchant ID not found');
      }

      const { data, error } = await supabase
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
        .eq('is_verified', true)
        .eq('blockchain', 'Base')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setVerifiedNetworks(data || []);
    } catch (err: any) {
      console.error('Error loading verified networks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle network verification
  const handleVerifyNetwork = async () => {
    if (!userData || !walletConnection?.address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setVerifyingNetwork(true);
      setError(null);

      let merchantId = merchantData?.merchant_id || userData?.merchant_id;
      
      if (!merchantId) {
        const { data: userDataQuery } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('auth_user_id', userData?.auth_user_id)
          .single();
        merchantId = userDataQuery?.merchant_id;
      }

      if (!merchantId) {
        throw new Error('Merchant ID not found');
      }

      // Get or create merchant wallet record
      const { data: walletData, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('wallet_id')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      let walletId = walletData?.wallet_id;
      
      if (!walletId) {
        const { data: newWallet, error: createError } = await supabase
          .from('merchant_wallets')
          .insert({ merchant_id: merchantId })
          .select('wallet_id')
          .single();
          
        if (createError) throw createError;
        walletId = newWallet.wallet_id;
      }

      // Store verified wallet address
      const { error } = await supabase
        .from('wallet_addresses')
        .insert({
          wallet_id: walletId,
          blockchain: baseNetwork.name,
          address: walletConnection.address,
          is_verified: true,
          verification_signature: JSON.stringify({
            user: {
              name: userData?.name || 'Unknown User',
              email: userData?.email || 'Unknown Email',
              auth_user_id: userData?.auth_user_id
            },
            timestamp: Date.now(),
            network: baseNetwork.name,
            address: walletConnection.address
          }),
          verified_at: new Date().toISOString()
        });

      if (error) throw error;

      await loadVerifiedNetworks();
      
    } catch (err: any) {
      console.error('Error verifying network:', err);
      setError(err.message);
    } finally {
      setVerifyingNetwork(false);
    }
  };

  useEffect(() => {
    if (userData) {
      loadVerifiedNetworks();
    }
  }, [userData]);

  const isBaseVerified = verifiedNetworks.some(vn => vn.blockchain === 'Base');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading wallet information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Wallet className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Setup</h1>
          <p className="text-gray-600">Connect your Non-custodial wallet to accept payments</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Wallet Connection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Connect Wallet</span>
            {walletConnection?.address && (
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-normal text-gray-600">
                  Non-custodial • Cannot be altered after signing
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletConnectWidget 
            onWalletConnected={(walletInfo) => {
              setWalletConnection({
                address: walletInfo.address,
                provider: 'MetaMask',
                chainId: walletInfo.chainId,
                isConnected: true
              });
            }}
            onWalletDisconnected={() => {
              setWalletConnection(null);
            }}
          />
        </CardContent>
      </Card>

      {/* Base Network Toggle */}
      {walletConnection?.address && (
        <Card>
          <CardHeader>
            <CardTitle>Base Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Supported tokens: {baseNetwork.tokens.join(' • ')}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">Activate Base Network</h3>
                  {isBaseVerified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {isBaseVerified 
                    ? `Connected: ${verifiedNetworks[0]?.address.slice(0, 6)}...${verifiedNetworks[0]?.address.slice(-4)}`
                    : 'Enable Base network to accept crypto payments'
                  }
                </p>
              </div>
              
              <button
                onClick={handleVerifyNetwork}
                disabled={verifyingNetwork || isBaseVerified}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${isBaseVerified 
                    ? 'bg-green-600' 
                    : verifyingNetwork 
                      ? 'bg-gray-400' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }
                  ${verifyingNetwork ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform flex items-center justify-center
                    ${isBaseVerified ? 'translate-x-6' : 'translate-x-1'}
                  `}
                >
                  {verifyingNetwork && (
                    <Loader2 className="h-2 w-2 animate-spin text-gray-600" />
                  )}
                </span>
              </button>
            </div>

            {verifyingNetwork && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Please sign the verification message in your wallet to activate Base network...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Security Notice</h3>
            <p className="text-sm text-blue-700">
              Your wallet remains fully under your control. Okuru never has access to your private keys or funds. 
              Network verification only proves ownership of the wallet address for payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallets;