import React from 'react';
import { Card, CardContent } from '../ui/card';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  description 
}) => {
  const changeColorClass = 
    changeType === 'positive' ? 'text-green-500' : 
    changeType === 'negative' ? 'text-red-500' : 
    'text-slate-500';

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-gray-500 text-sm mb-1">{title}</h3>
        <div className="flex items-end">
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <span className={`ml-2 text-sm ${changeColorClass}`}>{change}</span>
          )}
        </div>
        {description && (
          <p className="text-gray-500 text-xs mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  stats: {
    todaySales: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    transactions: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    averageSale: {
      value: string;
      change: string;
      changeType: 'positive' | 'negative' | 'neutral';
    };
    pendingSettlement: {
      value: string;
    };
  };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        title="Today's Sales" 
        value={stats.todaySales.value} 
        change={stats.todaySales.change}
        changeType={stats.todaySales.changeType}
        description="Compared to yesterday"
      />
      <StatCard 
        title="Transactions" 
        value={stats.transactions.value} 
        change={stats.transactions.change}
        changeType={stats.transactions.changeType}
        description="Compared to yesterday"
      />
      <StatCard 
        title="Average Sale" 
        value={stats.averageSale.value} 
        change={stats.averageSale.change}
        changeType={stats.averageSale.changeType}
        description="Compared to yesterday"
      />
      <StatCard 
        title="Pending Settlement" 
        value={stats.pendingSettlement.value}
      />
    </div>
  );
};

export default StatsCards;
