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
import { terminalService } from '../../lib/services/terminalService';
import { useAuth } from '../../contexts/AuthContext';

const sampleNetworkStatus: NetworkStatus = {
  status: 'online',
  lastUpdated: new Date().toISOString()
};

const Terminals: React.FC = () => {
  const { userData, merchantData } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [terminalDetails, setTerminalDetails] = useState<TerminalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [terminalStats, setTerminalStats] = useState<TerminalStats | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(sampleNetworkStatus);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userData || !merchantData) return;
      
      try {
        setLoading(true);
        const merchantId = merchantData.merchant_id;
        if (!merchantId) {
          setError('Unable to determine merchant ID');
          return;
        }

        // Load locations
        const locationsData = await terminalService.getLocations(merchantId);
        setLocations(locationsData);
        
        // Set default location if available
        if (locationsData.length > 0 && !selectedLocation) {
          setSelectedLocation(locationsData[0].id);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load terminal data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userData]);

  // Load terminals when user is available
  useEffect(() => {
    const loadTerminals = async () => {
      if (!userData) return;
      
      try {
        const merchantId = merchantData?.merchant_id;
        if (!merchantId) return;

        // Load all terminals for merchant (not filtered by location)
        const terminalsData = await terminalService.getTerminals(merchantId);
        setTerminals(terminalsData);
        
        // Load terminal stats for all locations
        const statsData = await terminalService.getTerminalStats(merchantId);
        setTerminalStats(statsData);
        
      } catch (err) {
        console.error('Error loading terminals:', err);
        setError('Failed to load terminals');
      }
    };

    loadTerminals();
  }, [userData]);


  // Load terminal details when a terminal is selected
  useEffect(() => {
    const loadTerminalDetails = async () => {
      if (!selectedTerminal) {
        setTerminalDetails(null);
        return;
      }
      
      try {
        const details = await terminalService.getTerminalDetails(selectedTerminal.id);
        setTerminalDetails(details);
      } catch (err) {
        console.error('Error loading terminal details:', err);
        setTerminalDetails(null);
      }
    };

    loadTerminalDetails();
  }, [selectedTerminal]);

  // Real-time sync - refresh terminal data every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (!userData || !selectedLocation) return;
      
      try {
        const merchantId = merchantData?.merchant_id;
        if (!merchantId) return;

        // Refresh terminals data
        const terminalsData = await terminalService.getTerminalsByLocation(merchantId, selectedLocation);
        setTerminals(terminalsData);
        
        // Refresh terminal stats
        const statsData = await terminalService.getTerminalStats(merchantId, selectedLocation);
        setTerminalStats(statsData);
        
        // Update network status based on terminal connectivity
        const onlineTerminals = terminalsData.filter(t => t.status === 'online').length;
        const totalTerminals = terminalsData.length;
        
        if (totalTerminals === 0) {
          setNetworkStatus({ status: 'offline', lastUpdated: new Date().toISOString() });
        } else if (onlineTerminals === 0) {
          setNetworkStatus({ status: 'offline', lastUpdated: new Date().toISOString() });
        } else if (onlineTerminals < totalTerminals) {
          setNetworkStatus({ status: 'degraded', lastUpdated: new Date().toISOString() });
        } else {
          setNetworkStatus({ status: 'online', lastUpdated: new Date().toISOString() });
        }
        
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Error refreshing terminal data:', err);
      }
    }, 30000); // 30 seconds

    return () => {
      if (userData) {
        clearInterval(refreshInterval);
      }
    };
  }, [userData, selectedLocation]);

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleTerminalSelect = (terminalId: string) => {
    const terminal = terminals.find(t => t.id === terminalId);
    setSelectedTerminal(terminal || null);
  };

  const handleDisableTerminal = async (terminalId: string) => {
    try {
      const success = await terminalService.updateTerminalStatus(terminalId, 'offline');
      if (success) {
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
            onlineCount: Math.max(0, terminalStats.onlineCount - 1),
            offlineCount: terminalStats.offlineCount + 1
          });
        }
      }
    } catch (err) {
      console.error('Error disabling terminal:', err);
      alert('Failed to disable terminal. Please try again.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading terminals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error loading terminals</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="bg-white py-6 mb-8">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Terminals</h1>
              <p className="text-gray-600">Manage your physical and virtual terminals</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Network Status */}
              <div className="text-right">
                <div className="text-sm text-gray-500">Network Status</div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terminals Table */}
      <div className="max-w-7xl mx-auto px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Terminals</h2>
          </div>
          
          <TerminalsTable
            terminals={terminals}
            onSelectTerminal={handleTerminalSelect}
            onDisableTerminal={handleDisableTerminal}
            selectedTerminalId={selectedTerminal?.id || null}
          />
        </div>
      </div>
    </div>
  );
};

export default Terminals;
