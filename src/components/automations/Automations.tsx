import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface Automation {
  id: string;
  name: string;
  actionType: 'convert' | 'transfer' | 'split' | 'swap';
  token: string;
  condition: string;
  threshold: number;
  action: string;
  actionDescription: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
  transactionHash?: string;
}

const sampleAutomations: Automation[] = [
  {
    id: '1',
    name: 'BTC Price Alert',
    actionType: 'convert',
    token: 'BTC',
    condition: 'above',
    threshold: 50000,
    action: 'notification',
    actionDescription: 'Sell 50% to USDC',
    status: 'active',
    createdAt: '2025-07-15T10:30:00Z',
    lastTriggered: '2025-08-10T14:22:00Z',
    transactionHash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t'
  },
  {
    id: '2',
    name: 'ETH Balance Transfer',
    actionType: 'transfer',
    token: 'ETH',
    condition: 'above',
    threshold: 5,
    action: 'transfer',
    actionDescription: 'Transfer to cold wallet',
    status: 'active',
    createdAt: '2025-07-20T09:15:00Z',
    lastTriggered: '2025-08-12T11:45:00Z',
    transactionHash: '0x9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a'
  },
  {
    id: '3',
    name: 'USDC Transaction Alert',
    actionType: 'swap',
    token: 'USDC',
    condition: 'equals',
    threshold: 1000,
    action: 'notification',
    actionDescription: 'Swap to ETH',
    status: 'inactive',
    createdAt: '2025-08-01T16:20:00Z'
  }
];

// Helper function to format action and condition in plain language
const formatActionWithCondition = (automation: Automation): string => {
  const { token, condition, threshold, actionDescription } = automation;
  
  let conditionText = '';
  switch (condition) {
    case 'above':
      conditionText = `when ${token} balance ≥ $${threshold.toLocaleString()}`;
      break;
    case 'below':
      conditionText = `when ${token} balance ≤ $${threshold.toLocaleString()}`;
      break;
    case 'equals':
      conditionText = `when ${token} balance = $${threshold.toLocaleString()}`;
      break;
    default:
      conditionText = `when ${token} ${condition} $${threshold.toLocaleString()}`;
  }
  
  return `${actionDescription} ${conditionText}`;
};

const Automations: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>(sampleAutomations);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterToken, setFilterToken] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredAutomations = automations.filter(automation => {
    const matchesToken = filterToken === 'all' || automation.token === filterToken;
    const matchesType = filterType === 'all' || automation.actionType === filterType;
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesToken && matchesType && matchesSearch;
  });

  const handleCreateAutomation = () => {
    setShowCreateModal(true);
  };

  const handleToggleStatus = (id: string) => {
    setAutomations(prevAutomations => 
      prevAutomations.map(automation => 
        automation.id === id 
          ? { ...automation, status: automation.status === 'active' ? 'inactive' : 'active' }
          : automation
      )
    );
  };

  const handleDeleteAutomation = (id: string) => {
    setAutomations(prevAutomations => 
      prevAutomations.filter(automation => automation.id !== id)
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <Button onClick={handleCreateAutomation}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Create Automation
        </Button>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Filter Automations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input 
                placeholder="Search by name..." 
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Token</label>
              <Select value={filterToken} onValueChange={setFilterToken}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                  <SelectItem value="SOL">Solana (SOL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Action Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Action Types</SelectItem>
                  <SelectItem value="convert">Convert</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="swap">Swap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <div className="bg-white rounded-md shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action & Condition</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Triggered</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAutomations
                  .filter(automation => automation.status === 'active')
                  .map((automation) => (
                    <tr key={automation.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{automation.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{automation.token}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{automation.actionType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatActionWithCondition(automation)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {automation.lastTriggered && automation.transactionHash ? (
                          <a 
                            href={`https://etherscan.io/tx/${automation.transactionHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {new Date(automation.lastTriggered).toLocaleString()}
                          </a>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          onClick={() => console.log('Edit', automation.id)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-yellow-600 hover:text-yellow-900 mr-4"
                          onClick={() => handleToggleStatus(automation.id)}
                        >
                          Disable
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteAutomation(automation.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        <TabsContent value="all">
          <div className="bg-white rounded-md shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action & Condition</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Triggered</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAutomations.map((automation) => (
                  <tr key={automation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{automation.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{automation.token}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{automation.actionType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatActionWithCondition(automation)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        automation.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {automation.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {automation.lastTriggered && automation.transactionHash ? (
                        <a 
                          href={`https://etherscan.io/tx/${automation.transactionHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {new Date(automation.lastTriggered).toLocaleString()}
                        </a>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        onClick={() => console.log('Edit', automation.id)}
                      >
                        Edit
                      </button>
                      <button 
                        className={`${
                          automation.status === 'active' 
                            ? 'text-yellow-600 hover:text-yellow-900' 
                            : 'text-green-600 hover:text-green-900'
                        } mr-4`}
                        onClick={() => handleToggleStatus(automation.id)}
                      >
                        {automation.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteAutomation(automation.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Automation Modal would go here */}
    </div>
  );
};

export default Automations;
