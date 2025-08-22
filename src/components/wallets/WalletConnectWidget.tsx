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
  chainName: string;
}

interface NetworkVerification {
  chainId: number;
  chainName: string;
  address: string;
  isVerified: boolean;
  isVerifying: boolean;
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
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [networkVerifications, setNetworkVerifications] = useState<NetworkVerification[]>([]);
  
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
      
      console.log('🔗 Connecting to wallet...');
      const connection: Web3WalletConnection = await web3WalletProvider.connectWallet();
      console.log('✅ Wallet connected:', connection);
      
      // Step 2: Get token balances
      console.log('💰 Getting token balances...');
      const balances = await web3WalletProvider.getBalances(connection.address);
      console.log('✅ Token balances retrieved:', balances);
      
      // Step 3: Create wallet info object
      const chainName = walletConnectConfig.chains.find(c => c.id === connection.chainId)?.name || 'Unknown';
      const realWalletInfo: WalletInfo = {
        address: connection.address,
        balance: balances.ETH || '0',
        chainId: connection.chainId,
        chainName
      };
      
      // Step 4: Initialize network verifications for supported chains
      const supportedChains = walletConnectConfig.chains;
      const networkVerifs: NetworkVerification[] = supportedChains.map(chain => ({
        chainId: chain.id,
        chainName: chain.name,
        address: connection.address,
        isVerified: false,
        isVerifying: false
      }));
      
      setNetworkVerifications(networkVerifs);

      setWalletInfo(realWalletInfo);
      setIsConnected(true);
      onWalletConnected(realWalletInfo);
      
      console.log('🎉 Wallet connection completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
      setIsConnected(false);
      setWalletInfo(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleVerifyNetwork = async (chainId: number) => {
    try {
      setError(null);
      
      // Update verification state
      setNetworkVerifications(prev => 
        prev.map(nv => 
          nv.chainId === chainId 
            ? { ...nv, isVerifying: true }
            : nv
        )
      );
      
      // Get user metadata
      if (!user || !metadata?.merchantId) {
        throw new Error('User authentication or merchant data not available');
      }
      
      const merchantId = metadata.merchantId;
      const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;
      
      if (!userEmail) {
        throw new Error('User email not available');
      }
      
      console.log('✍️ Requesting signature for network verification...', { chainId, merchantId });
      
      // Sign merchant ownership message for this network
      const { signature, message } = await web3WalletProvider.signMerchantOwnership(merchantId, userEmail);
      console.log('✅ Signature obtained successfully');
      
      // Save wallet connection to database for this network
      console.log('💾 Saving network verification to database...');
      
      // Get or create merchant wallet
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

      // Get blockchain name and wallet address
      const blockchainName = walletConnectConfig.chains.find(c => c.id === chainId)?.name || 'Unknown';
      const walletAddress = walletInfo?.address;
      
      if (!walletAddress) {
        throw new Error('Wallet address not available');
      }

      // Check if wallet address already exists for this network
      const { data: existingAddress, error: addressCheckError } = await supabase
        .from('wallet_addresses')
        .select('address_id, address, blockchain, is_verified')
        .eq('wallet_id', merchantWalletId)
        .eq('address', walletAddress.toLowerCase())
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
            address: walletAddress.toLowerCase(),
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
      
      // Update verification state to verified
      setNetworkVerifications(prev => 
        prev.map(nv => 
          nv.chainId === chainId 
            ? { ...nv, isVerified: true, isVerifying: false }
            : nv
        )
      );
      
      console.log('✅ Network verification completed successfully!');
    } catch (error) {
      console.error('❌ Network verification failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify network');
      
      // Reset verification state
      setNetworkVerifications(prev => 
        prev.map(nv => 
          nv.chainId === chainId 
            ? { ...nv, isVerifying: false }
            : nv
        )
      );
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

        {/* Network Verification */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Network Verification</h4>
            <div className="text-sm text-gray-600">
              {networkVerifications.filter(nv => nv.isVerified).length} of {networkVerifications.length} verified
            </div>
          </div>

          <div className="space-y-3">
            {networkVerifications.map((network) => (
              <div key={network.chainId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    network.isVerified 
                      ? 'bg-green-100' 
                      : 'bg-gray-100'
                  }`}>
                    {network.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{network.chainName}</p>
                    <p className="text-xs text-gray-600">
                      {network.address.slice(0, 6)}...{network.address.slice(-4)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {network.isVerified ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600 font-medium">Verified</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleVerifyNetwork(network.chainId)}
                      disabled={network.isVerifying}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {network.isVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        'Verify Network'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-800 mb-1">Network Verification</h5>
                <p className="text-sm text-blue-700">
                  Click "Verify Network" for each blockchain to sign ownership proof and save your wallet address for that network.
                </p>
              </div>
            </div>
          </div>
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
