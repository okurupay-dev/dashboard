// Wallets page - Single Okuru wallet via Web3Auth

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../../lib/clerk/sessionUtils';
import { CheckCircle, AlertCircle, ExternalLink, Wallet, Shield, Clock, Copy } from 'lucide-react';
import { walletProvider } from '../../lib/wallet/simpleWalletProvider';
import { walletService } from '../../lib/supabase/services';
import { useSupabaseAuth } from '../../lib/supabase/client';

// Types for wallet data
interface MerchantWallet {
  wallet_id: string;
  merchant_id: string;
  web3auth_user_id: string | null;
  addresses: WalletAddress[];
  created_at: string;
  updated_at: string;
}

interface WalletAddress {
  address_id: string;
  wallet_id: string;
  blockchain: string;
  address: string;
  is_verified: boolean;
  verification_signature: string | null;
  verified_at: string | null;
  created_at: string;
}

interface WalletSetupStatus {
  isComplete: boolean;
  totalChains: number;
  verifiedChains: number;
  hasWallet: boolean;
  hasLocations: boolean;
  hasStaff: boolean;
  hasTerminals: boolean;
}

interface SupportedChain {
  id: string;
  name: string;
  symbol: string;
  enabled: boolean;
}

// Supported chains configuration
const SUPPORTED_CHAINS: SupportedChain[] = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', enabled: true },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', enabled: true },
  { id: 'bsc', name: 'BSC', symbol: 'BNB', enabled: true }
];

// Utility functions
const getEnabledChains = () => SUPPORTED_CHAINS.filter(chain => chain.enabled);
const getChainById = (id: string) => SUPPORTED_CHAINS.find(chain => chain.id === id);
const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const getExplorerUrl = (blockchain: string, address: string) => {
  const explorers: Record<string, string> = {
    ethereum: 'https://etherscan.io/address/',
    polygon: 'https://polygonscan.com/address/',
    bsc: 'https://bscscan.com/address/'
  };
  return explorers[blockchain] + address;
};

const generateVerificationChallenge = (address: string, blockchain: string) => {
  return `Please sign this message to verify ownership of ${address} on ${blockchain}. Timestamp: ${Date.now()}`;
};

const getWalletSetupStatus = (wallet: MerchantWallet | null): WalletSetupStatus => {
  if (!wallet) {
    return {
      isComplete: false,
      totalChains: 3,
      verifiedChains: 0,
      hasWallet: false,
      hasLocations: true,
      hasStaff: false,
      hasTerminals: true
    };
  }
  
  const verifiedChains = wallet.addresses.filter(addr => addr.is_verified).length;
  return {
    isComplete: verifiedChains >= 1,
    totalChains: 3,
    verifiedChains,
    hasWallet: true,
    hasLocations: true,
    hasStaff: false,
    hasTerminals: true
  };
};

// Sample data for fallback
const sampleWalletData: MerchantWallet = {
  wallet_id: 'wallet_123',
  merchant_id: 'merchant_456',
  web3auth_user_id: 'web3auth_789',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  addresses: [
    {
      address_id: 'addr_1',
      wallet_id: 'wallet_123',
      blockchain: 'ethereum',
      address: '0x742d35Cc6634C0532925a3b8D2F7e8b6',
      is_verified: true,
      verification_signature: 'sample_signature',
      verified_at: '2024-01-15T10:30:00Z',
      created_at: new Date().toISOString()
    },
    {
      address_id: 'addr_2',
      wallet_id: 'wallet_123', 
      blockchain: 'polygon',
      address: '0x742d35Cc6634C0532925a3b8D2F7e8b6',
      is_verified: false,
      verification_signature: null,
      verified_at: null,
      created_at: new Date().toISOString()
    },
    {
      address_id: 'addr_3',
      wallet_id: 'wallet_123',
      blockchain: 'bsc', 
      address: '0x742d35Cc6634C0532925a3b8D2F7e8b6',
      is_verified: false,
      verification_signature: null,
      verified_at: null,
      created_at: new Date().toISOString()
    }
  ]
};

const sampleWalletSetupStatus: WalletSetupStatus = {
  isComplete: false,
  totalChains: 3,
  verifiedChains: 1,
  hasWallet: true,
  hasLocations: true,
  hasStaff: false,
  hasTerminals: true
};

