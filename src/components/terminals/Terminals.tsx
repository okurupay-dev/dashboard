import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Location, 
  Terminal, 
  NetworkStatus, 
  TerminalDetails, 
  TerminalStats 
} from './types';
import TerminalsTable from './TerminalsTable';
import TerminalDetailPanel from './TerminalDetailPanel';
import { Badge } from '../ui/badge';

// Sample data
const sampleLocations: Location[] = [
  { id: '1', name: 'San Francisco HQ' },
  { id: '2', name: 'New York Store' },
  { id: '3', name: 'Los Angeles Store' },
  { id: '4', name: 'Chicago Store' },
];

const sampleTerminals: Terminal[] = [
  { 
    id: 'TERM-001', 
    name: 'Checkout 1', 
    locationId: '1', 
    status: 'online', 
    lastCheckIn: '2025-08-13T13:15:00-04:00', 
    version: '2.3.1', 
    lastUser: 'Alex Johnson', 
    transactionsLast24h: 42, 
    errors: 0 
  },
  { 
    id: 'TERM-002', 
    name: 'Checkout 2', 
    locationId: '1', 
    status: 'online', 
    lastCheckIn: '2025-08-13T13:10:00-04:00', 
    version: '2.3.1', 
    lastUser: 'Maria Garcia', 
    transactionsLast24h: 38, 
    errors: 2 
  },
  { 
    id: 'TERM-003', 
    name: 'Mobile POS 1', 
    locationId: '1', 
    status: 'offline', 
    lastCheckIn: '2025-08-13T10:45:00-04:00', 
    version: '2.3.0', 
    lastUser: 'John Smith', 
    transactionsLast24h: 17, 
    errors: 3 
  },
  { 
    id: 'TERM-004', 
    name: 'Checkout 1', 
    locationId: '2', 
    status: 'online', 
    lastCheckIn: '2025-08-13T13:12:00-04:00', 
    version: '2.3.1', 
    lastUser: 'Emily Davis', 
    transactionsLast24h: 31, 
    errors: 0 
  },
  { 
    id: 'TERM-005', 
    name: 'Checkout 1', 
    locationId: '3', 
    status: 'online', 
    lastCheckIn: '2025-08-13T13:05:00-04:00', 
    version: '2.3.1', 
    lastUser: 'David Wilson', 
    transactionsLast24h: 27, 
    errors: 1 
  },
];

const sampleNetworkStatus: NetworkStatus = {
  status: 'online',
  lastUpdated: '2025-08-13T13:30:00-04:00'
};

const sampleTerminalStats: Record<string, TerminalStats> = {
  '1': {
    onlineCount: 2,
    offlineCount: 1,
    confirmedTransactions: 85,
    pendingTransactions: 12,
    averageConfirmationTimes: {
      'Bitcoin': 12.5,
      'Ethereum': 3.2,
      'Litecoin': 2.8
    }
  },
  '2': {
    onlineCount: 1,
    offlineCount: 0,
    confirmedTransactions: 31,
    pendingTransactions: 0,
    averageConfirmationTimes: {
      'Bitcoin': 13.1,
      'Ethereum': 3.5,
      'Litecoin': 2.9
    }
  },
  '3': {
    onlineCount: 1,
    offlineCount: 0,
    confirmedTransactions: 27,
    pendingTransactions: 0,
    averageConfirmationTimes: {
      'Bitcoin': 12.8,
      'Ethereum': 3.3,
      'Litecoin': 2.7
    }
  },
  '4': {
    onlineCount: 0,
    offlineCount: 0,
    confirmedTransactions: 0,
    pendingTransactions: 0,
    averageConfirmationTimes: {}
  }
};

