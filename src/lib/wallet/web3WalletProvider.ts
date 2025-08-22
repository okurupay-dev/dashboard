import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

export interface Web3WalletConnection {
  address: string;
  provider: string;
  chainId: number;
  signature?: string;
  message?: string;
}

export class Web3WalletProvider {
  private provider: any = null;
  private signer: any = null;

  async detectWallet(): Promise<boolean> {
    try {
      const provider = await detectEthereumProvider();
      if (provider) {
        this.provider = new ethers.BrowserProvider(provider as any);
        console.log('✅ Wallet detected:', provider);
        return true;
      }
      console.log('❌ No wallet detected');
      return false;
    } catch (error) {
      console.error('❌ Error detecting wallet:', error);
      return false;
    }
  }

  async connectWallet(): Promise<Web3WalletConnection> {
    try {
      if (!this.provider) {
        const detected = await this.detectWallet();
        if (!detected) {
          throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
        }
      }

      console.log('🚀 Requesting wallet connection...');
      
      // Request account access
      await this.provider.send('eth_requestAccounts', []);
      
      // Get signer
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      
      // Get network info
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      console.log('✅ Wallet connected:', { address, chainId });
      
      return {
        address,
        provider: 'MetaMask',
        chainId
      };
      
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      } else if (error.code === -32002) {
        throw new Error('Connection request already pending');
      } else {
        throw new Error(`Failed to connect wallet: ${error.message}`);
      }
    }
  }

  async signMerchantOwnership(merchantId: string, userEmail: string): Promise<{ signature: string; message: string }> {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      const timestamp = Date.now();
      const message = `I am signing to verify that I own this merchant account.

Merchant ID: ${merchantId}
Email: ${userEmail}
Timestamp: ${timestamp}
Domain: ${window.location.hostname}

This signature proves I control this wallet address and authorize it for merchant account: ${merchantId}`;

      console.log('✍️ Requesting signature for merchant ownership...');
      console.log('Message to sign:', message);
      
      const signature = await this.signer.signMessage(message);
      
      console.log('✅ Message signed successfully');
      
      return {
        signature,
        message
      };
      
    } catch (error: any) {
      console.error('❌ Failed to sign message:', error);
      
      if (error.code === 4001) {
        throw new Error('Signature rejected by user');
      } else {
        throw new Error(`Failed to sign message: ${error.message}`);
      }
    }
  }

  async switchToNetwork(chainId: number): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      const hexChainId = `0x${chainId.toString(16)}`;
      
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: hexChainId }
      ]);
      
      console.log(`✅ Switched to network ${chainId}`);
      
    } catch (error: any) {
      console.error('❌ Failed to switch network:', error);
      
      if (error.code === 4902) {
        throw new Error(`Network ${chainId} not added to wallet`);
      } else {
        throw new Error(`Failed to switch network: ${error.message}`);
      }
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
      
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0.0';
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      // ERC-20 ABI for balanceOf function
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      return ethers.formatUnits(balance, decimals);
      
    } catch (error) {
      console.error('❌ Failed to get token balance:', error);
      return '0.0';
    }
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    console.log('🔌 Wallet disconnected');
  }
}

// Export singleton instance
export const web3WalletProvider = new Web3WalletProvider();
