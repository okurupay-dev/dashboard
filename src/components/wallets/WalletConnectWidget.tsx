import React, { useState, useEffect } from 'react';
import { Wallet, Shield, CheckCircle, AlertCircle, ExternalLink, User, Key, Copy, Info, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { walletConnectConfig, supportedWallets } from '../../lib/wallet/walletConnectConfig';
import { web3WalletProvider, Web3WalletConnection } from '../../lib/wallet/web3WalletProvider';
import { useAuth } from '../../contexts/AuthContext';
// Removed clerk import
import { supabase } from '../../lib/supabase';

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

interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  chainName: string;
  provider?: string;
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
  // Initialize state from sessionStorage if available
  const getStoredWalletInfo = (): WalletInfo | null => {
    try {
      const stored = sessionStorage.getItem('walletInfo');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const getStoredNetworkVerifications = (): NetworkVerification[] => {
    try {
      const stored = sessionStorage.getItem('networkVerifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(!!getStoredWalletInfo());
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(getStoredWalletInfo());
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [networkVerifications, setNetworkVerifications] = useState<NetworkVerification[]>(getStoredNetworkVerifications());
  const [showAddresses, setShowAddresses] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Supabase user data
  const { userData, merchantData } = useAuth();

  // Track if component has been initialized to prevent re-initialization
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize Web3 wallet detection and check for existing connections
  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        // If wallet is already connected from sessionStorage, skip initialization
        if (isConnected && walletInfo) {
          console.log('⏭️ Wallet already connected from storage, skipping initialization');
          setIsInitializing(false);
          setHasInitialized(true);
          return;
        }

        // Prevent re-initialization if already done
        if (hasInitialized) {
          console.log('⏭️ Skipping initialization - already initialized');
          return;
        }

        setIsInitializing(true);
        console.log('🔧 Detecting Web3 wallets...');
        
        const walletDetected = await web3WalletProvider.detectWallet();
        if (!walletDetected) {
          setError('No Web3 wallet detected. Please install MetaMask or another Web3 wallet.');
          setIsInitializing(false);
          setHasInitialized(true);
          return;
        }
        
        console.log('✅ Web3 wallet detection complete');
        setIsInitializing(false);
        setHasInitialized(true);
        
      } catch (error) {
        console.error('❌ Failed to initialize Web3:', error);
        setError('Failed to initialize Web3 wallet connection');
        setIsInitializing(false);
        setHasInitialized(true);
      }
    };

    // Initialize when component mounts or re-mounts
    initializeWeb3();
  }, []); // Empty dependency array - only run once on mount

  // Connect wallet using real Web3 provider
  const handleConnectWallet = async () => {
    console.log('🎯 handleConnectWallet called');
    try {
      setError(null);
      setIsConnecting(true);
      console.log('🔄 Set connecting state to true');
      
      console.log('🔗 Connecting to wallet...');
      const connection: Web3WalletConnection = await web3WalletProvider.connectWallet();
      console.log('✅ Wallet connected:', connection);
      
      // Step 2: Get token balance
      console.log('💰 Getting token balance...');
      const balance = await web3WalletProvider.getBalance(connection.address);
      console.log('✅ Token balance retrieved:', balance);
      
      // Step 3: Create wallet info object
      const chainName = walletConnectConfig.chains.find(c => c.id === connection.chainId)?.name || 'Unknown';
      const realWalletInfo: WalletInfo = {
        address: connection.address,
        balance: balance || '0',
        chainId: connection.chainId,
        chainName,
        provider: 'MetaMask'
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
      console.log('📝 Network verifications set:', networkVerifs);
      
      // Store in sessionStorage to persist across re-mounts
      sessionStorage.setItem('networkVerifications', JSON.stringify(networkVerifs));

      setWalletInfo(realWalletInfo);
      console.log('💾 Wallet info set:', realWalletInfo);
      
      // Store wallet info in sessionStorage
      sessionStorage.setItem('walletInfo', JSON.stringify(realWalletInfo));
      
      setIsConnected(true);
      console.log('🔗 isConnected set to true');
      
      onWalletConnected(realWalletInfo);
      console.log('📞 onWalletConnected callback called');
      
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
      if (!userData || !merchantData?.merchant_id) {
        throw new Error('User authentication or merchant data not available');
      }

      const merchantId = merchantData.merchant_id;
      const userEmail = userData.email;
      
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
      const updatedVerifications = networkVerifications.map(nv => 
        nv.chainId === chainId 
          ? { ...nv, isVerified: true, isVerifying: false }
          : nv
      );
      
      setNetworkVerifications(updatedVerifications);
      
      // Update sessionStorage
      sessionStorage.setItem('networkVerifications', JSON.stringify(updatedVerifications));
      
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
      setNetworkVerifications([]);
      setShowAddresses(false);
      setShowTokens(false);
      
      // Clear sessionStorage
      sessionStorage.removeItem('walletInfo');
      sessionStorage.removeItem('networkVerifications');
      
      onWalletDisconnected();
      
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  // Refresh token balances
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRefreshBalances = async () => {
    if (!walletInfo) return;
    
    try {
      setIsRefreshing(true);
      const balance = await web3WalletProvider.getBalance(walletInfo.address);
      
      // Update wallet info with new balance
      setWalletInfo(prev => prev ? {
        ...prev,
        balance: balance || '0'
      } : null);
      
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddAddress = async (chainId: number) => {
    // Implementation for adding a new address for a specific chain
    console.log('Adding address for chain:', chainId);
  };

  const handleRemoveAddress = async (addr: WalletAddress) => {
    // Implementation for removing an address
    console.log('Removing address:', addr);
  };

  // Debug render conditions
  console.log('🎨 Render state:', { isInitializing, isConnected, walletInfo: !!walletInfo });

  // Loading state
  if (isInitializing) {
    console.log('🔄 Rendering loading state');
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing wallet connection...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    console.log('🚫 Rendering connect wallet screen');
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
              onClick={(e) => {
                console.log('🖱️ Button clicked!', e);
                console.log('🔍 Button state:', { isConnecting, disabled: isConnecting });
                try {
                  handleConnectWallet();
                } catch (error) {
                  console.error('❌ Error in button click handler:', error);
                }
              }}
              className="w-full max-w-sm mx-auto"
              size="lg"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting to Wallet...
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

  console.log('✅ Rendering connected wallet screen');
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
    </div>
  );
};
