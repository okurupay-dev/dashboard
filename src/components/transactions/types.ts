// Define transaction status type
export type TransactionStatus = 'completed' | 'pending' | 'failed';

// Define payment type
export type PaymentType = 'PT' | 'VT' | 'Invoice' | 'Web';

// Define transaction interface
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  crypto: string;
  status: TransactionStatus;
  location?: string;
  locationId?: string;
  terminal?: string;
  terminalId?: string;
  staff?: string;
  chain?: string;
  txHash?: string;
  confirmations?: number;
  fee?: number;
  tip?: number;
  notes?: string;
  paymentType?: PaymentType;
}

// Define transaction filter type
export type TransactionFilter = TransactionStatus | 'all';