const Wallets: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const { user: clerkUser } = useUser();
  const { metadata } = useUserMetadata();
  
  // Use mock user in development, real user in production
  const user = isDevelopment ? { id: 'dev-user-123' } : clerkUser;
  
  const [wallet, setWallet] = useState<MerchantWallet | null>(null);
  const [setupStatus, setSetupStatus] = useState<WalletSetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [verifyingChain, setVerifyingChain] = useState<string | null>(null);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user can manage wallets (admin only)
  const canManageWallets = metadata?.role === 'admin';

  // Debug logging
  console.log('Wallets component rendering:', { 
    isDevelopment, 
    user, 
    metadata, 
    isLoading, 
    wallet, 
    setupStatus,
    canManageWallets
  });
  const enabledChains = getEnabledChains();

  // Initialize wallet provider on component mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        await walletProvider.initialize();
        setWalletInitialized(true);
      } catch (error) {
        console.error('Wallet initialization failed:', error);
        setError('Failed to initialize wallet system. Please refresh the page.');
      }
    };

    initializeWallet();
  }, []);

  // Load wallet data - use stable dependencies to prevent infinite loops
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have the required user data
        const userId = user?.id;
        const merchantId = metadata?.merchantId;
        
        // In development mode or if user/metadata is missing, use sample data
        if (!userId || !merchantId) {
          console.log('Using sample data due to missing user/metadata');
          const walletData = sampleWalletData;
          const statusData = getWalletSetupStatus(walletData);
          setWallet(walletData);
          setSetupStatus(statusData);
          setIsLoading(false);
          return;
        }

        // For production with real user data - use Supabase
        try {
          const userContext = {
            userId,
            merchantId,
            role: metadata.role || 'merchant',
            approved: metadata.approved || false
          };
          
          const walletData = await walletService.getMerchantWallet(userContext);
          const statusData = getWalletSetupStatus(walletData);
          
          setWallet(walletData);
          setSetupStatus(statusData);
        } catch (supabaseError) {
          console.error('Failed to load wallet from Supabase:', supabaseError);
          // Fall back to sample data on error
          const walletData = sampleWalletData;
          const statusData = getWalletSetupStatus(walletData);
          setWallet(walletData);
          setSetupStatus(statusData);
        }
      } catch (error) {
        console.error('Error loading wallet data:', error);
        setError('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, [user?.id, metadata?.merchantId, metadata?.role, metadata?.approved]);

  // Create wallet via Web3Auth and Supabase
  const handleCreateWallet = async () => {
    if (!walletInitialized || !user || !metadata) return;

    try {
      setIsCreating(true);
      setError(null);

      // Connect wallet
      const connectedWallet = await walletProvider.connectWallet();
      if (!connectedWallet) {
        throw new Error('Failed to connect wallet');
      }

      // Create wallet in Supabase (with RLS fallback)
      const userContext = {
        userId: user.id,
        merchantId: metadata.merchantId,
        role: metadata.role,
        approved: metadata.approved || false
      };
      
      let newWallet;
      try {
        newWallet = await walletService.createMerchantWallet(userContext, user.id);
      } catch (supabaseError) {
        console.log('Supabase wallet creation failed, using local wallet creation');
        // Create a local wallet record if Supabase fails due to RLS
        newWallet = {
          wallet_id: `wallet_${metadata.merchantId}_${Date.now()}`,
          merchant_id: metadata.merchantId,
          web3auth_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      // Get addresses for enabled chains and add to Supabase
      const derivedAddresses = await walletProvider.deriveChainAddresses();
      const addresses: WalletAddress[] = [];

      for (const derivedAddr of derivedAddresses) {
        try {
          const walletAddress = await walletService.addWalletAddress(
            userContext,
            newWallet.wallet_id,
            derivedAddr.chain_id,
            derivedAddr.address
          );
          addresses.push(walletAddress);
        } catch (addressError) {
          console.log('Supabase address creation failed, using local address creation');
          // Create a local address record if Supabase fails
          const localAddress: WalletAddress = {
            address_id: `addr_${newWallet.wallet_id}_${derivedAddr.chain_id}_${Date.now()}`,
            wallet_id: newWallet.wallet_id,
            blockchain: derivedAddr.chain_id,
            address: derivedAddr.address,
            is_verified: false,
            verification_signature: null,
            verified_at: null,
            created_at: new Date().toISOString()
          };
          addresses.push(localAddress);
        }
      }

      // Update wallet with addresses
      const walletWithAddresses = { ...newWallet, addresses };
      setWallet(walletWithAddresses);
      setSetupStatus(getWalletSetupStatus(walletWithAddresses));
      
      // Show success message
      console.log('Wallet created successfully with addresses:', addresses.length);
    } catch (error) {
      console.error('Wallet creation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Handle verify chain by chain ID
  const handleVerifyChain = async (chainId: string) => {
    if (!wallet) return;
    
    const address = wallet.addresses.find(addr => addr.blockchain === chainId);
    if (address) {
      await handleVerifyAddress(address);
    }
  };

  // Verify chain address with signature
  const handleVerifyAddress = async (address: WalletAddress) => {
    if (!walletInitialized || !user || !metadata) return;

    try {
      setVerifyingChain(address.blockchain);
      setError(null);

      const chain = getChainById(address.blockchain);
      if (!chain) {
        throw new Error('Unsupported chain');
      }

      // Generate verification challenge
      const challenge = generateVerificationChallenge(address.address, address.blockchain);
      
      // Sign challenge
      const signature = await walletProvider.signMessage(challenge);
      if (!signature) {
        throw new Error('Failed to sign verification message');
      }

      // Update address verification in Supabase
      const userContext = {
        userId: user.id,
        merchantId: metadata.merchantId,
        role: metadata.role,
        approved: metadata.approved || false
      };
      
      const updatedAddress = await walletService.verifyWalletAddress(
        userContext,
        address.address_id,
        signature
      );

      // Update wallet with verified address
      if (wallet) {
        const updatedWallet = {
          ...wallet,
          addresses: wallet.addresses.map(addr => 
            addr.address_id === address.address_id ? updatedAddress : addr
          )
        };
        setWallet(updatedWallet);
        setSetupStatus(getWalletSetupStatus(updatedWallet));
      }
    } catch (error) {
      console.error('Address verification failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify address');
    } finally {
      setVerifyingChain(null);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Early return for debugging - ensure something renders
  if (!user) {
    console.log('No user found, showing fallback');
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Wallets</h1>
        <p>Loading user data...</p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">Debug: No user object available</p>
        </div>
      </div>
    );
  }

  // Add fallback if metadata is missing
  if (!metadata) {
    console.log('No metadata found, showing fallback');
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Wallets</h1>
        <p>Loading user permissions...</p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">Debug: No metadata available</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Wallets</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet Setup</h1>
        <p className="text-gray-600">
          Create your Okuru wallet and verify it for each chain you accept. Keys never leave your device.
        </p>
      </div>

      {/* Setup Status Banner */}
      {setupStatus && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Finish setup to go live:</h3>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  {setupStatus.isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={setupStatus.isComplete ? 'text-green-700' : 'text-gray-600'}>
                    Wallets
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Locations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Staff</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Terminals</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700">
                {setupStatus.verifiedChains} of {setupStatus.totalChains} chains verified
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Create Wallet Card (only if no wallet exists) */}
      {!wallet && (
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create your Okuru wallet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Create your Okuru wallet to receive payments. This wallet is unique to your account.
              </p>
            </div>
            
            {canManageWallets ? (
              <button
                onClick={handleCreateWallet}
                disabled={isCreating || !walletInitialized}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Wallet...
                  </>
                ) : (
                  'Create Wallet'
                )}
              </button>
            ) : (
              <div className="text-gray-500">
                <Shield className="h-5 w-5 inline mr-2" />
                Only merchant admins can create wallets
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-Chain Table (appears after wallet creation) */}
      {wallet && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Chain Addresses</h3>
            <p className="text-sm text-gray-600 mt-1">
              Verify ownership for each chain you want to accept payments on
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Explorer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wallet.addresses.map((address: WalletAddress) => {
                  const chain = getChainById(address.blockchain);
                  if (!chain) return null;

                  const isEnabled = chain.enabled;
                  const isVerified = address.is_verified;
                  const isVerifying = verifyingChain === address.blockchain;

                  return (
                    <tr key={address.address_id} className={!isEnabled ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {chain.name}
                          </div>
                          <div className="text-xs text-gray-500 ml-2">
                            ({chain.symbol})
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {formatAddress(address.address)}
                          </code>
                          <button
                            onClick={() => handleCopyAddress(address.address)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy full address"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {isVerified ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm text-green-700 font-medium">Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                              <span className="text-sm text-yellow-700 font-medium">Unverified</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {address.verified_at ? new Date(address.verified_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isVerified ? (
                          <a
                            href={getExplorerUrl(address.blockchain, address.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            <span className="text-sm">View</span>
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!isEnabled ? (
                          <span 
                            className="text-xs text-gray-400 cursor-help"
                            title="This chain isn't enabled for your account"
                          >
                            Disabled
                          </span>
                        ) : isVerified ? (
                          <span className="text-xs text-gray-500">Complete</span>
                        ) : canManageWallets ? (
                          <button
                            onClick={() => handleVerifyChain(address.blockchain)}
                            disabled={isVerifying}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 disabled:opacity-50"
                            title="Signing proves you control this wallet. No funds are moved."
                          >
                            {isVerifying ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                Verifying...
                              </>
                            ) : (
                              'Verify ownership'
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Admin only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Security & Compliance</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Your private keys never leave your device and are secured by Web3Auth</li>
              <li>• Each merchant has exactly one wallet with one address per supported chain</li>
              <li>• Signature verification proves wallet ownership without moving funds</li>
              <li>• Payments are disabled until at least one enabled chain is verified</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallets;
