import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService, transactionService } from '../../lib/supabase/services';
import StatsCards from './StatsCards';
import TransactionsTable from './TransactionsTable';
import PortfolioChart from './PortfolioChart';
import QuickActions from './QuickActions';
import CustomDropdown from '../ui/CustomDropdown';
import { MapPin } from 'lucide-react';

// Fallback data for when API is loading or unavailable
const fallbackData = {
  stats: {
    todaySales: { amount: 0, currency: 'USD', change: 0 },
    transactions: { count: 0, change: 0 },
    averageSale: { amount: 0, currency: 'USD', change: 0 },
  },
  recentTransactions: [] as any[],
  cryptos: [] as any[],
  merchant: { name: 'Loading...', logo: null },
  locations: [] as any[],
  portfolio: {
    totalLifetimeProcessed: 0,
    currencies: [],
    assetCount: 0
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { userData, merchantData } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real data state
  const [dashboardData, setDashboardData] = useState<{
    stats: any;
    recentTransactions: any[];
    cryptos: any[];
    merchant: any;
    locations: any[];
    portfolio: any;
  }>({
    stats: fallbackData.stats,
    recentTransactions: fallbackData.recentTransactions,
    cryptos: fallbackData.cryptos,
    merchant: fallbackData.merchant,
    locations: fallbackData.locations,
    portfolio: fallbackData.portfolio
  });

  // Load dashboard data from Supabase APIs
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!userData || !merchantData) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const merchantId = merchantData.merchant_id;
        if (!merchantId || !userData.approved) {
          console.log('User not approved, using fallback data');
          setLoading(false);
          return;
        }

        const userContext = {
          userId: userData.auth_user_id!,
          merchantId: merchantId,
          role: userData.role as 'admin' | 'merchant' | 'staff',
          approved: userData.approved
        };

        // Load all dashboard data in parallel
        const [stats, portfolio, transactions] = await Promise.all([
          dashboardService.getStats(userContext),
          dashboardService.getPortfolio(userContext),
          transactionService.getTransactions(userContext, 1, 5)
        ]);

        // Calculate percentage changes (simplified example - would use real historical data)
        const calculateChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        // Mock historical data for demo (replace with real API calls)
        const yesterdayRevenue = (stats?.totalRevenue || 0) * 0.85; // Simulate 15% growth
        const yesterdayTransactions = Math.max(0, (stats?.pendingTransactions || 0) - 2); // Simulate +2 transactions
        const yesterdayAverage = yesterdayTransactions > 0 ? yesterdayRevenue / yesterdayTransactions : 0;

        // Transform stats to match expected format with real changes
        const transformedStats = stats ? {
          todaySales: {
            amount: stats.totalRevenue || 0,
            currency: 'USD',
            change: Math.round(calculateChange(stats.totalRevenue || 0, yesterdayRevenue) * 10) / 10
          },
          transactions: {
            count: stats.pendingTransactions || 0,
            change: Math.round(calculateChange(stats.pendingTransactions || 0, yesterdayTransactions) * 10) / 10
          },
          averageSale: {
            amount: stats.totalRevenue && stats.pendingTransactions ? stats.totalRevenue / stats.pendingTransactions : 0,
            currency: 'USD',
            change: Math.round(calculateChange(
              stats.totalRevenue && stats.pendingTransactions ? stats.totalRevenue / stats.pendingTransactions : 0,
              yesterdayAverage
            ) * 10) / 10
          },
        } : fallbackData.stats;

        // Transform transactions to match expected format
        const transformedTransactions = transactions?.transactions?.map(tx => ({
          id: tx.transaction_id,
          date: new Date(tx.created_at).toLocaleString(),
          amount: tx.amount_fiat,
          crypto: `${tx.amount_crypto} ${tx.crypto_currency}`,
          status: tx.status,
          location: tx.locations?.name || 'Unknown',
          terminalId: tx.terminals?.name || 'Unknown',
          type: tx.transaction_type || 'PH Terminal' // Use the database column directly
        })) || [];

        // All 10 processable assets from ETH and Base networks
        const processableAssets = [
          // Ethereum Network Assets
          {
            id: 'eth',
            name: 'Ethereum',
            symbol: 'ETH',
            price: 2650.00,
            change: 2.5,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
            hasAutomation: false,
            network: 'Ethereum'
          },
          {
            id: 'usdc-eth',
            name: 'USD Coin',
            symbol: 'USDC',
            price: 1.00,
            change: 0.1,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
            hasAutomation: false,
            network: 'Ethereum'
          },
          {
            id: 'usdt-eth',
            name: 'Tether',
            symbol: 'USDT',
            price: 1.00,
            change: -0.05,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
            hasAutomation: false,
            network: 'Ethereum'
          },
          {
            id: 'dai',
            name: 'Dai Stablecoin',
            symbol: 'DAI',
            price: 1.00,
            change: 0.02,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
            hasAutomation: false,
            network: 'Ethereum'
          },
          {
            id: 'wbtc',
            name: 'Wrapped Bitcoin',
            symbol: 'WBTC',
            price: 67500.00,
            change: 1.8,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
            hasAutomation: false,
            network: 'Ethereum'
          },
          // Base Network Assets
          {
            id: 'eth-base',
            name: 'Base ETH',
            symbol: 'ETH',
            price: 2650.00,
            change: 2.5,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
            hasAutomation: false,
            network: 'Base'
          },
          {
            id: 'usdc-base',
            name: 'USD Coin (Base)',
            symbol: 'USDC',
            price: 1.00,
            change: 0.1,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
            hasAutomation: false,
            network: 'Base'
          },
          {
            id: 'cbeth',
            name: 'Coinbase Wrapped Staked ETH',
            symbol: 'cbETH',
            price: 2720.00,
            change: 2.8,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
            hasAutomation: false,
            network: 'Base'
          },
          {
            id: 'degen',
            name: 'Degen',
            symbol: 'DEGEN',
            price: 0.012,
            change: 15.2,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/34515/small/degen.png',
            hasAutomation: false,
            network: 'Base'
          },
          {
            id: 'usdt-base',
            name: 'Tether (Base)',
            symbol: 'USDT',
            price: 1.00,
            change: -0.05,
            balance: 0.0,
            balanceUsd: 0.0,
            icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
            hasAutomation: false,
            network: 'Base'
          }
        ];

        // Transform portfolio data to match our interface
        const transformedPortfolio = portfolio ? {
          totalLifetimeProcessed: portfolio.reduce((sum: number, asset: any) => sum + (asset.balanceUsd || 0), 0),
          currencies: portfolio
            .filter((asset: any) => ['USDC', 'USDT', 'DAI', 'USDbC'].includes(asset.symbol))
            .map((asset: any, index: number) => {
              const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6']; // Blue, Green, Orange, Purple
              const icons = {
                'USDC': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
                'USDT': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
                'DAI': 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
                'USDbC': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
              };
              const names = {
                'USDC': 'USD Coin',
                'USDT': 'Tether',
                'DAI': 'Dai',
                'USDbC': 'USD Base Coin'
              };
              
              return {
                id: asset.symbol.toLowerCase(),
                name: names[asset.symbol as keyof typeof names] || asset.symbol,
                symbol: asset.symbol,
                amount: asset.balanceUsd || 0,
                percentage: 0, // Will be calculated in PortfolioChart
                color: colors[index % colors.length],
                icon: icons[asset.symbol as keyof typeof icons] || '',
                network: 'Base'
              };
            }),
          assetCount: portfolio.filter((asset: any) => ['USDC', 'USDT', 'DAI', 'USDbC'].includes(asset.symbol)).length
        } : fallbackData.portfolio;

        setDashboardData({
          stats: transformedStats,
          recentTransactions: transformedTransactions,
          cryptos: processableAssets,
          merchant: { name: merchantData.name || 'Your Business', logo: null },
          locations: [{ id: 'all', name: 'All Locations' }],
          portfolio: transformedPortfolio
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data');
        // Keep using fallback data on error
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userData, merchantData, selectedLocation]);

  // Prepare data for components
  const data = {
    user: {
      id: userData?.auth_user_id || 'unknown',
      name: userData?.name || 'User',
      notifications: 0
    },
    merchant: {
      ...dashboardData.merchant,
      locations: dashboardData.locations,
      contracts: [] // Load real contract data from backend API
    },
    stats: dashboardData.stats,
    recentTransactions: dashboardData.recentTransactions,
    cryptos: dashboardData.cryptos,
    portfolio: dashboardData.portfolio
  };
  
  // Navigation handlers for Quick Actions
  
  const handleExportData = () => {
    // This would typically trigger a data export function
    console.log('Exporting today\'s data...');
  };
  
  const handleViewTerminals = () => {
    navigate('/terminals');
  };
  
  const handleStaffManagement = () => {
    navigate('/staff');
  };

  const handleCreateInvoice = () => {
    navigate('/invoices/create');
  };

  const handleQuickAction = (action: string) => {
    console.log(`Quick action triggered: ${action}`);
    
    switch(action) {
      case 'createInvoice':
        handleCreateInvoice();
        break;
      case 'exportTodayData':
        handleExportData();
        break;
      case 'viewTerminals':
        handleViewTerminals();
        break;
      case 'staffManagement':
        handleStaffManagement();
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  };

  const handleEditRules = (contractAddress: string) => {
    console.log(`Edit rules for contract: ${contractAddress}`);
    // In a real app, this would navigate to automation setup
  };

  // Filter transactions based on selected location
  const filteredTransactions = selectedLocation === 'all' 
    ? data.recentTransactions 
    : data.recentTransactions.filter(tx => {
        const locationName = data.merchant.locations.find((loc: any) => loc.id === selectedLocation)?.name;
        return tx.location === locationName;
      });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 font-medium">Location:</span>
          <CustomDropdown
            options={[
              { 
                value: 'all', 
                label: 'All Locations',
                icon: <MapPin className="h-4 w-4 text-gray-500" />
              },
              ...data.merchant.locations.map((location: any) => ({
                value: location.id,
                label: location.name,
                icon: <MapPin className="h-4 w-4 text-gray-500" />
              }))
            ]}
            value={selectedLocation}
            onChange={setSelectedLocation}
            className="min-w-[180px]"
          />
        </div>
      </div>

      <StatsCards stats={data.stats} />
      
      <TransactionsTable transactions={filteredTransactions} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <PortfolioChart 
          totalLifetimeProcessed={data.portfolio.totalLifetimeProcessed}
          currencies={data.portfolio.currencies}
          assetCount={data.portfolio.assetCount}
        />
        <QuickActions onActionClick={handleQuickAction} />
      </div>
    </div>
  );
};

export default Dashboard;
