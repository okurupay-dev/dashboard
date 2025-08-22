import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../../lib/clerk/sessionUtils';
import { transactionService, userSyncService } from '../../lib/supabase/services';
import { supabase } from '../../lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select } from '../ui/select';
import TransactionDetailsModal from './TransactionDetailsModal';
import { Transaction, TransactionStatus, TransactionFilter } from './types';

// Fallback transaction data for loading states
const fallbackTransactions: Transaction[] = [
  {
    id: 'TX12345678',
    date: 'Aug 13, 2025 12:42 PM',
    amount: 125.00,
    crypto: '0.0031 BTC',
    status: 'completed' as 'completed',
    location: 'San Francisco HQ',
    locationId: '1',
    terminal: 'Checkout 1',
    terminalId: 'TERM-001',
    staff: 'Alex Johnson',
    chain: 'Bitcoin',
    txHash: '3a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u',
    confirmations: 6,
    fee: 0.50,
    tip: 5.00
  },
  {
    id: 'TX12345677',
    date: 'Aug 13, 2025 11:37 AM',
    amount: 78.50,
    crypto: '0.0019 BTC',
    status: 'completed' as 'completed',
    location: 'San Francisco HQ',
    locationId: '1',
    terminal: 'Checkout 2',
    terminalId: 'TERM-002',
    staff: 'Maria Garcia',
    chain: 'Bitcoin',
    txHash: '4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v',
    confirmations: 6,
    fee: 0.35,
    tip: 0.00
  },
  {
    id: 'TX12345676',
    date: 'Aug 13, 2025 10:15 AM',
    amount: 254.75,
    crypto: '0.0064 BTC',
    status: 'pending' as 'pending',
    location: 'San Francisco HQ',
    locationId: '1',
    terminal: 'Checkout 1',
    terminalId: 'TERM-001',
    staff: 'Alex Johnson',
    chain: 'Bitcoin',
    txHash: '5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w',
    confirmations: 2,
    fee: 0.60,
    tip: 10.00
  },
  {
    id: 'TX12345675',
    date: 'Aug 13, 2025 09:22 AM',
    amount: 89.30,
    crypto: '0.0022 BTC',
    status: 'failed' as 'failed',
    location: 'New York Store',
    locationId: '2',
    terminal: 'Checkout 1',
    terminalId: 'TERM-004',
    staff: 'Emily Davis',
    chain: 'Bitcoin',
    txHash: '6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x',
    confirmations: 0,
    fee: 0.40
  },
  {
    id: 'TX12345674',
    date: 'Aug 12, 2025 04:48 PM',
    amount: 145.20,
    crypto: '0.0036 BTC',
    status: 'completed' as 'completed',
    location: 'Los Angeles Store',
    locationId: '3',
    terminal: 'Checkout 1',
    terminalId: 'TERM-005',
    staff: 'David Wilson',
    chain: 'Bitcoin',
    txHash: '7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y',
    confirmations: 6,
    fee: 0.55,
    tip: 7.25
  },
  {
    id: 'TX12345673',
    date: 'Aug 12, 2025 03:15 PM',
    amount: 67.80,
    crypto: '0.0017 BTC',
    status: 'completed' as 'completed',
    location: 'San Francisco HQ',
    locationId: '1',
    terminal: 'Mobile POS 1',
    terminalId: 'TERM-003',
    staff: 'John Smith',
    chain: 'Bitcoin',
    txHash: '8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z',
    confirmations: 6,
    fee: 0.30,
    tip: 3.40
  },
  {
    id: 'TX12345672',
    date: 'Aug 12, 2025 01:30 PM',
    amount: 210.45,
    crypto: '0.0053 BTC',
    status: 'completed' as 'completed'
  },
  {
    id: 'TX12345671',
    date: 'Aug 12, 2025 11:22 AM',
    amount: 95.60,
    crypto: '0.0024 BTC',
    status: 'completed' as 'completed'
  },
  {
    id: 'TX12345670',
    date: 'Aug 11, 2025 05:17 PM',
    amount: 132.25,
    crypto: '0.0033 BTC',
    status: 'completed' as 'completed'
  },
  {
    id: 'TX12345669',
    date: 'Aug 11, 2025 03:42 PM',
    amount: 178.90,
    crypto: '0.0045 BTC',
    status: 'completed' as 'completed'
  }
];

