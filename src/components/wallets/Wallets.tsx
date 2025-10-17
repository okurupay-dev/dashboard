import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, Shield, CheckCircle, AlertTriangle, Copy, Check, Loader2, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate, RoleGate } from '../common/PermissionGate';
import { supabase } from '../../lib/supabase';
import { WalletConnectWidget } from './WalletConnectWidget';

// Supported networks configuration
const availableNetworks = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC']
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    chainId: 8453,
    enabled: true,
    tokens: ['ETH', 'USDC', 'cbETH', 'DEGEN', 'USDT']
  }
];

interface VerifiedNetwork {
  address_id: string;
  blockchain: string;
  address: string;
  is_verified: boolean;
  verification_signature: string | null;
  verified_at: string | null;
  created_at: string;
  merchant_wallets: { merchant_id: string }[];
}

interface ConnectedWalletInfo {
  address: string;
  chainId: number;
  provider: string;
  isConnected: boolean;
  addresses: string[];
  tokens: string[];
}

const Wallets = () => {
  const { userData } = useAuth();
  const [verifiedNetworks, setVerifiedNetworks] = useState<VerifiedNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingNetwork, setVerifyingNetwork] = useState<string | null>(null);
  const [walletConnection, setWalletConnection] = useState<ConnectedWalletInfo | null>(null);
  const [isWalletSectionCollapsed, setIsWalletSectionCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'self-custody' | 'okuru-managed'>('self-custody');

  // Load verified networks from database
  const loadVerifiedNetworks = async () => {
    if (!userData) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const merchantId = userData.merchant_id;
      if (!merchantId) {
        setError('No merchant ID found');
        return;
      }

      // Load verified wallet addresses for this merchant
      const { data, error } = await supabase
        .from('wallet_addresses')
        .select(`
          address_id,
          blockchain,
          address,
          is_verified,
          verification_signature,
          verified_at,
          created_at,
          merchant_wallets!inner(merchant_id)
        `)
        .eq('merchant_wallets.merchant_id', merchantId)
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading verified networks:', error);
        setError('Failed to load verified networks');
        return;
      }

      console.log('Loaded verified networks:', data);
      setVerifiedNetworks(data || []);
    } catch (err) {
      console.error('Error in loadVerifiedNetworks:', err);
      setError('Failed to load verified networks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifiedNetworks();
  }, [userData]);

  const handleVerifyNetwork = async (networkId: string) => {
    if (!userData || !walletConnection?.address) {
      setError('Please connect your wallet first');
      return;
    }

    const network = availableNetworks.find(n => n.id === networkId);
    if (!network) {
      setError('Network not found');
      return;
    }

    try {
      setVerifyingNetwork(networkId);
      setError(null);

      // Here you would implement the actual verification logic
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload verified networks after verification
      await loadVerifiedNetworks();
      
    } catch (err) {
      console.error('Error verifying network:', err);
      setError('Failed to verify network');
    } finally {
      setVerifyingNetwork(null);
    }
  };

  const isNetworkVerified = (networkId: string) => {
    // Match by blockchain name since we're using the blockchain field from wallet_addresses
    const network = availableNetworks.find(n => n.id === networkId);
    return network ? verifiedNetworks.some(vn => vn.blockchain === network.name) : false;
  };

  // Check if all available (enabled) networks have been verified
  const allNetworksVerified = availableNetworks
    .filter(network => network.enabled)
    .every(network => isNetworkVerified(network.id));

  // Auto-collapse wallet section when all networks are verified
  useEffect(() => {
    if (allNetworksVerified && !isWalletSectionCollapsed) {
      setIsWalletSectionCollapsed(true);
    }
  }, [allNetworksVerified]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading wallet information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Wallet Setup</h1>
        <p className="text-gray-600">
          Choose the best wallet solution for your business to start accepting cryptocurrency payments.
        </p>
      </div>

      {/* Important Notice - Only show for Self Custody */}
      {verifiedNetworks.length === 0 && activeTab === 'self-custody' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Important</p>
              <p className="text-blue-800 text-sm">
                Once you verify a wallet address, it cannot be changed for security reasons. Make sure you're using the correct wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 break-words flex-1 min-w-0">{error}</span>
          </div>
        </div>
      )}

      {/* Only show tabs if no verified networks exist */}
      {verifiedNetworks.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('self-custody')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'self-custody'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Self Custody
              </button>
              <button
                onClick={() => setActiveTab('okuru-managed')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'okuru-managed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Okuru Managed
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'self-custody' ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Self Custody Wallet</h3>
                <p className="text-gray-600 mb-6">
                  Connect your own wallet to maintain full control of your funds. You'll need to verify ownership of your wallet addresses.
                </p>
                
                {/* Move existing content here */}
                <div className="space-y-6">
                  {/* Supported Networks - moved inside Self Custody tab */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Supported Networks</h3>
                      <p className="text-sm text-gray-600 mt-1">Choose which networks to accept payments on</p>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-4">
                        {availableNetworks.map((network) => (
                          <div key={network.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-medium text-sm">{network.symbol}</span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{network.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {network.tokens.slice(0, 3).join(', ')}
                                    {network.tokens.length > 3 && ` +${network.tokens.length - 3} more`}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                {!network.enabled ? (
                                  <span className="text-sm text-gray-500">Coming Soon</span>
                                ) : isNetworkVerified(network.id) ? (
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    <span className="text-sm font-medium">Verified</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyNetwork(network.id)}
                                    disabled={!walletConnection?.address || verifyingNetwork === network.id}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    {verifyingNetwork === network.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1 inline" />
                                        Verifying...
                                      </>
                                    ) : (
                                      'Verify Network'
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Wallet Connection Widget - moved inside Self Custody tab */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Connect Wallet</h3>
                      <p className="text-sm text-gray-600 mt-1">Connect your wallet to verify network ownership</p>
                    </div>
                    
                    <div className="p-6">
                      <p className="text-gray-600 mb-4">
                        Connect your wallet to verify ownership and enable payment processing.
                      </p>
                      <WalletConnectWidget 
                        onWalletConnected={(walletInfo) => {
                          console.log('Wallet connected:', walletInfo);
                          setWalletConnection({
                            address: walletInfo.address,
                            provider: 'MetaMask',
                            chainId: walletInfo.chainId,
                            isConnected: true,
                            addresses: [],
                            tokens: []
                          });
                          loadVerifiedNetworks();
                        }}
                        onWalletDisconnected={() => {
                          console.log('Wallet disconnected');
                          setWalletConnection(null);
                          loadVerifiedNetworks();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Okuru Managed Wallet</h3>
                <p className="text-gray-600 mb-6">
                  Let Okuru manage your wallet for simplified payment processing. We'll handle the technical details while you focus on your business.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Coming Soon</p>
                      <p className="text-blue-800 text-sm">
                        Okuru Managed wallets are currently in development. This feature will be available soon for merchants who prefer a fully managed solution.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Verified Networks */}
      {verifiedNetworks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Verified Addresses</h2>
            <p className="text-sm text-gray-600 mt-1">Your active wallet addresses for payment processing</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {verifiedNetworks.map((network) => (
                <div key={network.address_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">{network.blockchain} Network</h3>
                        <p className="text-sm text-gray-500">
                          Verified {network.verified_at ? new Date(network.verified_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://basescan.org/address/${network.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                    >
                      View on Explorer
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-600 mb-1">Address:</p>
                    <code className="text-sm font-mono text-gray-800 break-all">{network.address}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Notice - Only show for Self Custody or when wallets are verified */}
      {(verifiedNetworks.length > 0 || (verifiedNetworks.length === 0 && activeTab === 'self-custody')) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Security Information</h3>
              <p className="text-gray-700 text-sm">
                You maintain full control of your wallet and funds. We only verify address ownership for payment processing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;
