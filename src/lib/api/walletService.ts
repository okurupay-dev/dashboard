// Wallet API service for Web3Auth integration

import { MerchantWallet, WalletAddress, VerificationChallenge } from "../../components/wallets/types";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
const API_TOKEN = process.env.REACT_APP_API_TOKEN || 'dev-token';

// API headers with authentication
const getHeaders = (userContext?: { userId: string; merchantId: string; role: string }) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
  ...(userContext && {
    'X-User-ID': userContext.userId,
    'X-Merchant-ID': userContext.merchantId,
    'X-User-Role': userContext.role,
  }),
});

// Create merchant wallet
export const createMerchantWallet = async (
  userContext: { userId: string; merchantId: string; role: string },
  walletData: {
    web3auth_user_id: string;
    addresses: WalletAddress[];
  }
): Promise<MerchantWallet> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallets`, {
      method: 'POST',
      headers: getHeaders(userContext),
      body: JSON.stringify({
        merchant_id: userContext.merchantId,
        web3auth_user_id: walletData.web3auth_user_id,
        addresses: walletData.addresses,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create wallet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create wallet API error:', error);
    throw error;
  }
};

// Get merchant wallet
export const getMerchantWallet = async (
  userContext: { userId: string; merchantId: string; role: string }
): Promise<MerchantWallet | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallets`, {
      method: 'GET',
      headers: getHeaders(userContext),
    });

    if (response.status === 404) {
      return null; // No wallet exists
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch wallet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get wallet API error:', error);
    throw error;
  }
};

// Verify chain address
export const verifyChainAddress = async (
  userContext: { userId: string; merchantId: string; role: string },
  chainId: string,
  signature: string,
  challenge: VerificationChallenge
): Promise<WalletAddress> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallets/verify`, {
      method: 'POST',
      headers: getHeaders(userContext),
      body: JSON.stringify({
        chain_id: chainId,
        signature,
        challenge,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to verify address: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Verify address API error:', error);
    throw error;
  }
};

// Get wallet setup status
export const getWalletSetupStatus = async (
  userContext: { userId: string; merchantId: string; role: string }
): Promise<{
  wallet_created: boolean;
  chains_verified: number;
  total_enabled_chains: number;
  is_complete: boolean;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallets/status`, {
      method: 'GET',
      headers: getHeaders(userContext),
    });

    if (!response.ok) {
      throw new Error(`Failed to get wallet status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get wallet status API error:', error);
    throw error;
  }
};

// Sample data for development (when API is not available)
export const sampleWalletData: MerchantWallet = {
  wallet_id: "wallet-123",
  merchant_id: "merchant-123",
  web3auth_user_id: "web3auth-user-123",
  created_at: "2024-01-15T10:30:00Z",
  addresses: [
    {
      chain_id: "1",
      address: "0x742d35Cc6634C0532925a3b8D4B9C7CB4F2F3456",
      status: "verified",
      verified_at: "2024-01-15T11:00:00Z",
      signature_ref: "sig-eth-123",
      explorer_url: "https://etherscan.io/address/0x742d35Cc6634C0532925a3b8D4B9C7CB4F2F3456",
      version: 1
    },
    {
      chain_id: "137",
      address: "0x742d35Cc6634C0532925a3b8D4B9C7CB4F2F3456",
      status: "unverified",
      version: 1
    },
    {
      chain_id: "56",
      address: "0x742d35Cc6634C0532925a3b8D4B9C7CB4F2F3456",
      status: "unverified",
      version: 1
    }
  ]
};

export const sampleWalletSetupStatus = {
  wallet_created: true,
  chains_verified: 1,
  total_enabled_chains: 3,
  is_complete: true
};
