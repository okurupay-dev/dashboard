import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import StatsCards from './StatsCards';
import TransactionsTable, { Transaction } from './TransactionsTable';
import CryptoCards, { Crypto } from './CryptoCards';

// Mock data interface - would be replaced with API data in production
interface DashboardData {
  user: {
    id: string;
    name: string;
    notifications: number;
  };
  stats: {
    todaySales: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    transactions: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    averageSale: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    pendingSettlement: {
      value: string;
    };
  };
  recentTransactions: Transaction[];
  cryptos: Crypto[];
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Simulate API fetch
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/dashboard');
        // const data = await response.json();
        
        // Mock data for demonstration
        const mockData: DashboardData = {
          user: {
            id: 'user-123',
            name: 'John Merchant',
            notifications: 1
          },
          stats: {
            todaySales: {
              value: '$1,245.89',
              change: '+12.5%',
              changeType: 'positive'
            },
            transactions: {
              value: '48',
              change: '+8.2%',
              changeType: 'positive'
            },
            averageSale: {
              value: '$25.95',
              change: '-2.3%',
              changeType: 'negative'
            },
            pendingSettlement: {
              value: '$5,240.50'
            }
          },
          recentTransactions: [
            { id: 'TX-12345', date: '2025-08-13 09:45 AM', customer: 'Alice Smith', amount: '$125.00', status: 'completed' },
            { id: 'TX-12346', date: '2025-08-13 10:30 AM', customer: 'Bob Johnson', amount: '$75.50', status: 'pending' },
            { id: 'TX-12347', date: '2025-08-13 11:15 AM', customer: 'Carol Williams', amount: '$210.25', status: 'completed' },
            { id: 'TX-12348', date: '2025-08-13 12:00 PM', customer: 'David Brown', amount: '$45.75', status: 'failed' },
            { id: 'TX-12349', date: '2025-08-13 12:45 PM', customer: 'Eva Davis', amount: '$150.00', status: 'completed' }
          ],
          cryptos: [
            { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: '$29,850.20', change: '+2.4%', changeType: 'positive' },
            { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: '$1,805.75', change: '+3.2%', changeType: 'positive' },
            { id: 'usdt', name: 'Tether', symbol: 'USDT', price: '$1.00', change: '0.0%', changeType: 'neutral' },
            { id: 'usdc', name: 'USD Coin', symbol: 'USDC', price: '$1.00', change: '0.0%', changeType: 'neutral' }
          ]
        };
        
        // Simulate network delay
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-okuru-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">
          <p className="text-red-500">Error loading dashboard data. Please try again later.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <StatsCards stats={data.stats} />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Transactions Table - Takes 2/3 of the width on large screens */}
        <div className="lg:col-span-2">
          <TransactionsTable transactions={data.recentTransactions} />
        </div>
        
        {/* Quick Actions - Takes 1/3 of the width on large screens */}
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 h-full">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button className="w-full bg-okuru-primary text-white py-2 px-4 rounded-md hover:bg-okuru-primary/90 transition-colors">
                Create Payment Request
              </button>
              <button className="w-full bg-white border border-slate-200 text-slate-800 py-2 px-4 rounded-md hover:bg-slate-50 transition-colors">
                View All Transactions
              </button>
              <button className="w-full bg-white border border-slate-200 text-slate-800 py-2 px-4 rounded-md hover:bg-slate-50 transition-colors">
                Generate Report
              </button>
              <button className="w-full bg-white border border-slate-200 text-slate-800 py-2 px-4 rounded-md hover:bg-slate-50 transition-colors">
                Account Settings
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cryptocurrencies */}
      <CryptoCards cryptos={data.cryptos} />
    </DashboardLayout>
  );
};

export default Dashboard;
