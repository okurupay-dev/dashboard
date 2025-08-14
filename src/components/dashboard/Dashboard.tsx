import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { dashboardService, transactionService } from '../../lib/supabase/services';
import { getUserMetadata } from '../../lib/clerk/sessionUtils';
import StatsCards from './StatsCards';
import TransactionsTable from './TransactionsTable';
import CryptoCards from './CryptoCards';
import QuickActions from './QuickActions';
import SmartContractWidget from './SmartContractWidget';

// Fallback data for when API is loading or unavailable
const fallbackData = {
  stats: {
    todaySales: { amount: 0, currency: 'USD', change: 0 },
    transactions: { count: 0, change: 0 },
    averageSale: { amount: 0, currency: 'USD', change: 0 },
    automationsTriggered: { count: 0, change: 0, lastTriggered: null }
  },
  recentTransactions: [] as any[],
  cryptos: [] as any[],
  merchant: { name: 'Loading...', logo: null },
  locations: [] as any[]
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
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
  }>({
    stats: fallbackData.stats,
    recentTransactions: fallbackData.recentTransactions,
    cryptos: fallbackData.cryptos,
    merchant: fallbackData.merchant,
    locations: fallbackData.locations
  });

  // Load dashboard data from Supabase APIs
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const metadata = getUserMetadata(user);
        if (!metadata?.merchantId || !metadata?.approved) {
          console.log('User metadata not ready, using fallback data');
          setLoading(false);
          return;
        }

        const userContext = {
          userId: user.id,
          merchantId: metadata.merchantId,
          role: metadata.role as 'admin' | 'merchant' | 'staff',
          approved: metadata.approved
        };

        // Load all dashboard data in parallel
        const [stats, portfolio, transactions] = await Promise.all([
          dashboardService.getStats(userContext),
          dashboardService.getPortfolio(userContext),
          transactionService.getTransactions(userContext, 1, 5)
        ]);

        // Transform stats to match expected format
        const transformedStats = stats ? {
          todaySales: {
            amount: stats.totalRevenue || 0,
            currency: 'USD',
            change: 0 // Would calculate from historical data
          },
          transactions: {
            count: stats.pendingTransactions || 0,
            change: 0
          },
          averageSale: {
            amount: stats.totalRevenue && stats.pendingTransactions ? stats.totalRevenue / stats.pendingTransactions : 0,
            currency: 'USD',
            change: 0
          },
          automationsTriggered: {
            count: stats.automationsTriggered || 0,
            change: 0,
            lastTriggered: null // Match expected type
          }
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
          automationTriggered: tx.automation_triggered || false,
          automationType: tx.automation_type || undefined
        })) || [];

        setDashboardData({
          stats: transformedStats,
          recentTransactions: transformedTransactions,
          cryptos: portfolio || [],
          merchant: { name: metadata.businessName || 'Your Business', logo: null },
          locations: [{ id: 'all', name: 'All Locations' }]
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
  }, [user, selectedLocation]);

  // Prepare data for components
  const data = {
    user: {
      id: user?.id || 'unknown',
      name: user?.firstName || 'User',
      notifications: 0
    },
    merchant: {
      ...dashboardData.merchant,
      locations: dashboardData.locations,
      contracts: [
        { address: '0x1234...5678', name: 'Main Contract', rules: 3, explorer: 'https://etherscan.io/address/0x1234' },
        { address: '0x8765...4321', name: 'Secondary Contract', rules: 1, explorer: 'https://etherscan.io/address/0x8765' }
      ]
    },
    stats: dashboardData.stats,
    recentTransactions: dashboardData.recentTransactions,
    cryptos: dashboardData.cryptos
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
        const locationName = data.merchant.locations.find((loc: any) => loc.id === selectedLocation)?.name;
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
            {data.merchant.locations.map((location: any) => (
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
