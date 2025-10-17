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
  verified_by_userDataData: {
    name: string;
    email: string;
  };
}

interface ConnectedWalletInfo {
  address: string;
  chainId: number;
  provider: string;
  isConnected: boolean;
  addresses: WalletAddress[];
  tokens: TokenBalance[];
}

interface WalletAddress {
  address: string;
  chainId: number;
  chainName: string;
  isVerified: boolean;
  addedAt: string;
}

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  address: string;
  chainId: number;
  usdValue?: string;
}

const Wallets: React.FC = () => {
  // Supabase user data
  const { userData, merchantData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNetworks, setVerifiedNetworks] = useState<VerifiedNetwork[]>([]);
  const [walletConnection, setWalletConnection] = useState<ConnectedWalletInfo | null>(null);
  const [verifyingNetwork, setVerifyingNetwork] = useState<string | null>(null);
  const [isWalletSectionCollapsed, setIsWalletSectionCollapsed] = useState(false);

  // Load verified networks from database
  const loadVerifiedNetworks = async () => {
    if (!userData) return;
    
    try {
      setLoading(true);
      
      // Get merchant ID from merchant data
      let merchantId = merchantData?.merchant_id;
      
      if (!merchantId) {
        const { data: userDataQuery } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('auth_user_id', userData?.auth_user_id)
          .single();
        merchantId = userData?.merchant_id;
      }
      
      if (!merchantId) {
        throw new Error('Merchant ID not found');
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

      if (error) throw error;
      
      // Removed clerk information from verification metadata
      const networksWithUserInfo = (data || []).map(network => {
        let verifiedByUser = undefined;
        
        if (network.verification_signature) {
          try {
            const metadata = JSON.parse(network.verification_signature);
            if (userData) {
              verifiedByUser = {
                name: userData.name,
                email: userData.email
              };
            }
          } catch (e) {
            // If parsing fails, it might be an old signature format
            console.log('Could not parse verification metadata for network:', network.address_id);
          }
        }
        
        return {
          ...network,
          verified_by_user: verifiedByUser,
          verified_by_userData: verifiedByUser,
          verified_by_userDataData: verifiedByUser || { name: '', email: '' }
        };
      });
      
      setVerifiedNetworks(networksWithUserInfo);
    } catch (err: any) {
      console.error('Error loading verified networks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle network verification
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

      // Get merchant ID
      const metadata = merchantData as any;
      let merchantId = metadata?.merchantId;
      
      if (!merchantId) {
        const { data: userDataQuery } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('auth_user_id', userData?.auth_user_id)
          .single();
        merchantId = userData?.merchant_id;
      }

      if (!merchantId) {
        throw new Error('Merchant ID not found');
      }

      // Create verification message
      const message = `Verify ownership of ${walletConnection.address} for ${network.name} network on Okuru merchant account. Timestamp: ${Date.now()}`;
      
      // Request signature from wallet (this would be handled by the WalletConnect widget)
      // For now, we'll simulate the signature process
      const signature = 'simulated_signature_' + Date.now();

      // Prepare user info for verification tracking
      const userInfo = {
        name: userData?.name || 'Unknown User',
        email: userData?.email || 'Unknown Email',
        auth_user_id: userData?.auth_user_id
      };

      // Create verification metadata to include user info
      const verificationMetadata = JSON.stringify({
        user: userInfo,
        timestamp: Date.now(),
        network: network.name,
        address: walletConnection.address
      });

      // First, get or create the merchant wallet record
      const { data: walletData, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('wallet_id')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      let walletId = walletData?.wallet_id;
      
      if (!walletId) {
        // Create merchant wallet record if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('merchant_wallets')
          .insert({ merchant_id: merchantId })
          .select('wallet_id')
          .single();
          
        if (createError) throw createError;
        walletId = newWallet.wallet_id;
      }

      // Store verified wallet address in database
      const { error } = await supabase
        .from('wallet_addresses')
        .insert({
          wallet_id: walletId,
          blockchain: network.name,
          address: walletConnection.address,
          is_verified: true,
          verification_signature: verificationMetadata, // Store user info in signature field
          verified_at: new Date().toISOString()
        });

      if (error) throw error;

      // Reload verified networks
      await loadVerifiedNetworks();
      
    } catch (err: any) {
      console.error('Error verifying network:', err);
      setError(err.message);
    } finally {
      setVerifyingNetwork(null);
    }
  };

  // Handle wallet connection from WalletConnect widget
  const handleWalletConnect = (connectionInfo: ConnectedWalletInfo) => {
    setWalletConnection(connectionInfo);
    setError(null);
  };

  // Handle wallet disconnect
  const handleWalletDisconnect = () => {
    setWalletConnection(null);
  };

  useEffect(() => {
    if (userData) {
      loadVerifiedNetworks();
    }
  }, [userData]);

  const isNetworkVerified = (networkId: string) => {
    // Match by blockchain name since we're using the blockchain field from wallet_addresses
    const network = availableNetworks.find(n => n.id === networkId);
    return network ? verifiedNetworks.some(vn => vn.blockchain === network.name) : false;
  };

  // Check if all available (enabled) networks have been verified
  const enabledNetworks = availableNetworks.filter(network => network.enabled);
  const allNetworksVerified = enabledNetworks.length > 0 && enabledNetworks.every(network => 
    verifiedNetworks.some(vn => vn.blockchain === network.name)
  );

  // Check if there are any unverified enabled networks
  const hasUnverifiedNetworks = enabledNetworks.some(network => 
    !verifiedNetworks.some(vn => vn.blockchain === network.name)
  );

  // Auto-collapse wallet section when all networks are verified
  useEffect(() => {
    if (allNetworksVerified) {
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
    <div className="min-h-screen bg-gray-50 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Wallet className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Wallet Management</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Connect and verify your cryptocurrency wallets to start accepting payments. 
            This is a <strong>non-custodial</strong> solution for advanced users.
          </p>
          
          {/* Important Notice */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-4xl mx-auto">
            <div className="flex items-start justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-amber-800 mb-2">Important: For Advanced Users Only</p>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Non-custodial wallet management requires technical knowledge of cryptocurrency and blockchain technology. 
                  <strong className="block mt-1">Once you verify an address, it cannot be changed for security reasons.</strong>
                  Please ensure you understand the implications before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-full">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 break-words flex-1 min-w-0">{error}</span>
          </div>
        </div>
      )}

        {/* Supported Networks */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h2 className="text-2xl font-bold text-white mb-2">Supported Networks</h2>
            <p className="text-blue-100">Choose which blockchain networks you want to accept payments on</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {availableNetworks.map((network) => (
                <div key={network.id} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">{network.symbol}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{network.name}</h3>
                        <p className="text-sm text-gray-500">Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                    {network.enabled ? (
                      <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                        Available
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full font-medium">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Supported Tokens:</p>
                    <div className="flex flex-wrap gap-2">
                      {network.tokens.map((token) => (
                        <span 
                          key={token}
                          className="bg-white text-gray-700 text-sm px-3 py-1 rounded-lg border border-gray-300 font-medium"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                    {network.id === 'ethereum' && (
                      <p className="text-sm text-amber-600 mt-3 font-medium">
                        🚧 Coming Soon - Ethereum mainnet support in development
                      </p>
                    )}
                    {network.id === 'base' && (
                      <p className="text-sm text-green-600 mt-3 font-medium">
                        ✅ Fully operational - USDC, DAI, USDT, USDbC supported
                      </p>
                    )}
                  </div>
                  
                  {network.enabled && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      {isNetworkVerified(network.id) ? (
                        <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Verified & Active</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVerifyNetwork(network.id)}
                          disabled={!walletConnection?.address || verifyingNetwork === network.id}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          {verifyingNetwork === network.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Verifying Network...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Verify Network
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WalletConnect Widget - Conditional Display */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Connect Your Wallet</h2>
                  <p className="text-green-100">Link your cryptocurrency wallet to verify network ownership</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!allNetworksVerified && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-medium">
                    Action Required
                  </Badge>
                )}
                {allNetworksVerified && (
                  <Badge variant="outline" className="bg-white text-green-700 border-white font-medium">
                    All Networks Verified
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWalletSectionCollapsed(!isWalletSectionCollapsed)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2"
                >
                  {isWalletSectionCollapsed ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {!isWalletSectionCollapsed && (
            <div className="p-8">
              {allNetworksVerified ? (
                /* All Networks Verified - Show Completion Message */
                <div className="text-center py-12">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    🎉 All Networks Verified Successfully!
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Congratulations! You have successfully verified wallet addresses on all currently supported networks. 
                    Your payment processing setup is complete and ready to accept cryptocurrency payments.
                  </p>
                  
                  {/* Important Notice */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-left max-w-3xl mx-auto">
                    <div className="flex items-start">
                      <AlertTriangle className="h-6 w-6 text-amber-500 mr-4 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-amber-800 mb-3 text-lg">🔒 Security & Immutability Notice</p>
                        <p className="text-amber-700 mb-4 leading-relaxed">
                          Your verified wallet addresses are <strong>permanently locked and cannot be changed</strong> for security and compliance reasons. 
                          This ensures the integrity of your payment processing and protects against unauthorized modifications.
                        </p>
                        <p className="text-amber-700 leading-relaxed">
                          If you need assistance or have questions about your wallet configuration, please contact our support team at{' '}
                          <a href="mailto:support@okuru.com" className="font-bold text-amber-800 hover:text-amber-900 underline">
                            support@okuru.com
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Has Unverified Networks - Show WalletConnect Widget */
                <div>
                  <div className="mb-6 text-center">
                    <p className="text-lg text-gray-600 leading-relaxed">
                      Connect your wallet to verify ownership of your addresses and enable payment processing on the selected networks.
                    </p>
                  </div>
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
              )}
            </div>
          )}
        </div>

        {/* Verified Networks Table */}
        {verifiedNetworks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
              <h2 className="text-2xl font-bold text-white mb-2">Active Wallet Addresses</h2>
              <p className="text-purple-100">Your verified addresses for payment processing</p>
            </div>
            
            <div className="p-8">
              <div className="space-y-4">
                {verifiedNetworks.map((network) => (
                  <div key={network.address_id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{network.blockchain} Network</h3>
                          <p className="text-sm text-gray-500">
                            Verified on {network.verified_at ? new Date(network.verified_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Active
                        </Badge>
                        <a
                          href={`https://basescan.org/address/${network.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Explorer
                        </a>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Wallet Address:</p>
                      <div className="bg-white rounded-lg p-3 border border-gray-300">
                        <code className="text-sm font-mono text-gray-800 break-all">{network.address}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Security Notice</h3>
              <p className="text-blue-700 break-words leading-relaxed">
                Your wallet remains fully under your control. Okuru never has access to your private keys or funds. 
                Network verification only proves ownership of the wallet address for payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallets;
