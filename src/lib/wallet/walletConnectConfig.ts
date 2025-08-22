// WalletConnect configuration for merchant wallet connection
export const walletConnectConfig = {
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [
    {
      id: 1,
      name: "Ethereum",
      symbol: "ETH",
      rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
      explorerUrl: "https://etherscan.io"
    },
    {
      id: 8453,
      name: "Base",
      symbol: "ETH",
      rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
      explorerUrl: "https://basescan.org"
    },
    {
      id: 137,
      name: "Polygon",
      symbol: "MATIC",
      rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
      explorerUrl: "https://polygonscan.com"
    },
    {
      id: 11155111,
      name: "Sepolia",
      symbol: "ETH",
      rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
      explorerUrl: "https://sepolia.etherscan.io"
    }
  ],
  tokens: [
    {
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      address: "native",
      icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      address: "0xA0b86a33E6441d0C4C7CE4B6C0B2Dc8B8b3b8B1A",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
    {
      symbol: "USDT",
      name: "Tether",
      decimals: 6,
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png"
    },
    {
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      address: "native",
      icon: "https://cryptologos.cc/logos/polygon-matic-logo.png"
    }
  ]
};

export const supportedWallets = [
  {
    name: "MetaMask",
    icon: "https://github.com/MetaMask/brand-resources/raw/master/SVG/metamask-fox.svg",
    description: "Connect using MetaMask browser extension"
  },
  {
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
    description: "Connect using Trust Wallet mobile app"
  },
  {
    name: "Coinbase Wallet",
    icon: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
    description: "Connect using Coinbase Wallet"
  },
  {
    name: "WalletConnect",
    icon: "https://walletconnect.com/walletconnect-logo.svg",
    description: "Connect any WalletConnect compatible wallet"
  }
];
