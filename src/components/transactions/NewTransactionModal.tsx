import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Transaction, TransactionStatus } from './types';

interface NewTransactionModalProps {
  onClose: () => void;
  onAddTransaction: (transaction: Transaction) => void;
}

const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ 
  onClose,
  onAddTransaction
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    crypto: 'BTC',
    cryptoAmount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate crypto amount when amount changes (simplified conversion)
    if (name === 'amount') {
      const numAmount = parseFloat(value) || 0;
      let cryptoAmount = 0;
      
      // Simple mock conversion rates
      switch(formData.crypto) {
        case 'BTC':
          cryptoAmount = numAmount * 0.000025;
          break;
        case 'ETH':
          cryptoAmount = numAmount * 0.00033;
          break;
        case 'USDT':
          cryptoAmount = numAmount * 1;
          break;
        default:
          cryptoAmount = 0;
      }
      
      setFormData(prev => ({ 
        ...prev, 
        cryptoAmount: cryptoAmount.toFixed(6)
      }));
    }
    
    // Update crypto amount when crypto type changes
    if (name === 'crypto') {
      const numAmount = parseFloat(formData.amount) || 0;
      let cryptoAmount = 0;
      
      // Simple mock conversion rates
      switch(value) {
        case 'BTC':
          cryptoAmount = numAmount * 0.000025;
          break;
        case 'ETH':
          cryptoAmount = numAmount * 0.00033;
          break;
        case 'USDT':
          cryptoAmount = numAmount * 1;
          break;
        default:
          cryptoAmount = 0;
      }
      
      setFormData(prev => ({ 
        ...prev, 
        cryptoAmount: cryptoAmount.toFixed(6)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Generate a transaction ID
    const transactionId = 'TX' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Get current date in the format "MMM DD, YYYY hh:mm AM/PM"
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Create new transaction
    const newTransaction: Transaction = {
      id: transactionId,
      date: formattedDate,
      amount: parseFloat(formData.amount),
      crypto: `${formData.cryptoAmount} ${formData.crypto}`,
      status: 'pending' as TransactionStatus
    };
    
    // Simulate API call
    setTimeout(() => {
      onAddTransaction(newTransaction);
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>New Transaction</span>
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
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USD)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cryptocurrency
              </label>
              <select
                name="crypto"
                value={formData.crypto}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crypto Amount
              </label>
              <input
                type="text"
                value={formData.cryptoAmount}
                className="w-full p-2 border rounded-md bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Estimated amount based on current exchange rate
              </p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="font-medium text-blue-800">Transaction Information</h4>
              <p className="text-sm text-blue-700 mt-1">
                This transaction will be created with a "Pending" status. Once the payment is confirmed, the status will be updated automatically.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewTransactionModal;
