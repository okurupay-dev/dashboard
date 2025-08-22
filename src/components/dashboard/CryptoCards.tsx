import React, { useState } from 'react';
import { Card } from '../ui/card';
import { X, Settings } from 'lucide-react';

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  balance: number;
  balanceUsd: number;
  icon: string;
  hasAutomation: boolean;
  automationRule?: string;
  network?: string;
}

interface CryptoCardsProps {
  cryptos: Crypto[];
}

const CryptoCards: React.FC<CryptoCardsProps> = ({ cryptos }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [visibleAssets, setVisibleAssets] = useState<Record<string, boolean>>(
    cryptos.reduce((acc, crypto) => ({ ...acc, [crypto.id]: true }), {})
  );

  const handleCryptoClick = (cryptoId: string, hasAutomation: boolean) => {
    console.log(`Crypto clicked: ${cryptoId}, has automation: ${hasAutomation}`);
    // In a real app, this would navigate to automations page filtered by this crypto
  };

  const toggleAssetVisibility = (assetId: string) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetId]: !prev[assetId]
    }));
  };

  const visibleCryptos = cryptos.filter(crypto => visibleAssets[crypto.id]);

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
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
      {/* Horizontal Asset Display */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {visibleCryptos.map((crypto) => (
          <div 
            key={crypto.id} 
            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleCryptoClick(crypto.id, crypto.hasAutomation)}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <img src={crypto.icon} alt={crypto.name} className="w-5 h-5" />
              </div>
              <div className="w-full">
                <h3 className="font-medium text-xs truncate">{crypto.symbol}</h3>
                {crypto.network && (
                  <span className="text-xs text-gray-500 truncate block">
                    {crypto.network}
                  </span>
                )}
                <div className="mt-1">
                  <p className="text-xs font-medium">${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  <p className={`text-xs ${crypto.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {crypto.change >= 0 ? '+' : ''}{crypto.change}%
                  </p>
                </div>
                {crypto.hasAutomation && (
                  <div className="mt-1 text-blue-500" title={crypto.automationRule}>
                    <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Configure Portfolio Assets</h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {cryptos.map((crypto) => (
                <div key={crypto.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={crypto.icon} alt={crypto.name} className="w-6 h-6" />
                    <div>
                      <span className="font-medium text-sm">{crypto.name}</span>
                      <div className="text-xs text-gray-500">{crypto.network} Network</div>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={visibleAssets[crypto.id]}
                      onChange={() => toggleAssetVisibility(crypto.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CryptoCards;
