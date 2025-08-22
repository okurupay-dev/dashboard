// Web3Auth configuration for Okuru wallet creation

import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/modal";
import { SupportedChain } from "../../components/wallets/types";

// Supported chains configuration
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
  },
  {
    chain_id: "42161",
    chain_name: "Arbitrum",
    symbol: "ETH",
    explorer_url: "https://arbiscan.io",
    enabled: false, // Can be enabled later
    network_type: "mainnet",
    rpc_url: "https://arb1.arbitrum.io/rpc"
  }
];

// Web3Auth configuration
const clientId = process.env.REACT_APP_WEB3AUTH_CLIENT_ID || "YOUR_WEB3AUTH_CLIENT_ID";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum mainnet
  rpcTarget: "https://mainnet.infura.io/v3/02168981ece6403487fb092d9742531f",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

// Fix: Add currentChain property to satisfy IBaseProvider interface
(privateKeyProvider as any).currentChain = "0x1";

export const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // Production network
  privateKeyProvider: privateKeyProvider as any, // Type assertion to bypass interface mismatch
  uiConfig: {
    appName: "Okuru Dashboard",
    appUrl: "https://dashboard.okurupay.com",
    logoLight: "/logo.svg",
    logoDark: "/logo.svg",
    defaultLanguage: "en",
    mode: "light",
    theme: {
      primary: "#0066cc",
    },
  },
});

// Initialize Web3Auth
export const initWeb3Auth = async (): Promise<void> => {
  try {
    // Fix: Use init() instead of initModal() for newer Web3Auth versions
    await web3auth.init();
  } catch (error) {
    console.error("Web3Auth initialization failed:", error);
    throw error;
  }
};

// Get provider after authentication
export const getWeb3AuthProvider = (): IProvider | null => {
  return web3auth.provider;
};

// Check if user is connected
export const isWeb3AuthConnected = (): boolean => {
  return web3auth.connected;
};

// Get user info from Web3Auth
export const getWeb3AuthUserInfo = async () => {
  if (!web3auth.connected) {
    throw new Error("Web3Auth not connected");
  }
  return await web3auth.getUserInfo();
};

// Connect wallet
export const connectWeb3AuthWallet = async () => {
  try {
    const provider = await web3auth.connect();
    return provider;
  } catch (error) {
    console.error("Web3Auth connection failed:", error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWeb3AuthWallet = async () => {
  try {
    await web3auth.logout();
  } catch (error) {
    console.error("Web3Auth logout failed:", error);
    throw error;
  }
};
