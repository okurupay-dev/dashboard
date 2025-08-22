import React, { useState } from 'react';
import { Terminal } from './types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import TerminalDetailModal from './TerminalDetailModal';

interface TerminalsTableProps {
  terminals: Terminal[];
  onSelectTerminal: (terminalId: string) => void;
  onDisableTerminal: (terminalId: string) => void;
  selectedTerminalId: string | null;
}

const TerminalsTable: React.FC<TerminalsTableProps> = ({
  terminals,
  onSelectTerminal,
  onDisableTerminal,
  selectedTerminalId
}) => {
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mock function to check if user is admin
  const isAdmin = () => true;
  
  const handleViewTerminal = (terminal: Terminal) => {
    setSelectedTerminal(terminal);
    setIsModalOpen(true);
    onSelectTerminal(terminal.id);
  };

  const formatLastCheckIn = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left font-semibold">Terminal Details</th>
            <th className="px-6 py-4 text-left font-semibold">Type & Status</th>
            <th className="px-6 py-4 text-left font-semibold">Activity</th>
            <th className="px-6 py-4 text-left font-semibold">Performance</th>
            <th className="px-6 py-4 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((terminal) => (
            <tr 
              key={terminal.id} 
              className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${selectedTerminalId === terminal.id ? 'bg-indigo-50' : ''}`}
            >
              {/* Terminal Details */}
              <td className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {terminal.deviceType === 'physical' ? (
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{terminal.name}</div>
                    <div className="text-sm text-gray-500 font-mono">{terminal.id}</div>
                    {terminal.pairingCode && (
                      <div className="text-xs text-gray-400 mt-1">
                        Pairing: {terminal.pairingCode}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              
              {/* Type & Status */}
              <td className="px-6 py-4">
                <div className="space-y-2">
                  {terminal.deviceType === 'physical' ? (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                      </svg>
                      Physical
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                      </svg>
                      Virtual
                    </Badge>
                  )}
                  <div>
                    {terminal.status === 'online' ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Online
                      </Badge>
                    ) : terminal.status === 'offline' ? (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        Offline
                      </Badge>
                    ) : terminal.status === 'maintenance' ? (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        Maintenance
                      </Badge>
                    ) : terminal.status === 'pending_activation' ? (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                        Pending
                      </Badge>
                    ) : terminal.status === 'paired' ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Paired
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                        {terminal.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </td>
              
              {/* Activity */}
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">Last seen:</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatLastCheckIn(terminal.lastCheckIn)}
                  </div>
                  {terminal.lastUser && (
                    <div className="text-xs text-gray-500">
                      User: {terminal.lastUser}
                    </div>
                  )}
                  {terminal.version && (
                    <div className="text-xs text-gray-500">
                      v{terminal.version}
                    </div>
                  )}
                </div>
              </td>
              
              {/* Performance */}
              <td className="px-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{terminal.transactionsLast24h || 0}</span>
                    <span className="text-xs text-gray-500">tx/24h</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {terminal.errors > 0 ? (
                      <>
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                          {terminal.errors} errors
                        </Badge>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm text-green-600 font-medium">No errors</span>
                      </>
                    )}
                  </div>
                </div>
              </td>
              
              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewTerminal(terminal)}
                    className="flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <span>View</span>
                  </Button>
                  {isAdmin() && terminal.status === 'online' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 flex items-center space-x-1"
                      onClick={() => onDisableTerminal(terminal.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                      </svg>
                      <span>Disable</span>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {terminals.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏪</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No terminals found</h3>
          <p className="text-gray-500">
            No terminals are currently registered for this merchant.
          </p>
        </div>
      )}
      
      {selectedTerminal && (
        <TerminalDetailModal
          terminal={selectedTerminal}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTerminal(null);
          }}
        />
      )}
    </div>
  );
};

export default TerminalsTable;
