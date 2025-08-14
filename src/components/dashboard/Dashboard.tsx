import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../lib/api/dataService';
import { useDashboardStats, useUserTransactions, useUserPortfolio } from '../../hooks/useUserData';
import StatsCards from './StatsCards';
import TransactionsTable from './TransactionsTable';
import CryptoCards from './CryptoCards';
import QuickActions from './QuickActions';
import SmartContractWidget from './SmartContractWidget';

// Sample data for the dashboard
const sampleData = {
  user: {
    id: 'user-123',
    name: 'John Merchant',
    notifications: 1
  },
  merchant: {
    name: 'Crypto Cafe',
    logo: '/merchant-logo.png',
    locations: [
      { id: 'loc-001', name: 'Downtown' },
      { id: 'loc-002', name: 'Uptown' },
      { id: 'loc-003', name: 'Midtown' }
    ],
    contracts: [
      { address: '0x1234...5678', name: 'Main Contract', rules: 3, explorer: 'https://etherscan.io/address/0x1234' },
      { address: '0x8765...4321', name: 'Secondary Contract', rules: 1, explorer: 'https://etherscan.io/address/0x8765' }
    ]
  },
  stats: {
    todaySales: {
      amount: 1245.89,
      currency: 'USD',
      change: 12.5
    },
    transactions: {
      count: 24,
      change: 8.3
    },
    averageSale: {
      amount: 51.91,
      currency: 'USD',
      change: -2.1
    },
    automationsTriggered: {
      count: 7,
      change: 16.7,
      lastTriggered: '5 min ago'
    }
  },
  recentTransactions: [
    {
      id: 'TX12345678',
      date: 'Aug 13, 2025 12:42 PM',
      amount: 125.00,
      crypto: '0.0031 BTC',
      status: 'completed' as 'completed',
      location: 'Downtown',
      terminalId: 'TERM-001',
      automationTriggered: true,
      automationType: 'auto-convert'
    },
    {
      id: 'TX12345677',
      date: 'Aug 13, 2025 11:37 AM',
      amount: 78.50,
      crypto: '0.0019 BTC',
      status: 'completed' as 'completed',
      location: 'Uptown',
      terminalId: 'TERM-003',
      automationTriggered: false
    },
    {
      id: 'TX12345676',
      date: 'Aug 13, 2025 10:15 AM',
      amount: 254.75,
      crypto: '0.0064 BTC',
      status: 'pending' as 'pending',
      location: 'Downtown',
      terminalId: 'TERM-002',
      automationTriggered: true,
      automationType: 'auto-convert'
    },
    {
      id: 'TX12345675',
      date: 'Aug 13, 2025 09:22 AM',
      amount: 89.30,
      crypto: '0.0022 BTC',
      status: 'failed' as 'failed',
      location: 'Midtown',
      terminalId: 'TERM-004',
      automationTriggered: false
    },
    {
      id: 'TX12345674',
      date: 'Aug 12, 2025 04:48 PM',
      amount: 145.20,
      crypto: '0.0036 BTC',
      status: 'completed' as 'completed',
      location: 'Downtown',
      terminalId: 'TERM-001',
      automationTriggered: true,
      automationType: 'auto-convert'
    }
  ],
  cryptos: [
    {
      id: 'btc',
      name: 'Bitcoin',
      symbol: 'BTC',
      price: 39842.51,
      change: 2.4,
      balance: 0.0842,
      balanceUsd: 3354.74,
      icon: '₿', // Bitcoin symbol
      hasAutomation: true,
      automationRule: 'Auto Convert to USDC > 1 BTC'
    },
    {
      id: 'eth',
      name: 'Ethereum',
      symbol: 'ETH',
      price: 2456.78,
      change: 3.2,
      balance: 1.245,
      balanceUsd: 3058.69,
      icon: 'Ξ', // Ethereum symbol
      hasAutomation: true,
      automationRule: 'Auto Convert to USDC > 5 ETH'
    },
    {
      id: 'sol',
      name: 'Solana',
      symbol: 'SOL',
      price: 124.56,
      change: -1.8,
      balance: 12.5,
      balanceUsd: 1557.00,
      icon: '◎', // Solana symbol
      hasAutomation: false
    },
    {
      id: 'ada',
      name: 'Cardano',
      symbol: 'ADA',
      price: 0.45,
      change: 0.7,
      balance: 1250,
      balanceUsd: 562.50,
      icon: '₳', // Cardano symbol
      hasAutomation: false
    }
  ]
};

const Dashboard = () => {
  const navigate = useNavigate();
  const userContext = useUserContext();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  
  // TODO: Enable API data fetching once database is set up
  // const { stats, loading: statsLoading, error: statsError } = useDashboardStats();
  // const { transactions, loading: transactionsLoading, error: transactionsError } = useUserTransactions(5);
  // const { portfolio, loading: portfolioLoading, error: portfolioError } = useUserPortfolio();
  
  // Using sample data for now since there's no database yet
  // This will be replaced with API data once backend is ready
  const data = {
    user: {
      id: userContext?.userId || 'user-123',
      name: 'John Merchant',
      notifications: 1
    },
    merchant: {
      name: 'Crypto Cafe',
      logo: '/merchant-logo.png',
      locations: [
        { id: 'loc-001', name: 'Downtown' },
        { id: 'loc-002', name: 'Uptown' },
        { id: 'loc-003', name: 'Midtown' }
      ],
      contracts: [
        { address: '0x1234...5678', name: 'Main Contract', rules: 3, explorer: 'https://etherscan.io/address/0x1234' },
        { address: '0x8765...4321', name: 'Secondary Contract', rules: 1, explorer: 'https://etherscan.io/address/0x8765' }
      ]
    },
    // Using sample data directly for now
    stats: sampleData.stats,
    recentTransactions: sampleData.recentTransactions,
    cryptos: sampleData.cryptos
  };
  
  // Navigation handlers for Quick Actions
  const handleCreateAutomation = () => {
    navigate('/automations');
  };
  
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

  const handleQuickAction = (action: string) => {
    console.log(`Quick action triggered: ${action}`);
    
    switch(action) {
      case 'createAutomation':
        handleCreateAutomation();
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
        const locationName = data.merchant.locations.find(loc => loc.id === selectedLocation)?.name;
        return tx.location === locationName;
      });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Location:</span>
          <select 
            className="border border-gray-300 rounded-md shadow-sm py-1 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="all">All Locations</option>
            {data.merchant.locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>

      <StatsCards stats={data.stats} />
      
      <TransactionsTable transactions={filteredTransactions} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <CryptoCards cryptos={data.cryptos} />
        <div className="space-y-6">
          <QuickActions onActionClick={handleQuickAction} />
          <SmartContractWidget contracts={data.merchant.contracts} onEditRules={handleEditRules} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
