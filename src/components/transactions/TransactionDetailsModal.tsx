import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Transaction, TransactionStatus } from './types';

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ 
  transaction, 
  onClose 
}) => {
  if (!transaction) return null;

  const statusVariants: Record<TransactionStatus, string> = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Transaction Details</span>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Transaction ID</p>
              <p className="font-medium">{transaction.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{transaction.date}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium">${transaction.amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Crypto</p>
              <p className="font-medium">{transaction.crypto}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <Badge className={statusVariants[transaction.status]}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{transaction.location || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Terminal</p>
              <p className="font-medium">{transaction.terminal || 'Unknown'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Staff Member</p>
              <p className="font-medium">{transaction.staff || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Chain</p>
              <p className="font-medium">{transaction.chain || 'Unknown'}</p>
            </div>
          </div>
          
          {transaction.txHash && (
            <div>
              <p className="text-sm text-gray-500">Transaction Hash</p>
              <p className="font-mono text-xs break-all">{transaction.txHash}</p>
              <button 
                onClick={() => window.open(`https://basescan.org/tx/${transaction.txHash}`, '_blank')}
                className="text-blue-600 hover:text-blue-800 text-sm mt-1"
              >
                View on Blockchain →
              </button>
            </div>
          )}
          
          {(transaction.fee || transaction.tip) && (
            <div className="grid grid-cols-2 gap-4">
              {transaction.fee && (
                <div>
                  <p className="text-sm text-gray-500">Network Fee</p>
                  <p className="font-medium">${transaction.fee.toFixed(2)}</p>
                </div>
              )}
              {transaction.tip && transaction.tip > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Tip</p>
                  <p className="font-medium">${transaction.tip.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {transaction.status === 'pending' && (
            <Button variant="default">Check Status</Button>
          )}
          {transaction.status === 'failed' && (
            <Button variant="default">Retry Payment</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default TransactionDetailsModal;
