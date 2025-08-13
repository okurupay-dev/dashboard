import React from 'react';
import { Terminal } from './types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

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
  // Mock function to check if user is admin
  const isAdmin = () => true;

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
            <th className="px-4 py-3">Name / Terminal ID</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Check-in</th>
            <th className="px-4 py-3">App/Firmware</th>
            <th className="px-4 py-3">Last User</th>
            <th className="px-4 py-3">Tx in 24h</th>
            <th className="px-4 py-3">Errors</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((terminal) => (
            <tr 
              key={terminal.id} 
              className={`border-b hover:bg-gray-50 ${selectedTerminalId === terminal.id ? 'bg-indigo-50' : ''}`}
            >
              <td className="px-4 py-3">
                <div className="font-medium">{terminal.name}</div>
                <div className="text-xs text-gray-500">{terminal.id}</div>
              </td>
              <td className="px-4 py-3">
                {terminal.status === 'online' ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    Offline
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {formatLastCheckIn(terminal.lastCheckIn)}
              </td>
              <td className="px-4 py-3">
                {terminal.version}
              </td>
              <td className="px-4 py-3">
                {terminal.lastUser}
              </td>
              <td className="px-4 py-3">
                {terminal.transactionsLast24h}
              </td>
              <td className="px-4 py-3">
                {terminal.errors > 0 ? (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    {terminal.errors}
                  </Badge>
                ) : (
                  <span>0</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectTerminal(terminal.id)}
                  >
                    View
                  </Button>
                  {isAdmin() && terminal.status === 'online' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => onDisableTerminal(terminal.id)}
                    >
                      Disable
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TerminalsTable;
