import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, CheckCircle, Loader2, Info, ToggleLeft, ToggleRight } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'non-custodial' | 'on-off-ramp'>('non-custodial');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading wallet information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('non-custodial')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'non-custodial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Non-Custodial
          </button>
          <button
            onClick={() => setActiveTab('on-off-ramp')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'on-off-ramp'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            On/Off Ramp Wallet
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'non-custodial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Wallet Connection */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Your non-custodial wallet remains under your control. Okuru never accesses your private keys or funds.
              </p>
            </div>
          </div>

          {/* Right Column - Network Status & Configuration */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Network Status</h3>
              
              {!walletConnection?.address ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Connect wallet to configure networks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">Base Network</span>
                      {isBaseVerified && (
                        <p className="text-sm text-gray-500 mt-1">
                          {verifiedNetworks[0]?.address.slice(0, 6)}...{verifiedNetworks[0]?.address.slice(-4)}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={handleVerifyNetwork}
                      disabled={verifyingNetwork || isBaseVerified}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${isBaseVerified ? 'bg-green-600' : 'bg-gray-200 hover:bg-gray-300'}
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

                  {isBaseVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Ready to accept payments</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Supported: {baseNetwork.tokens.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'on-off-ramp' && (
        <div className="space-y-4">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Wallet className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">On/Off Ramp Wallet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Convert between crypto and fiat currencies seamlessly. Coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;