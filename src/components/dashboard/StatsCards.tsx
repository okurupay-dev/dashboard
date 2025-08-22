import React from 'react';
import { Card, CardContent } from '../ui/card';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  footer?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, footer }) => {
  return (
    <Card className="flex-1">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {change !== undefined && (
              <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </p>
            )}
            {footer && (
              <p className="text-xs text-gray-500 mt-2">{footer}</p>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  stats: {
    todaySales: {
      amount: number;
      currency: string;
      change: number;
    };
    transactions: {
      count: number;
      change: number;
    };
    averageSale: {
      amount: number;
      currency: string;
      change: number;
    };
    automationsTriggered: {
      count: number;
      change: number;
      lastTriggered: string;
    };
  };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Today's Sales"
        value={`${stats.todaySales.currency} ${stats.todaySales.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={stats.todaySales.change}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        }
      />
      <StatCard
        title="Transactions"
        value={stats.transactions.count.toString()}
        change={stats.transactions.change}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
        }
      />
      <StatCard
        title="Average Sale"
        value={`${stats.averageSale.currency} ${stats.averageSale.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={stats.averageSale.change}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        }
      />
      <StatCard
        title="Automations Triggered"
        value={stats.automationsTriggered.count.toString()}
        change={stats.automationsTriggered.change}
        footer={`Last triggered ${stats.automationsTriggered.lastTriggered}`}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 4.06c0-1.336 1.616-2.005 2.56-1.06l4.5 4.5c.945.945.276 2.56-1.06 2.56H3.5c-1.336 0-2.005-1.616-1.06-2.56l4.5-4.5c.945-.945 2.56-.276 2.56 1.06V16a2 2 0 0 0 2 2h.5a2 2 0 0 0 2-2V4.06z"></path>
          </svg>
        }
      />
    </div>
  );
};

export default StatsCards;