// Status badge component
const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const variants = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <Badge className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const Transactions = () => {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasRealTransactions, setHasRealTransactions] = useState(false);
  
  // Real-time sync status
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const realtimeSubscription = useRef<any>(null);
  const [filter, setFilter] = useState<{
    status: string;
    location: string;
    dateRange: string;
  }>({
    status: 'all',
    location: 'all',
    dateRange: 'all'
  });
  
  const itemsPerPage = 10;
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [isExporting, setIsExporting] = useState(false);
  const pageSizeOptions = [10, 25, 50, 100];
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Load transactions from API and set up real-time sync
  useEffect(() => {
    if (!user) return;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        setSyncStatus('connecting');
        
        console.log('Loading transactions for user:', user.id);
        
        // Always get merchant ID from database
        let merchantId = null;
        console.log('Fetching merchant ID from database for user:', user.id);
        
        // Get user data from database using Clerk ID
        const dbUser = await userSyncService.getUserByClerkId(user.id);
        if (dbUser && dbUser.merchant_id) {
          merchantId = dbUser.merchant_id;
          console.log('Merchant ID from database:', merchantId);
        }
        
        if (!merchantId) {
          console.error('No merchant ID found for user');
          setError('No merchant ID found for user');
          setLoading(false);
          setSyncStatus('disconnected');
          return;
        }
        
        // Load transactions for this merchant
        // Create proper UserContext object using database values
        const userContext = {
          userId: user.id,
          merchantId: merchantId,
          role: dbUser?.role || 'merchant',
          approved: dbUser?.approved || false
        };
        
        const response = await transactionService.getTransactions(
          userContext,
          currentPage,
          pageSize
        );
        
        console.log('Transactions loaded:', response);
        
        if (response && response.transactions) {
          // Map the API response to our Transaction type
          const formattedTransactions = response.transactions.map((tx: any) => ({
            id: tx.transaction_id,
            date: new Date(tx.created_at).toLocaleString(),
            amount: tx.amount_fiat,
            crypto: `${tx.amount_crypto} ${tx.crypto_currency}`,
            status: tx.status as TransactionStatus,
            location: tx.locations?.name || 'Unknown',
            locationId: tx.location_id,
            terminal: tx.terminals?.name || 'Unknown',
            terminalId: tx.terminal_id,
            staff: tx.staff?.name || 'Unknown',
            chain: tx.blockchain || 'Unknown',
            txHash: tx.tx_hash || '',
            confirmations: tx.confirmations || 0,
            fee: tx.fee || 0,
            tip: tx.tip || 0
          }));
          
          setTransactions(formattedTransactions);
          setFilteredTransactions(formattedTransactions);
          setHasRealTransactions(formattedTransactions.length > 0);
          
          setTotalTransactions(response.totalCount || 0);
          setTotalPages(response.totalPages || 1);
        } else {
          console.log('No transactions found, using fallback data');
          setTransactions(fallbackTransactions);
          setFilteredTransactions(fallbackTransactions);
          setHasRealTransactions(false);
        }
      } catch (err) {
        console.error('Error loading transactions:', err);
        setError('Failed to load transactions');
        setTransactions(fallbackTransactions);
        setFilteredTransactions(fallbackTransactions);
        setHasRealTransactions(false);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();

    // Set up real-time subscription for transactions
    const setupRealtimeSubscription = async () => {
      if (!user) return;

      try {
        // Get merchant ID for filtering
        const dbUser = await userSyncService.getUserByClerkId(user.id);
        const merchantId = dbUser?.merchant_id;

        if (!merchantId) {
          console.log('No merchant ID available for realtime subscription');
          setSyncStatus('disconnected');
          return;
        }

        console.log('Setting up realtime subscription for merchant:', merchantId);

        // Create channel for transactions table
        const channel = supabase
          .channel('transactions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transactions',
              filter: `merchant_id=eq.${merchantId}`
            },
            (payload) => {
              console.log('Real-time transaction update:', payload);
              // Refresh transactions when changes occur
              loadTransactions();
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setSyncStatus('connected');
            } else if (status === 'CHANNEL_ERROR') {
              setSyncStatus('disconnected');
            } else {
              setSyncStatus('connecting');
            }
          });

        realtimeSubscription.current = channel;
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        setSyncStatus('disconnected');
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (realtimeSubscription.current) {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }
    };
  }, [user, currentPage, pageSize]);

  // Apply filtering to transactions
  useEffect(() => {
    const filtered = transactions.filter(transaction => {
      const matchesStatus = filter.status === 'all' || transaction.status === filter.status;
      const matchesLocation = filter.location === 'all' || transaction.location === filter.location;
      
      return matchesStatus && matchesLocation;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, filter]);

  // Filter handlers
  const handleStatusFilter = (status: string) => {
    setFilter(prev => ({ ...prev, status }));
  };

  const handleLocationFilter = (location: string) => {
    setFilter(prev => ({ ...prev, location }));
  };

  const handleDateRangeFilter = (dateRange: string) => {
    setFilter(prev => ({ ...prev, dateRange }));
  };

  // Pagination calculations
  // Use the state variables for totalTransactions and totalPages if hasRealTransactions is true
  // Otherwise calculate them from the filtered transactions
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, dateRange]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleExport = () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      alert('Transactions exported successfully!');
    }, 1500);
  };



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-3">Transactions</h1>
          {/* Sync Status Indicator */}
          <div className="flex items-center">
            <div 
              className={`h-3 w-3 rounded-full mr-2 ${syncStatus === 'connected' 
                ? 'bg-green-500 animate-pulse' 
                : syncStatus === 'connecting' 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-red-500'}`} 
            />
            <span className="text-xs font-medium">
              {syncStatus === 'connected' 
                ? 'Real-time sync' 
                : syncStatus === 'connecting' 
                  ? 'Connecting...' 
                  : 'Sync offline'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting || !hasRealTransactions}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by ID, date, or crypto..."
                className="w-full p-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filter.status === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={filter.status === 'completed' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleStatusFilter('completed')}
            >
              Completed
            </Button>
            <Button 
              variant={filter.status === 'pending' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={filter.status === 'failed' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleStatusFilter('failed')}
            >
              Failed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real Merchant Transactions Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Merchant Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading transactions: {error}</p>
            </div>
          ) : hasRealTransactions ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Transaction ID</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Location</th>
                    <th className="py-3 px-4 text-left">Terminal</th>
                    <th className="py-3 px-4 text-left">Staff</th>
                    <th className="py-3 px-4 text-left">Amount</th>
                    <th className="py-3 px-4 text-left">Crypto</th>
                    <th className="py-3 px-4 text-left">Chain</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{transaction.id}</td>
                        <td className="py-3 px-4">{transaction.date}</td>
                        <td className="py-3 px-4">{transaction.location || 'N/A'}</td>
                        <td className="py-3 px-4">{transaction.terminal || 'N/A'}</td>
                        <td className="py-3 px-4">{transaction.staff || 'N/A'}</td>
                        <td className="py-3 px-4">${transaction.amount.toFixed(2)}</td>
                        <td className="py-3 px-4">{transaction.crypto}</td>
                        <td className="py-3 px-4">{transaction.chain || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={transaction.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        No transactions found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No merchant transactions found. Transactions will appear here once your business starts processing payments.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No demo data shown in production - only real transactions */}

      {/* Pagination Controls */}
      {(hasRealTransactions ? totalTransactions : filteredTransactions.length) > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Results info and page size selector */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, hasRealTransactions ? totalTransactions : filteredTransactions.length)} of {hasRealTransactions ? totalTransactions : filteredTransactions.length} transactions
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pageSizeOptions.map((size: number) => (
                      <option key={size} value={size}>
                        {size} per page
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
              </div>

              {/* Pagination buttons */}
              {(hasRealTransactions ? totalPages : Math.ceil(filteredTransactions.length / pageSize)) > 1 && (
                <div className="flex items-center gap-2">
                  {/* Previous button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1"
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {filter.status === 'all' && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        All
                      </Badge>
                    )}
                    {filter.status === 'completed' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    )}
                    {filter.status === 'pending' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                    {filter.status === 'failed' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Failed
                      </Badge>
                    )}
                    {/* Current page and surrounding pages */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="px-3 py-1 min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                        <Button
                          variant={totalPages === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="px-3 py-1 min-w-[40px]"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Next button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal 
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

export default Transactions;
