import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Settings } from 'lucide-react';

interface CurrencyData {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  network?: string;
}

interface PortfolioChartProps {
  totalLifetimeProcessed: number;
  currencies: CurrencyData[];
  assetCount: number;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ 
  totalLifetimeProcessed, 
  currencies, 
  assetCount 
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [enabledTokens, setEnabledTokens] = useState<Record<string, boolean>>({
    'USDC': true,
    'USDT': true,
    'DAI': true,
    'USDbC': true
  });
  
  // All available tokens that we support
  const availableTokens = [
    { symbol: 'USDC', name: 'USD Coin', color: '#2563eb' },
    { symbol: 'USDT', name: 'Tether', color: '#10b981' },
    { symbol: 'DAI', name: 'Dai', color: '#f59e0b' },
    { symbol: 'USDbC', name: 'USD Base Coin', color: '#8b5cf6' }
  ];
  
  // Filter to only show VT-supported assets (Base network stablecoins) that are enabled
  const vtSupportedAssets = currencies.filter(currency => 
    ['USDC', 'USDT', 'DAI', 'USDbC'].includes(currency.symbol) && 
    currency.network === 'Base' &&
    enabledTokens[currency.symbol]
  );
  
  // Recalculate percentages for VT-supported assets only
  const totalProcessableAmount = vtSupportedAssets.reduce((sum, asset) => sum + asset.amount, 0);
  const processableCurrencies = vtSupportedAssets.map(asset => ({
    ...asset,
    percentage: totalProcessableAmount > 0 ? (asset.amount / totalProcessableAmount) * 100 : 0
  }));

  // Check if we have any real data
  const hasRealData = totalProcessableAmount > 0 && processableCurrencies.length > 0;

  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold">Portfolio</h2>
          <p className="text-sm text-gray-500">Top assets you can accept for payments</p>
        </div>
        <button 
          className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          onClick={() => setShowConfigModal(true)}
        >
          <Settings className="w-4 h-4" />
          <span>Configure</span>
        </button>
      </div>

      {hasRealData ? (
        <>
          {/* Portfolio Summary */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${totalProcessableAmount.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
            <div className="text-sm text-gray-500">
              {processableCurrencies.length} Assets • Lifetime Processed
            </div>
          </div>

          {/* Compact Horizontal Bar Chart */}
          <div className="space-y-3">
            {processableCurrencies.map((currency, index) => (
              <div key={currency.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={currency.icon} 
                      alt={currency.name} 
                      className="w-5 h-5 rounded-full" 
                      onError={(e) => {
                        // Fallback to a generic crypto icon if image fails to load
                        (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,${btoa(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">${currency.symbol}</text>
                          </svg>
                        `)}`;
                      }}
                    />
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{currency.symbol}/BASE</span>
                      <span className="text-xs text-gray-500 ml-1">{currency.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">
                      ${currency.amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currency.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out group-hover:opacity-80"
                    style={{ 
                      backgroundColor: currency.color,
                      width: `${currency.percentage}%`,
                      boxShadow: `0 0 8px ${currency.color}40`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

        </>
      ) : (
        /* No Data State */
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Data Yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Your portfolio will show here once you start receiving payments in supported cryptocurrencies.
          </p>
          <div className="text-xs text-gray-400">
            Supported: USDC, USDT, DAI, USDbC on Base Network
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Configure Accepted Tokens</h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Choose which tokens you want to accept for payments. Only enabled tokens will be available in your payment forms.
            </p>
            
            <div className="space-y-3">
              {availableTokens.map((token) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: token.color }}
                    />
                    <div>
                      <span className="font-medium text-sm">{token.symbol}/BASE</span>
                      <div className="text-xs text-gray-500">{token.name}</div>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabledTokens[token.symbol]}
                      onChange={(e) => setEnabledTokens(prev => ({
                        ...prev,
                        [token.symbol]: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-800">
                <strong>Note:</strong> Changes will apply to new invoices and payment forms. Existing invoices remain unchanged.
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Here you would save the configuration to the backend
                  console.log('Saving token configuration:', enabledTokens);
                  setShowConfigModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PortfolioChart;
