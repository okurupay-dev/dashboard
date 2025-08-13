import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

// Sample data for analytics
const sampleData = {
  monthlySummary: {
    totalTransactions: 487,
    totalVolume: 24680.45,
    averageTransaction: 50.68,
    successRate: 94.2
  },
  transactionTrends: [
    { month: 'Jan', volume: 18450.32 },
    { month: 'Feb', volume: 19320.45 },
    { month: 'Mar', volume: 21450.67 },
    { month: 'Apr', volume: 20780.89 },
    { month: 'May', volume: 22340.56 },
    { month: 'Jun', volume: 23670.78 },
    { month: 'Jul', volume: 24680.45 }
  ],
  topCryptoCurrencies: [
    { name: 'Bitcoin (BTC)', percentage: 45.8 },
    { name: 'Ethereum (ETH)', percentage: 32.1 },
    { name: 'Solana (SOL)', percentage: 12.4 },
    { name: 'Cardano (ADA)', percentage: 6.2 },
    { name: 'Others', percentage: 3.5 }
  ],
  conversionRates: [
    { currency: 'BTC to USD', rate: '41,667.00' },
    { currency: 'ETH to USD', rate: '2,380.95' },
    { currency: 'SOL to USD', rate: '112.36' },
    { currency: 'ADA to USD', rate: '3.13' }
  ]
};

const Analytics: React.FC = () => {
  const [data, setData] = useState(sampleData);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const handleExport = () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      alert('Analytics data exported successfully!');
    }, 1500);
  };

  // Function to generate a simple bar chart using divs
  const renderBarChart = () => {
    const maxVolume = Math.max(...data.transactionTrends.map(item => item.volume));
    
    return (
      <div className="flex items-end h-64 gap-4 mt-4">
        {data.transactionTrends.map((item, index) => {
          const height = (item.volume / maxVolume) * 100;
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="w-full bg-indigo-500 rounded-t-md" 
                style={{ height: `${Math.max(height, 1)}%`, minHeight: '4px' }}
              ></div>
              <div className="mt-2 text-xs font-medium">{item.month}</div>
              <div className="text-xs text-gray-500">${(item.volume / 1000).toFixed(1)}k</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Function to generate a simple pie chart representation
  const renderPieChart = () => {
    return (
      <div className="mt-4">
        {data.topCryptoCurrencies.map((item, index) => (
          <div key={index} className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm font-medium">{item.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full" 
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Transactions</div>
                <div className="text-2xl font-bold">{data.monthlySummary.totalTransactions}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Volume</div>
                <div className="text-2xl font-bold">${data.monthlySummary.totalVolume.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Avg. Transaction</div>
                <div className="text-2xl font-bold">${data.monthlySummary.averageTransaction}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold">{data.monthlySummary.successRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date Range Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="mt-4">
              <Button className="w-full">Apply Filter</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {renderBarChart()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cryptocurrency Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPieChart()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Currency Pair</th>
                    <th className="py-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.conversionRates.map((rate, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{rate.currency}</td>
                      <td className="py-2 text-right">{rate.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Transaction Success Rate</span>
                  <span className="text-sm font-medium">{data.monthlySummary.successRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${data.monthlySummary.successRate}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Processing Speed</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: '92%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm font-medium">88%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-500 h-2.5 rounded-full" 
                    style={{ width: '88%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">System Uptime</span>
                  <span className="text-sm font-medium">99.8%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-500 h-2.5 rounded-full" 
                    style={{ width: '99.8%' }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
