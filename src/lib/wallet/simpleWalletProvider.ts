// Simplified wallet provider for Okuru - avoids Web3Auth complexity
// This approach uses a simpler SDK and can still derive addresses

import { SupportedChain, WalletAddress, VerificationChallenge } from "../../components/wallets/types";

// Supported chains configuration (simplified)
export const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    chain_id: "1",
    chain_name: "Ethereum",
    symbol: "ETH",
    explorer_url: "https://etherscan.io",
    enabled: true,
    network_type: "mainnet",
    rpc_url: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
  },
  {
    chain_id: "137",
    chain_name: "Polygon",
    symbol: "MATIC",
    explorer_url: "https://polygonscan.com",
    enabled: true,
    network_type: "mainnet",
    rpc_url: "https://polygon-rpc.com"
  },
  {
    chain_id: "56",
    chain_name: "BSC",
    symbol: "BNB",
    explorer_url: "https://bscscan.com",
    enabled: true,
    network_type: "mainnet",
    rpc_url: "https://bsc-dataseed.binance.org"
  }
];

// Simplified wallet interface
export interface SimpleWallet {
  address: string;
  isConnected: boolean;
  provider?: any;
}

// DEPRECATED: Mock wallet provider - DO NOT USE IN PRODUCTION
// This class generates fake addresses and should be replaced with real wallet integration
class SimpleWalletProvider {
  private wallet: SimpleWallet | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isInitialized = true;
  }

  async connectWallet(): Promise<SimpleWallet> {
    // CRITICAL: This generates FAKE addresses - DO NOT USE IN PRODUCTION
    // Replace with real wallet SDK integration
    throw new Error('SimpleWalletProvider is deprecated - use real wallet integration');
  }

  async disconnectWallet(): Promise<void> {
    this.wallet = null;
  }

  getWallet(): SimpleWallet | null {
    return this.wallet;
  }

  isConnected(): boolean {
    return this.wallet?.isConnected || false;
  }

  // DEPRECATED: Generate addresses for all supported chains
  async deriveChainAddresses(): Promise<WalletAddress[]> {
    throw new Error('SimpleWalletProvider is deprecated - use real wallet integration');
  }

  // DEPRECATED: Sign a message (mock implementation)
  async signMessage(message: string): Promise<string> {
    throw new Error('SimpleWalletProvider is deprecated - use real wallet integration');
  }

  // DEPRECATED: Mock address generation removed
}

// Singleton instance
export const walletProvider = new SimpleWalletProvider();

// Utility functions
export const generateVerificationChallenge = (
  merchantId: string,
  chain: SupportedChain
): VerificationChallenge => {
  const timestamp = new Date().toISOString();
  const message = `Okuru Wallet Verification — MerchantID=${merchantId}, Chain=${chain.chain_name} (${chain.chain_id}), Timestamp=${timestamp}`;

  return {
    merchant_id: merchantId,
    chain_name: chain.chain_name,
    chain_id: chain.chain_id,
    timestamp,
    message
  };
};

export const getChainById = (chainId: string): SupportedChain | undefined => {
  return SUPPORTED_CHAINS.find(chain => chain.chain_id === chainId);
};

export const getEnabledChains = (): SupportedChain[] => {
  return SUPPORTED_CHAINS.filter(chain => chain.enabled);
};

export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getExplorerUrl = (chain: SupportedChain, address: string): string => {
  return `${chain.explorer_url}/address/${address}`;
};

export const isWalletSetupComplete = (addresses: WalletAddress[]): boolean => {
  const enabledChains = getEnabledChains();
  const verifiedAddresses = addresses.filter(addr => 
    addr.status === 'verified' && 
    enabledChains.some(chain => chain.chain_id === addr.chain_id)
  );
  
  return verifiedAddresses.length > 0;
};

export const getWalletSetupStatus = (addresses: WalletAddress[]) => {
  const enabledChains = getEnabledChains();
  const verifiedCount = addresses.filter(addr => 
    addr.status === 'verified' && 
    enabledChains.some(chain => chain.chain_id === addr.chain_id)
  ).length;

  return {
    wallet_created: addresses.length > 0,
    chains_verified: verifiedCount,
    total_enabled_chains: enabledChains.length,
    is_complete: verifiedCount > 0
  };
};
