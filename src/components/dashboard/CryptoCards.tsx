import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

interface CryptoCardProps {
  crypto: Crypto;
}

const CryptoCard: React.FC<CryptoCardProps> = ({ crypto }) => {
  const changeColorClass = 
    crypto.changeType === 'positive' ? 'text-green-500' : 
    crypto.changeType === 'negative' ? 'text-red-500' : 
    'text-slate-500';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {crypto.icon ? (
                <img src={crypto.icon} alt={crypto.name} className="w-8 h-8 mr-2" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-2">
                  {crypto.symbol.substring(0, 1)}
                </div>
              )}
              <div>
                <h3 className="font-medium">{crypto.name}</h3>
                <p className="text-xs text-slate-500">{crypto.symbol}</p>
              </div>
            </div>
            <Badge variant={crypto.changeType === 'positive' ? 'success' : crypto.changeType === 'negative' ? 'destructive' : 'secondary'}>
              {crypto.change}
            </Badge>
          </div>
          <p className="text-2xl font-bold">{crypto.price}</p>
        </div>
        <div className={`h-1 ${crypto.changeType === 'positive' ? 'bg-green-500' : crypto.changeType === 'negative' ? 'bg-red-500' : 'bg-slate-200'}`}></div>
      </CardContent>
    </Card>
  );
};

interface CryptoCardsProps {
  cryptos: Crypto[];
}

const CryptoCards: React.FC<CryptoCardsProps> = ({ cryptos }) => {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Cryptocurrencies</h2>
        <p className="text-sm text-slate-500">Track the cryptocurrencies you accept</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cryptos.map((crypto) => (
          <CryptoCard key={crypto.id} crypto={crypto} />
        ))}
      </div>
    </div>
  );
};

export default CryptoCards;
