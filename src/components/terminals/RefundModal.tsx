import React, { useState } from 'react';
import { Button } from '../ui/button';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  transactionDetails: {
    amount: string;
    fiatAmount: string;
    txHash: string;
  };
}

const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  transactionDetails
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onSubmit(reason);
      setReason('');
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Process Refund</h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Transaction</span>
            <span className="text-sm font-mono">{transactionDetails.txHash.substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Amount (Fiat)</span>
            <span className="text-sm font-medium">{transactionDetails.fiatAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Amount (Crypto)</span>
            <span className="text-sm font-medium">{transactionDetails.amount}</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Refund
            </label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for this refund..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundModal;
