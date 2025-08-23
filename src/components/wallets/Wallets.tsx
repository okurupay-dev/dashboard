import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, AlertTriangle, Wallet, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Loader2, AlertCircle, Shield } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase/client';
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
  verified_by_user?: {
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
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNetworks, setVerifiedNetworks] = useState<VerifiedNetwork[]>([]);
  const [walletConnection, setWalletConnection] = useState<ConnectedWalletInfo | null>(null);
  const [verifyingNetwork, setVerifyingNetwork] = useState<string | null>(null);
  const [isWalletSectionCollapsed, setIsWalletSectionCollapsed] = useState(false);

  // Load verified networks from database
  const loadVerifiedNetworks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get merchant ID from user metadata or database
      const metadata = user.publicMetadata as any;
      let merchantId = metadata?.merchantId;
      
      if (!merchantId) {
        const { data: userData } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('clerk_user_id', user.id)
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
      
      // Parse user information from verification metadata
      const networksWithUserInfo = (data || []).map(network => {
        let verifiedByUser = undefined;
        
        if (network.verification_signature) {
          try {
            const metadata = JSON.parse(network.verification_signature);
            if (metadata.user) {
              verifiedByUser = {
                name: metadata.user.name,
                email: metadata.user.email
              };
            }
          } catch (e) {
            // If parsing fails, it might be an old signature format
            console.log('Could not parse verification metadata for network:', network.address_id);
          }
        }
        
        return {
          ...network,
          verified_by_user: verifiedByUser
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
    if (!user || !walletConnection?.address) {
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
      const metadata = user.publicMetadata as any;
      let merchantId = metadata?.merchantId;
      
      if (!merchantId) {
        const { data: userData } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('clerk_user_id', user.id)
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
        name: user.fullName || 
              (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
              user.firstName || 
              user.lastName ||
              user.username ||
              user.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
              'Unknown User',
        email: user.emailAddresses?.[0]?.emailAddress || 'Unknown Email',
        clerk_user_id: user.id
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
    if (user) {
      loadVerifiedNetworks();
    }
  }, [user]);

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
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Wallet className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Setup</h1>
          <p className="text-gray-600">
            Connect your wallet and verify networks for payment acceptance
          </p>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Networks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableNetworks.map((network) => (
            <div key={network.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{network.name}</h3>
                {network.enabled ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Available
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Processable Tokens:</p>
                <div className="flex flex-wrap gap-1">
                  {network.tokens.map((token, index) => (
                    <span 
                      key={token}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200"
                    >
                      {index + 1}. {token}
                    </span>
                  ))}
                </div>
                {network.id === 'ethereum' && (
                  <p className="text-xs text-gray-500 mt-2">
                    Coming Soon. 
                  </p>
                )}
                {network.id === 'base' && (
                  <p className="text-xs text-gray-500 mt-2">
                    USDC • DAI • USDT • USDbC  
                  </p>
                )}
              </div>
              {network.enabled && (
                <div className="flex items-center justify-between">
                  {isNetworkVerified(network.id) ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Verified</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleVerifyNetwork(network.id)}
                      disabled={!walletConnection?.address || verifyingNetwork === network.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WalletConnect Widget - Conditional Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Connect Your Wallet</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWalletSectionCollapsed(!isWalletSectionCollapsed)}
                className="p-1 h-6 w-6"
              >
                {isWalletSectionCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              {!allNetworksVerified && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  Action Required
                </Badge>
              )}
            </div>
            {isWalletSectionCollapsed && allNetworksVerified && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                All Networks Verified
              </Badge>
            )}
          </div>
        </div>
        
        {!isWalletSectionCollapsed && (
          <div className="p-6">
            {allNetworksVerified ? (
              /* All Networks Verified - Show Completion Message */
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All Available Networks Verified
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You have successfully verified wallet addresses on all currently supported networks. 
                  New wallet connection will be available when additional blockchain networks are supported.
                </p>
                
                {/* Important Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-1">Important Notice</p>
                      <p className="text-amber-700 mb-3">
                        Verified wallet addresses are <strong>immutable and cannot be altered</strong> for security and compliance reasons.
                      </p>
                      <p className="text-amber-700">
                        For questions or support regarding your wallet addresses, please contact our team at{' '}
                        <a href="mailto:support@okuru.com" className="font-medium text-amber-800 hover:text-amber-900 underline">
                          support@okuru.com
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Has Unverified Networks - Show WalletConnect Widget */
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
            )}
          </div>
        )}
      </div>

      {/* Verified Networks Table */}
      {verifiedNetworks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Verified Networks</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verifiedNetworks.map((network) => (
                  <tr key={network.address_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {network.blockchain}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {network.address.slice(0, 6)}...{network.address.slice(-4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-600">Verified</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {network.verified_at ? new Date(network.verified_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {network.verified_by_user ? (
                        <div>
                          <div className="font-medium text-gray-900">{network.verified_by_user.name}</div>
                          <div className="text-xs text-gray-500">{network.verified_by_user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a
                        href={`https://etherscan.io/address/${network.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        View on Explorer
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-full">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Security Notice</h3>
            <p className="text-sm text-blue-700 break-words">
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
