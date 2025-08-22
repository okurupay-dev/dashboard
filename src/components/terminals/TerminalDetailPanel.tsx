import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TerminalDetails } from './types';
import { formatDistanceToNow } from 'date-fns';
import RefundModal from './RefundModal';

interface TerminalDetailPanelProps {
  terminal: TerminalDetails;
  onRefund: (txHash: string, reason: string) => void;
  onResendReceipt: (txHash: string) => void;
}

const TerminalDetailPanel: React.FC<TerminalDetailPanelProps> = ({
  terminal,
  onRefund,
  onResendReceipt
}) => {
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  
  // Mock function to check if user has refund permissions
  const hasRefundPermission = () => true;
  
  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  const formatLastCheckIn = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  const getTransactionStateColor = (state: string) => {
    switch (state) {
      case 'idle': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'awaiting_payment': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'detected': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirming': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'expired': return 'bg-red-100 text-red-800 border-red-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getTransactionStateLabel = (state: string) => {
    switch (state) {
      case 'idle': return 'Idle';
      case 'awaiting_payment': return 'Awaiting Payment';
      case 'detected': return 'Payment Detected';
      case 'confirming': return `Confirming (${terminal.currentTransaction.confirmations}/${terminal.currentTransaction.requiredConfirmations})`;
      case 'confirmed': return 'Confirmed';
      case 'expired': return 'Expired';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };
  
  const handleRefundSubmit = (reason: string) => {
    if (terminal.currentTransaction.txHash) {
      onRefund(terminal.currentTransaction.txHash, reason);
      setIsRefundModalOpen(false);
    }
  };
  
  const handleResendReceipt = () => {
    if (terminal.currentTransaction.txHash) {
      onResendReceipt(terminal.currentTransaction.txHash);
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Terminal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Identity Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Identity</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Terminal ID</span>
                  <span className="text-sm font-medium">{terminal.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pairing Code</span>
                  <span className="text-sm font-medium">{terminal.pairingCode}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-gray-500">Wallet Mapping</span>
                  {Object.entries(terminal.walletMapping).map(([chain, address]) => (
                    <div key={chain} className="flex justify-between">
                      <span className="text-xs">{chain}</span>
                      <span className="text-xs font-mono truncate max-w-[150px]">{address}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Health Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Health</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Uptime</span>
                  <span className="text-sm font-medium">{terminal.health.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Firmware Version</span>
                  <span className="text-sm font-medium">{terminal.health.firmwareVersion}</span>
                </div>
                {terminal.health.battery !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Battery</span>
                    <span className="text-sm font-medium">{terminal.health.battery}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">IP Address</span>
                  <span className="text-sm font-medium">{terminal.health.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Heartbeat</span>
                  <span className="text-sm font-medium">
                    {formatLastCheckIn(terminal.health.lastHeartbeat)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Live Session */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Live Session</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                {terminal.liveSession.staffName ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Staff</span>
                      <span className="text-sm font-medium">{terminal.liveSession.staffName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Started</span>
                      <span className="text-sm font-medium">
                        {terminal.liveSession.startedAt ? formatTimestamp(terminal.liveSession.startedAt) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Idle Time</span>
                      <span className="text-sm font-medium">
                        {terminal.liveSession.idleTime ? `${terminal.liveSession.idleTime}s` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Lock State</span>
                      <Badge variant="outline" className={
                        terminal.liveSession.lockState === 'locked' 
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-green-100 text-green-800 border-green-300'
                      }>
                        {terminal.liveSession.lockState === 'locked' ? 'Locked' : 'Unlocked'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    <p>No active session</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Current Transaction */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Transaction</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                {terminal.currentTransaction.state !== 'idle' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Status</span>
                      <Badge 
                        variant="outline" 
                        className={getTransactionStateColor(terminal.currentTransaction.state)}
                      >
                        {getTransactionStateLabel(terminal.currentTransaction.state)}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {terminal.currentTransaction.fiatAmount} {terminal.currentTransaction.fiatCurrency}
                        </div>
                        <div className="text-xs text-gray-500">
                          {terminal.currentTransaction.cryptoAmount} {terminal.currentTransaction.cryptoCurrency}
                        </div>
                      </div>
                    </div>
                    
                    {terminal.currentTransaction.chain && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Chain</span>
                        <span className="text-sm font-medium">{terminal.currentTransaction.chain}</span>
                      </div>
                    )}
                    
                    {terminal.currentTransaction.txHash && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tx Hash</span>
                        <a 
                          href={`https://example.com/tx/${terminal.currentTransaction.txHash}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-blue-600 hover:underline truncate max-w-[150px]"
                        >
                          {terminal.currentTransaction.txHash.substring(0, 8)}...
                        </a>
                      </div>
                    )}
                    
                    {terminal.currentTransaction.state === 'confirmed' && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleResendReceipt}
                        >
                          Re-send E-receipt
                        </Button>
                        
                        {hasRefundPermission() && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => setIsRefundModalOpen(true)}
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    <p>No active transaction on this terminal.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
              <div className="bg-gray-50 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminal.recentActivity.map((activity, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatTimestamp(activity.timestamp)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{activity.action}</div>
                          {activity.details && (
                            <div className="text-xs text-gray-500">{activity.details}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">{activity.user}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={
                            activity.result === 'success'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }>
                            {activity.result === 'success' ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <RefundModal 
        isOpen={isRefundModalOpen} 
        onClose={() => setIsRefundModalOpen(false)}
        onSubmit={handleRefundSubmit}
        transactionDetails={{
          amount: `${terminal.currentTransaction.cryptoAmount} ${terminal.currentTransaction.cryptoCurrency}`,
          fiatAmount: `${terminal.currentTransaction.fiatAmount} ${terminal.currentTransaction.fiatCurrency}`,
          txHash: terminal.currentTransaction.txHash || ''
        }}
      />
    </>
  );
};

export default TerminalDetailPanel;
