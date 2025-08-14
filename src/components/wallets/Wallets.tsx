// Wallets page - Single Okuru wallet via Web3Auth

import React, { useState, useEffect } from 'react';
import { Wallet, Shield, ExternalLink, CheckCircle, AlertCircle, Clock, Copy } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../../lib/clerk/sessionUtils';
import { 
  MerchantWallet, 
  WalletAddress, 
  SupportedChain, 
  VerificationChallenge,
  WalletSetupStatus 
} from './types';
import {
  walletProvider,
  generateVerificationChallenge,
  getChainById,
  getEnabledChains,
  formatAddress,
  getExplorerUrl,
  getWalletSetupStatus,
  SUPPORTED_CHAINS
} from '../../lib/wallet/simpleWalletProvider';
import {
  createMerchantWallet,
  getMerchantWallet,
  verifyChainAddress,
  sampleWalletData,
  sampleWalletSetupStatus
} from '../../lib/api/walletService';

const Wallets: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const { user: clerkUser } = useUser();
  const { metadata } = useUserMetadata();
  
  // Use mock user in development, real user in production
  const user = isDevelopment ? { id: 'dev-user-123' } : clerkUser;
  
  // Debug logging
  console.log('Wallets component rendering:', { isDevelopment, user, metadata });
  const [wallet, setWallet] = useState<MerchantWallet | null>(null);
  const [setupStatus, setSetupStatus] = useState<WalletSetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [verifyingChain, setVerifyingChain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletInitialized, setWalletInitialized] = useState(false);

  // Check if user can manage wallets (admin only)
  const canManageWallets = metadata.role === 'admin';
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

  // Load wallet data
  useEffect(() => {
    const loadWalletData = async () => {
      if (!user || !metadata.merchantId) return;

      try {
        setIsLoading(true);
        
        // For development, use sample data
        // TODO: Uncomment when API is ready
        // const walletData = await getMerchantWallet({
        //   userId: user.id,
        //   merchantId: metadata.merchantId,
        //   role: metadata.role
        // });
        
        const walletData = sampleWalletData;
        const statusData = sampleWalletSetupStatus;

        setWallet(walletData);
        setSetupStatus(statusData);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
        setError('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, [user, metadata]);

  // Create wallet via simplified provider
  const handleCreateWallet = async () => {
    if (!walletInitialized || !user) return;

    try {
      setIsCreating(true);
      setError(null);

      // Connect wallet
      const connectedWallet = await walletProvider.connectWallet();
      if (!connectedWallet) {
        throw new Error('Failed to connect wallet');
      }
      
      // Derive addresses for all supported chains
      const addresses = await walletProvider.deriveChainAddresses();

      // Create wallet in backend
      // TODO: Uncomment when API is ready
      // const newWallet = await createMerchantWallet(
      //   {
      //     userId: user.id,
      //     merchantId: metadata.merchantId,
      //     role: metadata.role
      //   },
      //   {
      //     web3auth_user_id: userInfo.verifierId || user.id,
      //     addresses
      //   }
      // );

      // For development, simulate wallet creation
      const newWallet: MerchantWallet = {
        wallet_id: `wallet-${Date.now()}`,
        merchant_id: metadata.merchantId,
        web3auth_user_id: user.id,
        created_at: new Date().toISOString(),
        addresses
      };

      setWallet(newWallet);
      setSetupStatus(getWalletSetupStatus(addresses));
      
    } catch (error: any) {
      console.error('Wallet creation failed:', error);
      if (error.message.includes('popup') || error.message.includes('blocked')) {
        setError('Pop-up blocked or session failed. Please try again or allow pop-ups.');
      } else {
        setError('Failed to create wallet. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Verify chain ownership
  const handleVerifyChain = async (chainId: string) => {
    if (!wallet || !walletInitialized) return;

    const chain = getChainById(chainId);
    const address = wallet.addresses.find(addr => addr.chain_id === chainId);
    
    if (!chain || !address) return;

    try {
      setVerifyingChain(chainId);
      setError(null);

      // Check if wallet is connected
      if (!walletProvider.isConnected()) {
        throw new Error('Wallet not connected');
      }

      // Generate verification challenge
      const challenge = generateVerificationChallenge(metadata.merchantId, chain);

      // Sign the challenge
      const signature = await walletProvider.signMessage(challenge.message);

      // Verify with backend
      // TODO: Uncomment when API is ready
      // const verifiedAddress = await verifyChainAddress(
      //   {
      //     userId: user!.id,
      //     merchantId: metadata.merchantId,
      //     role: metadata.role
      //   },
      //   chainId,
      //   signature,
      //   challenge
      // );

      // For development, simulate verification
      const verifiedAddress: WalletAddress = {
        ...address,
        status: 'verified',
        verified_at: new Date().toISOString(),
        signature_ref: `sig-${chainId}-${Date.now()}`,
        explorer_url: getExplorerUrl(chain, address.address)
      };

      // Update wallet state
      const updatedWallet = {
        ...wallet,
        addresses: wallet.addresses.map(addr => 
          addr.chain_id === chainId ? verifiedAddress : addr
        )
      };

      setWallet(updatedWallet);
      setSetupStatus(getWalletSetupStatus(updatedWallet.addresses));

      // Show success message
      alert(`Wallet verified for ${chain.chain_name}.`);

    } catch (error: any) {
      console.error('Chain verification failed:', error);
      if (error.message.includes('declined')) {
        setError('Signature declined. Try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setVerifyingChain(null);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Early return for debugging - ensure something renders
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Wallets</h1>
        <p>Loading user data...</p>
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
                  {setupStatus.is_complete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={setupStatus.is_complete ? 'text-green-700' : 'text-gray-600'}>
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
                {setupStatus.chains_verified} of {setupStatus.total_enabled_chains} chains verified
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
                {wallet.addresses.map((address) => {
                  const chain = getChainById(address.chain_id);
                  if (!chain) return null;

                  const isEnabled = chain.enabled;
                  const isVerified = address.status === 'verified';
                  const isVerifying = verifyingChain === address.chain_id;

                  return (
                    <tr key={address.chain_id} className={!isEnabled ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {chain.chain_name}
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
                        {isVerified && address.explorer_url ? (
                          <a
                            href={address.explorer_url}
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
                            onClick={() => handleVerifyChain(address.chain_id)}
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