const sampleTerminalDetails: Record<string, TerminalDetails> = {
  'TERM-001': {
    id: 'TERM-001',
    name: 'Checkout 1',
    pairingCode: 'PAIR-X72Y9Z',
    walletMapping: {
      'Bitcoin': '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
      'Ethereum': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      'Litecoin': 'LTC_WALLET_ADDRESS'
    },
    health: {
      uptime: 99.8,
      firmwareVersion: '2.3.1',
      ip: '192.168.1.101',
      lastHeartbeat: '2025-08-13T13:35:00-04:00'
    },
    liveSession: {
      staffName: 'Alex Johnson',
      startedAt: '2025-08-13T08:30:00-04:00',
      idleTime: 120, // seconds
      lockState: 'unlocked'
    },
    currentTransaction: {
      state: 'confirming',
      fiatAmount: 250.00,
      fiatCurrency: 'USD',
      cryptoAmount: 0.00425,
      cryptoCurrency: 'BTC',
      chain: 'Bitcoin',
      txHash: '3a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u',
      confirmations: 2,
      requiredConfirmations: 6
    },
    recentActivity: [
      {
        timestamp: '2025-08-13T13:30:00-04:00',
        action: 'Payment Received',
        user: 'Alex Johnson',
        result: 'success',
        details: 'BTC 0.00425'
      },
      {
        timestamp: '2025-08-13T13:15:00-04:00',
        action: 'Sale Started',
        user: 'Alex Johnson',
        result: 'success',
        details: 'USD 250.00'
      },
      {
        timestamp: '2025-08-13T12:45:00-04:00',
        action: 'Payment Confirmed',
        user: 'Alex Johnson',
        result: 'success',
        details: 'BTC 0.00315'
      }
    ]
  },
  'TERM-002': {
    id: 'TERM-002',
    name: 'Checkout 2',
    pairingCode: 'PAIR-A1B2C3',
    walletMapping: {
      'Bitcoin': '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
      'Ethereum': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      'Litecoin': 'LTC_WALLET_ADDRESS'
    },
    health: {
      uptime: 98.5,
      firmwareVersion: '2.3.1',
      ip: '192.168.1.102',
      lastHeartbeat: '2025-08-13T13:32:00-04:00'
    },
    liveSession: {
      staffName: 'Maria Garcia',
      startedAt: '2025-08-13T09:15:00-04:00',
      idleTime: 300, // seconds
      lockState: 'unlocked'
    },
    currentTransaction: {
      state: 'idle'
    },
    recentActivity: [
      {
        timestamp: '2025-08-13T13:20:00-04:00',
        action: 'Payment Confirmed',
        user: 'Maria Garcia',
        result: 'success',
        details: 'ETH 0.15'
      },
      {
        timestamp: '2025-08-13T13:10:00-04:00',
        action: 'Payment Received',
        user: 'Maria Garcia',
        result: 'success',
        details: 'ETH 0.15'
      },
      {
        timestamp: '2025-08-13T13:05:00-04:00',
        action: 'Sale Started',
        user: 'Maria Garcia',
        result: 'success',
        details: 'USD 175.00'
      }
    ]
  }
};

