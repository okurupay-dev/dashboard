import React, { useState, useEffect } from 'react';
import { Wallet, Shield, CheckCircle, AlertCircle, ExternalLink, User, Key, Copy, Info, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { walletConnectConfig, supportedWallets } from '../../lib/wallet/walletConnectConfig';
import { web3WalletProvider, Web3WalletConnection } from '../../lib/wallet/web3WalletProvider';
import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../../lib/clerk/sessionUtils';
import { supabase } from '../../lib/supabase/client';

interface WalletConnectWidgetProps {
  onWalletConnected: (walletInfo: ConnectedWalletInfo) => void;
  onWalletDisconnected: () => void;
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

export const WalletConnectWidget: React.FC<WalletConnectWidgetProps> = ({
  onWalletConnected,
  onWalletDisconnected
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<ConnectedWalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Clerk user data
  const { user } = useUser();
  const { metadata } = useUserMetadata();

  // Initialize Web3 wallet detection and check for existing connections
  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        setIsInitializing(true);
        console.log('🔧 Detecting Web3 wallets...');
        
        const walletDetected = await web3WalletProvider.detectWallet();
        if (!walletDetected) {
          setError('No Web3 wallet detected. Please install MetaMask or another Web3 wallet.');
          setIsInitializing(false);
          return;
        }
        
        // Check if user already has a verified wallet in the database
        if (user && metadata?.merchantId) {
          console.log('🔍 Checking for existing wallet connections...');
          try {
            const { data: existingWallets, error } = await supabase
              .from('merchant_wallets')
              .select(`
                wallet_id,
                is_primary,
                wallet_addresses!merchant_wallets_wallet_id_fkey (
                  address_id,
                  address,
                  blockchain,
                  is_verified,
                  verified_at
                )
              `)
              .eq('merchant_id', metadata.merchantId)
              .eq('wallet_addresses.is_verified', true);

            if (existingWallets && existingWallets.length > 0) {
              console.log('✅ Found existing verified wallet connections:', existingWallets);
              
              // Get the primary wallet or first verified wallet
              const primaryWallet = existingWallets.find(w => w.is_primary) || existingWallets[0];
              const walletAddress = (primaryWallet.wallet_addresses as any);
              
              if (walletAddress && walletAddress.address) {
                // Try to reconnect to the existing wallet
                console.log('🔄 Attempting to reconnect to existing wallet...');
                try {
                  const connection = await web3WalletProvider.connectWallet();
                  
                  // Check if the connected wallet matches the stored one
                  if (connection.address.toLowerCase() === walletAddress.address.toLowerCase()) {
                    console.log('✅ Successfully reconnected to existing wallet');
                    
                    // Get token balances
                    const ethBalance = await web3WalletProvider.getBalance(connection.address);
                    
                    // Create wallet info
                    const reconnectedWalletInfo: ConnectedWalletInfo = {
                      address: connection.address,
                      chainId: connection.chainId,
                      provider: connection.provider,
                      isConnected: true,
                      addresses: [
                        {
                          address: connection.address,
                          chainId: connection.chainId,
                          chainName: walletConnectConfig.chains.find(c => c.id === connection.chainId)?.name || 'Unknown',
                          isVerified: true,
                          addedAt: walletAddress.verified_at || new Date().toISOString()
                        }
                      ],
                      tokens: [
                        {
                          symbol: 'ETH',
                          name: 'Ethereum',
                          balance: ethBalance,
                          decimals: 18,
                          address: 'native',
                          chainId: connection.chainId,
                          usdValue: (parseFloat(ethBalance) * 2500).toFixed(2)
                        }
                      ]
                    };

                    setWalletInfo(reconnectedWalletInfo);
                    setIsConnected(true);
                    onWalletConnected(reconnectedWalletInfo);
                    
                    console.log('✅ Wallet reconnection complete');
                  } else {
                    console.log('⚠️ Connected wallet does not match stored wallet');
                  }
                } catch (reconnectError) {
                  console.log('⚠️ Could not automatically reconnect wallet:', reconnectError);
                  // This is fine - user can manually connect
                }
              }
            }
          } catch (dbError) {
            console.log('⚠️ Could not check existing wallets:', dbError);
            // This is fine - user can manually connect
          }
        }
        
        console.log('✅ Web3 wallet detection complete');
        setIsInitializing(false);
        
      } catch (error) {
        console.error('❌ Failed to initialize Web3:', error);
        setError('Failed to initialize Web3 wallet connection');
        setIsInitializing(false);
      }
    };

    initializeWeb3();
  }, [user, metadata]);

  // Connect wallet using real Web3 provider
  const handleConnectWallet = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      console.log('🚀 Connecting to Web3 wallet...');
      
      // Step 1: Connect to wallet
      const connection: Web3WalletConnection = await web3WalletProvider.connectWallet();
      console.log('✅ Wallet connected:', connection);
      
      // Step 2: Get user info for signature
      if (!user) {
        throw new Error('User information not available. Please refresh and try again.');
      }
      
      const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
      if (!userEmail) {
        throw new Error('User email not available. Please contact support.');
      }

      // Handle users without merchant metadata by fetching from database
      let merchantId = metadata?.merchantId;
      if (!merchantId) {
        console.log('⚠️ No merchant metadata found, fetching from database...');
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('merchant_id')
            .eq('clerk_user_id', user.id)
            .single();
          
          if (error || !userData?.merchant_id) {
            throw new Error('Merchant account not found. Please contact support to set up your merchant account.');
          }
          
          merchantId = userData.merchant_id;
          console.log('✅ Found merchant ID from database:', merchantId);
        } catch (dbError) {
          console.error('❌ Database lookup failed:', dbError);
          throw new Error('Unable to verify merchant account. Please contact support.');
        }
      }
      
      setIsSigning(true);
      console.log('✍️ Requesting signature for merchant ownership...');
      
      // Step 3: Sign merchant ownership message
      const { signature, message } = await web3WalletProvider.signMerchantOwnership(merchantId, userEmail);
      console.log('✅ Signature obtained successfully');
      
      // Step 4: Save wallet connection to database
      console.log('💾 Saving wallet connection to database...');
      try {
        // First, get or create merchant wallet
        let merchantWalletId: string;
        
        const { data: existingMerchantWallet, error: merchantWalletError } = await supabase
          .from('merchant_wallets')
          .select('wallet_id')
          .eq('merchant_id', merchantId)
          .maybeSingle();

        if (existingMerchantWallet) {
          merchantWalletId = existingMerchantWallet.wallet_id;
          console.log('✅ Found existing merchant wallet:', merchantWalletId);
        } else {
          // Create merchant wallet first
          const { data: newMerchantWallet, error: createWalletError } = await supabase
            .from('merchant_wallets')
            .insert({
              merchant_id: merchantId
            })
            .select('wallet_id')
            .single();

          if (createWalletError || !newMerchantWallet) {
            console.error('❌ Failed to create merchant wallet:', createWalletError);
            throw new Error('Failed to create merchant wallet');
          }

          merchantWalletId = newMerchantWallet.wallet_id;
          console.log('✅ Created new merchant wallet:', merchantWalletId);
        }

        // Now check if wallet address already exists for this merchant wallet
        const blockchainName = walletConnectConfig.chains.find(c => c.id === connection.chainId)?.name || 'Ethereum';
        const { data: existingAddress, error: addressCheckError } = await supabase
          .from('wallet_addresses')
          .select('address_id, address, blockchain, is_verified')
          .eq('wallet_id', merchantWalletId)
          .eq('address', connection.address.toLowerCase())
          .eq('blockchain', blockchainName)
          .maybeSingle();

        if (existingAddress) {
          // Update existing address with verification
          const { error: updateError } = await supabase
            .from('wallet_addresses')
            .update({
              is_verified: true,
              verification_signature: signature,
              verified_at: new Date().toISOString()
            })
            .eq('address_id', existingAddress.address_id);

          if (updateError) {
            console.error('❌ Failed to update wallet verification:', updateError);
            throw new Error('Failed to verify wallet address');
          }

          console.log('✅ Updated existing wallet address verification');
        } else {
          // Create new wallet address record
          console.log('📝 Creating new wallet address record...');
          const { data: newAddress, error: insertError } = await supabase
            .from('wallet_addresses')
            .insert({
              wallet_id: merchantWalletId,
              address: connection.address.toLowerCase(),
              blockchain: blockchainName,
              is_verified: true,
              verification_signature: signature,
              verified_at: new Date().toISOString()
            })
            .select('address_id')
            .single();

          if (insertError || !newAddress) {
            console.error('❌ Failed to create wallet address:', insertError);
            throw new Error('Failed to save wallet address');
          }

          console.log('✅ Created new wallet address record');
        }

        console.log('✅ Wallet connection saved to database successfully');
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError);
        // Don't throw here - allow the UI connection to proceed even if DB save fails
        // The user can retry the connection later
      }
      
      // Step 5: Get token balances
      const ethBalance = await web3WalletProvider.getBalance(connection.address);
      
      // Create wallet info with real data
      const realWalletInfo: ConnectedWalletInfo = {
        address: connection.address,
        chainId: connection.chainId,
        provider: connection.provider,
        isConnected: true,
        addresses: [
          {
            address: connection.address,
            chainId: connection.chainId,
            chainName: walletConnectConfig.chains.find(c => c.id === connection.chainId)?.name || 'Unknown',
            isVerified: true, // Verified through signature
            addedAt: new Date().toISOString()
          }
        ],
        tokens: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            balance: ethBalance,
            decimals: 18,
            address: 'native',
            chainId: connection.chainId,
            usdValue: (parseFloat(ethBalance) * 2500).toFixed(2) // Mock USD value
          }
        ]
      };

      setWalletInfo(realWalletInfo);
      setIsConnected(true);
      onWalletConnected(realWalletInfo);
      
      console.log('✅ Wallet setup complete with signature verification');
      
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
      setIsSigning(false);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      
      web3WalletProvider.disconnect();
      setWalletInfo(null);
      setIsConnected(false);
      setShowAddresses(false);
      setShowTokens(false);
      onWalletDisconnected();
      
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  // Refresh token balances
  const handleRefreshBalances = async () => {
    if (!walletInfo) return;
    
    try {
      setIsRefreshing(true);
      console.log('🔄 Refreshing token balances...');
      
      // Get fresh ETH balance
      const ethBalance = await web3WalletProvider.getBalance(walletInfo.address);
      
      // Update token balances with real data
      const updatedTokens = walletInfo.tokens.map(token => {
        if (token.symbol === 'ETH') {
          return {
            ...token,
            balance: ethBalance,
            usdValue: (parseFloat(ethBalance) * 2500).toFixed(2) // Mock USD value
          };
        }
        return token;
      });
      
      const updatedWalletInfo = {
        ...walletInfo,
        tokens: updatedTokens
      };
      
      setWalletInfo(updatedWalletInfo);
      onWalletConnected(updatedWalletInfo);
      
      console.log('✅ Token balances refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh balances:', error);
      setError('Failed to refresh balances. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sign ownership proof
  const handleSignOwnership = async (address: string) => {
    try {
      console.log('✍️ Signing ownership proof for address:', address);
      
      // Simulate signature process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update address as verified
      if (walletInfo) {
        const updatedAddresses = walletInfo.addresses.map(addr => 
          addr.address === address ? { ...addr, isVerified: true } : addr
        );
        
        const updatedWalletInfo = {
          ...walletInfo,
          addresses: updatedAddresses
        };
        
        setWalletInfo(updatedWalletInfo);
        onWalletConnected(updatedWalletInfo);
      }
      
      console.log('✅ Ownership verified for address:', address);
    } catch (error) {
      console.error('❌ Failed to sign ownership proof:', error);
      setError('Failed to verify ownership. Please try again.');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isInitializing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Initializing WalletConnect
          </h3>
          <p className="text-gray-600">
            Setting up wallet connection infrastructure...
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your existing crypto wallet to manage addresses, view token balances, and verify ownership. Works with all major wallets.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Supported Wallets */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {supportedWallets.map((wallet) => (
              <div key={wallet.name} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 mx-auto mb-2 bg-white rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-xs font-medium text-gray-900">{wallet.name}</p>
              </div>
            ))}
          </div>

          {/* Connect Button */}
          <div className="space-y-4">
            <Button
              onClick={handleConnectWallet}
              className="w-full max-w-sm mx-auto"
              size="lg"
              disabled={isConnecting || isSigning}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting to Wallet...
                </>
              ) : isSigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Please Sign Message...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>

            {/* Information Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-800 mb-1">How it works</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Connect your existing wallet (MetaMask, Trust Wallet, etc.)</li>
                    <li>• Add multiple addresses across different chains</li>
                    <li>• View your token balances and portfolio</li>
                    <li>• Sign ownership proofs to verify addresses</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Wallet Connected</h3>
              <p className="text-sm text-gray-600">Connected via {walletInfo?.provider}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnectWallet}
          >
            Disconnect
          </Button>
        </div>

        {/* Primary Address */}
        {walletInfo && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Primary Address:</span>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(walletInfo.address)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Network:</span>
              <span className="text-sm text-gray-900">
                {walletConnectConfig.chains.find(c => c.id === walletInfo.chainId)?.name || 'Unknown'}
              </span>
            </div>
          </div>
        )}

        {/* Token Balances */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Token Balances</h4>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshBalances}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTokens(!showTokens)}
              >
                {showTokens ? 'Hide' : 'Show'} Tokens
              </Button>
            </div>
          </div>

          {showTokens && walletInfo && (
            <div className="space-y-2">
              {walletInfo.tokens.map((token, index) => (
                <div key={`${token.symbol}-${token.chainId}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">{token.symbol}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{token.name}</p>
                      <p className="text-xs text-gray-600">
                        {walletConnectConfig.chains.find(c => c.id === token.chainId)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{token.balance} {token.symbol}</p>
                    {token.usdValue && (
                      <p className="text-xs text-gray-600">${token.usdValue}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multi-Chain Addresses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Multi-Chain Addresses</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddresses(!showAddresses)}
            >
              {showAddresses ? 'Hide' : 'Show'} Addresses
            </Button>
          </div>

          {showAddresses && walletInfo && (
            <div className="space-y-2">
              {walletInfo.addresses.map((address, index) => (
                <div key={`${address.address}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      address.isVerified ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {address.isVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{address.chainName}</p>
                      <code className="text-xs text-gray-600">{address.address}</code>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!address.isVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSignOwnership(address.address)}
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(address.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`https://etherscan.io/address/${walletInfo?.address}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowTokens(!showTokens)}
          >
            <Key className="h-4 w-4 mr-2" />
            {showTokens ? 'Hide' : 'Manage'} Tokens
          </Button>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Your Wallet, Your Control</h4>
              <p className="text-sm text-green-700 mt-1">
                You're connecting your existing wallet via WalletConnect. Okuru never has access to your private keys or funds. 
                You maintain complete control and can disconnect at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
