// Wallet types for Web3Auth integration

export interface SupportedChain {
  chain_id: string;
  chain_name: string;
  symbol: string;
  explorer_url: string;
  enabled: boolean;
  network_type: 'mainnet' | 'testnet';
  rpc_url: string;
}

export interface WalletAddress {
  chain_id: string;
  address: string;
  status: 'unverified' | 'verified';
  verified_at?: string;
  signature_ref?: string;
  explorer_url?: string;
  version: number;
}

export interface MerchantWallet {
  wallet_id: string;
  merchant_id: string;
  web3auth_user_id: string;
  created_at: string;
  addresses: WalletAddress[];
}

export interface VerificationChallenge {
  merchant_id: string;
  chain_name: string;
  chain_id: string;
  timestamp: string;
  message: string;
}

export interface WalletSetupStatus {
  wallet_created: boolean;
  chains_verified: number;
  total_enabled_chains: number;
  is_complete: boolean;
}

export type WalletVerificationStatus = 'unverified' | 'verified' | 'pending' | 'failed';
