import React from 'react';
import { Card } from '../ui/card';

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
}

interface CryptoCardsProps {
  cryptos: Crypto[];
}

const CryptoCards: React.FC<CryptoCardsProps> = ({ cryptos }) => {
  const handleCryptoClick = (cryptoId: string, hasAutomation: boolean) => {
    console.log(`Crypto clicked: ${cryptoId}, has automation: ${hasAutomation}`);
    // In a real app, this would navigate to automations page filtered by this crypto
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Portfolio</h2>
        <button className="text-indigo-600 hover:text-indigo-800">Configure</button>
      </div>
      <div className="space-y-4">
        {cryptos.map((crypto) => (
          <div 
            key={crypto.id} 
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            onClick={() => handleCryptoClick(crypto.id, crypto.hasAutomation)}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <img src={crypto.icon} alt={crypto.name} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center">
                  <h3 className="font-medium">{crypto.name}</h3>
                  {crypto.hasAutomation && (
                    <div 
                      className="ml-2 text-blue-500" 
                      title={crypto.automationRule}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">{crypto.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end">
                <p className="font-medium">${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className={`text-sm ml-2 ${crypto.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {crypto.change >= 0 ? '+' : ''}{crypto.change}%
                </p>
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium">{crypto.balance} {crypto.symbol}</p>
                <p className="text-xs text-gray-500">${crypto.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CryptoCards;
