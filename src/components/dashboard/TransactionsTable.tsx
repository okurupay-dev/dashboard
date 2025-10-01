import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  crypto: string;
  status: 'completed' | 'pending' | 'failed';
  location: string;
  terminalId: string;
  type: 'VT Terminal' | 'PH Terminal' | 'Invoice';
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
  return (
    <Card className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        <button className="text-indigo-600 hover:text-indigo-800">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Transaction ID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Stablecoin</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Terminal ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{transaction.id}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{transaction.date}</td>
                <td className="px-4 py-3 text-sm text-gray-900">${transaction.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{transaction.crypto}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{transaction.location}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{transaction.terminalId}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={transaction.status}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant="outline" className="text-xs">
                    {transaction.type}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TransactionsTable;
