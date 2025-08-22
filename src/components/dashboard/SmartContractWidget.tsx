import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Contract {
  address: string;
  name: string;
  rules: number;
  explorer: string;
}

interface SmartContractWidgetProps {
  contracts: Contract[];
  onEditRules: (contractAddress: string) => void;
}

const SmartContractWidget: React.FC<SmartContractWidgetProps> = ({ contracts, onEditRules }) => {
  const truncateAddress = (address: string) => {
    if (!address) return '';
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Smart Contract Transparency</h2>
      </div>
      <div className="space-y-4">
        {contracts.map((contract) => (
          <div key={contract.address} className="border border-gray-200 rounded-md p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{contract.name}</h3>
              <a 
                href={contract.explorer} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View on Explorer
              </a>
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <span>{truncateAddress(contract.address)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">{contract.rules}</span> active rules
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => onEditRules(contract.address)}
              >
                Edit Rules
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SmartContractWidget;