const Terminals: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>(sampleLocations[0].id);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(sampleNetworkStatus);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [terminalStats, setTerminalStats] = useState<TerminalStats | null>(null);
  const [terminalDetails, setTerminalDetails] = useState<TerminalDetails | null>(null);

  // Filter terminals by selected location
  useEffect(() => {
    const filteredTerminals = sampleTerminals.filter(
      terminal => terminal.locationId === selectedLocation
    );
    setTerminals(filteredTerminals);
    setTerminalStats(sampleTerminalStats[selectedLocation]);
    
    // Reset selected terminal if it's not in the filtered list
    if (selectedTerminal && !filteredTerminals.find(t => t.id === selectedTerminal)) {
      setSelectedTerminal(null);
      setTerminalDetails(null);
    }
  }, [selectedLocation, selectedTerminal]);

  // Load terminal details when a terminal is selected
  useEffect(() => {
    if (selectedTerminal) {
      setTerminalDetails(sampleTerminalDetails[selectedTerminal] || null);
    } else {
      setTerminalDetails(null);
    }
  }, [selectedTerminal]);

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleTerminalChange = (terminalId: string) => {
    setSelectedTerminal(terminalId);
  };

  const handleDisableTerminal = (terminalId: string) => {
    // In a real app, this would call an API to disable the terminal
    console.log(`Disabling terminal ${terminalId}`);
    
    // Update the local state to reflect the change
    setTerminals(terminals.map(terminal => 
      terminal.id === terminalId 
        ? { ...terminal, status: 'offline' } 
        : terminal
    ));
    
    // Update terminal stats
    if (terminalStats) {
      setTerminalStats({
        ...terminalStats,
        onlineCount: terminalStats.onlineCount - 1,
        offlineCount: terminalStats.offlineCount + 1
      });
    }
  };

  const handleRefund = (txHash: string, reason: string) => {
    // In a real app, this would call an API to process the refund
    console.log(`Processing refund for transaction ${txHash}, reason: ${reason}`);
    
    // Update the terminal details to reflect the refund
    if (terminalDetails && terminalDetails.currentTransaction.txHash === txHash) {
      setTerminalDetails({
        ...terminalDetails,
        currentTransaction: {
          ...terminalDetails.currentTransaction,
          state: 'idle'
        },
        recentActivity: [
          {
            timestamp: new Date().toISOString(),
            action: 'Refund Processed',
            user: 'Current User',
            result: 'success',
            details: `${terminalDetails.currentTransaction.cryptoAmount} ${terminalDetails.currentTransaction.cryptoCurrency}, Reason: ${reason}`
          },
          ...terminalDetails.recentActivity
        ]
      });
    }
  };

  const handleResendReceipt = (txHash: string) => {
    // In a real app, this would call an API to resend the receipt
    console.log(`Resending receipt for transaction ${txHash}`);
    
    // Add an activity log entry
    if (terminalDetails && terminalDetails.currentTransaction.txHash === txHash) {
      setTerminalDetails({
        ...terminalDetails,
        recentActivity: [
          {
            timestamp: new Date().toISOString(),
            action: 'Receipt Resent',
            user: 'Current User',
            result: 'success',
            details: `Transaction: ${txHash}`
          },
          ...terminalDetails.recentActivity
        ]
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-white py-6 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* Location Switcher */}
            <div className="px-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
              <div className="relative">
                <select 
                  className="w-full p-3 pl-4 pr-10 bg-white border border-gray-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                  value={selectedLocation}
                  onChange={(e) => handleLocationChange(e.target.value)}
                >
                  {sampleLocations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Terminal Switcher */}
            <div className="px-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Terminal</label>
              <div className="relative">
                <select 
                  className="w-full p-3 pl-4 pr-10 bg-white border border-gray-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                  value={selectedTerminal || ''}
                  onChange={(e) => handleTerminalChange(e.target.value)}
                >
                  <option value="">All Terminals</option>
                  {terminals.map(terminal => (
                    <option key={terminal.id} value={terminal.id}>
                      {terminal.name} ({terminal.id})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Network Status */}
            <div className="flex items-center justify-end h-12 px-4">
              <div className="bg-gray-50 px-6 py-3 rounded-lg flex items-center">
                <span className="text-sm font-medium text-gray-600 mr-4">Network Status:</span>
                {networkStatus.status === 'online' && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 px-4 py-1.5 font-medium rounded-md">
                    Online
                  </Badge>
                )}
                {networkStatus.status === 'degraded' && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 px-4 py-1.5 font-medium rounded-md">
                    Degraded
                  </Badge>
                )}
                {networkStatus.status === 'offline' && (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 px-4 py-1.5 font-medium rounded-md">
                    Offline
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Terminals Overview */}
        <div className="lg:col-span-2">
          {/* Stats Cards */}
          {terminalStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Terminal Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{terminalStats.onlineCount}</p>
                      <p className="text-sm text-gray-500">Online</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{terminalStats.offlineCount}</p>
                      <p className="text-sm text-gray-500">Offline</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Transactions Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{terminalStats.confirmedTransactions}</p>
                      <p className="text-sm text-gray-500">Confirmed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{terminalStats.pendingTransactions}</p>
                      <p className="text-sm text-gray-500">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confirmation Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(terminalStats.averageConfirmationTimes).map(([chain, time]) => (
                      <div key={chain} className="flex justify-between">
                        <span className="text-sm">{chain}</span>
                        <span className="text-sm font-medium">{time} min</span>
                      </div>
                    ))}
                    {Object.keys(terminalStats.averageConfirmationTimes).length === 0 && (
                      <p className="text-sm text-gray-500">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Terminals Table */}
          <Card>
            <CardHeader>
              <CardTitle>Terminals</CardTitle>
            </CardHeader>
            <CardContent>
              <TerminalsTable 
                terminals={terminals} 
                onSelectTerminal={handleTerminalChange}
                onDisableTerminal={handleDisableTerminal}
                selectedTerminalId={selectedTerminal}
              />
              {terminals.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No terminals found</p>
                  <p className="max-w-sm mx-auto">There are no terminals registered at this location. Terminals will appear here once they are set up and paired with this location.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right: Selected Terminal Detail Panel */}
        <div>
          {terminalDetails ? (
            <TerminalDetailPanel 
              terminal={terminalDetails} 
              onRefund={handleRefund}
              onResendReceipt={handleResendReceipt}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Terminal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No terminal selected</p>
                  <p className="max-w-sm mx-auto">Select a terminal from the table to view detailed information, monitor live sessions, and manage transactions.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminals;
