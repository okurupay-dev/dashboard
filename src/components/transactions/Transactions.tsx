import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Transaction, TransactionStatus, TransactionFilter } from './types';
import TransactionDetailsModal from './TransactionDetailsModal';
import { transactionService } from '../../lib/supabase/services';
import { getUserMetadata } from '../../lib/clerk/sessionUtils';

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

  // Load transactions from Supabase
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const metadata = getUserMetadata(user);
        if (!metadata?.merchantId || !metadata?.approved) {
          console.log('User metadata not ready, using fallback data');
          setTransactions(fallbackTransactions);
          setFilteredTransactions(fallbackTransactions);
          setLoading(false);
          return;
        }

        const userContext = {
          userId: user.id,
          merchantId: metadata.merchantId,
          role: metadata.role as 'admin' | 'merchant' | 'staff',
          approved: metadata.approved
        };

        // Load transactions from API
        const transactionData = await transactionService.getTransactions(userContext, 1, 100); // Load more for pagination
        
        if (transactionData?.transactions) {
          // Transform API data to match Transaction interface
          const transformedTransactions: Transaction[] = transactionData.transactions.map(tx => ({
            id: tx.transaction_id,
            date: new Date(tx.created_at).toLocaleString(),
            amount: tx.amount_fiat,
            crypto: `${tx.amount_crypto} ${tx.crypto_currency}`,
            status: tx.status as TransactionStatus,
            location: tx.locations?.name || 'Unknown',
            locationId: tx.location_id,
            terminal: tx.terminals?.name || 'Unknown',
            terminalId: tx.terminal_id,
            staff: tx.users?.name || 'Unknown',
            chain: tx.blockchain || 'Unknown',
            txHash: tx.tx_hash || '',
            confirmations: tx.confirmations || 0,
            fee: tx.fee || 0,
            tip: tx.tip || 0
          }));
          
          setTransactions(transformedTransactions);
          setFilteredTransactions(transformedTransactions);
        } else {
          setTransactions(fallbackTransactions);
          setFilteredTransactions(fallbackTransactions);
        }
      } catch (err) {
        console.error('Error loading transactions:', err);
        setError('Failed to load transactions');
        setTransactions(fallbackTransactions);
        setFilteredTransactions(fallbackTransactions);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user]);

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
  const totalTransactions = filteredTransactions.length;
  const totalPages = Math.ceil(totalTransactions / pageSize);
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
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
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

      <Card>
        <CardContent className="p-0">
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
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No transactions found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalTransactions > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Results info and page size selector */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalTransactions)} of {totalTransactions} transactions
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
              {totalPages > 1 && (
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
