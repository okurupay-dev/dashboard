// Real Web3Auth implementation for Okuru wallet management
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";

// Chain configurations for Web3Auth
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};

// Supported chains for multi-chain wallet
export const SUPPORTED_CHAINS = [
  {
    id: "1",
    name: "Ethereum",
    symbol: "ETH",
    chainId: "0x1",
    rpcUrl: "https://rpc.ankr.com/eth",
    explorer: "https://etherscan.io",
    enabled: true
  },
  {
    id: "137", 
    name: "Polygon",
    symbol: "MATIC",
    chainId: "0x89",
    rpcUrl: "https://rpc.ankr.com/polygon",
    explorer: "https://polygonscan.com",
    enabled: true
  },
  {
    id: "56",
    name: "BSC", 
    symbol: "BNB",
    chainId: "0x38",
    rpcUrl: "https://rpc.ankr.com/bsc",
    explorer: "https://bscscan.com",
    enabled: true
  }
];

class Web3AuthProvider {
  private web3auth: Web3Auth | null = null;
  private provider: IProvider | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Web3Auth with proper configuration
      this.web3auth = new Web3Auth({
        clientId: process.env.REACT_APP_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ", // Demo client ID
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // Use MAINNET for production
        uiConfig: {
          appName: "Okuru Merchant Wallet",
          appUrl: "https://okuru.com",
          logoLight: "https://okuru.com/logo-light.png",
          logoDark: "https://okuru.com/logo-dark.png",
          defaultLanguage: "en",
          mode: "light",
          theme: {
            primary: "#3B82F6"
          }
        }
      });

      await this.web3auth.init();
      this.isInitialized = true;
      console.log("✅ Web3Auth initialized successfully");
    } catch (error) {
      console.error("❌ Web3Auth initialization failed:", error);
      throw error;
    }
  }

  async connectWallet(): Promise<any> {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      // Connect to Web3Auth - this opens the modal interface
      this.provider = await this.web3auth.connect();
      
      if (!this.provider) {
        throw new Error("Failed to connect wallet");
      }

      console.log("✅ Wallet connected successfully");
      return this.provider;
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      throw error;
    }
  }

  async getUserInfo(): Promise<any> {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      const userInfo = await this.web3auth.getUserInfo();
      return userInfo;
    } catch (error) {
      console.error("❌ Failed to get user info:", error);
      throw error;
    }
  }

  async getAccounts(): Promise<string[]> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const accounts = await this.provider.request({
        method: "eth_accounts"
      });
      return accounts as string[];
    } catch (error) {
      console.error("❌ Failed to get accounts:", error);
      throw error;
    }
  }

  async deriveChainAddresses(): Promise<any[]> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const accounts = await this.getAccounts();
      const primaryAddress = accounts[0];

      // For EVM chains, the same address works across all chains
      const addresses = SUPPORTED_CHAINS.map(chain => ({
        chain_id: chain.id,
        address: primaryAddress,
        blockchain: chain.id,
        chain_name: chain.name,
        symbol: chain.symbol
      }));

      return addresses;
    } catch (error) {
      console.error("❌ Failed to derive addresses:", error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const accounts = await this.getAccounts();
      const signature = await this.provider.request({
        method: "personal_sign",
        params: [message, accounts[0]]
      });
      return signature as string;
    } catch (error) {
      console.error("❌ Failed to sign message:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      await this.web3auth.logout();
      this.provider = null;
      console.log("✅ Wallet disconnected successfully");
    } catch (error) {
      console.error("❌ Logout failed:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return !!this.provider && !!this.web3auth?.connected;
  }

  getProvider(): IProvider | null {
    return this.provider;
  }
}

// Export singleton instance
export const web3AuthProvider = new Web3AuthProvider();
