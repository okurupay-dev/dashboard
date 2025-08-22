import React from 'react';
import { Terminal } from './types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface TerminalDetailModalProps {
  terminal: Terminal;
  isOpen: boolean;
  onClose: () => void;
}

const TerminalDetailModal: React.FC<TerminalDetailModalProps> = ({
  terminal,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const formatLastCheckIn = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {terminal.deviceType === 'physical' ? (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{terminal.name}</h2>
              <p className="text-sm text-gray-500 font-mono">{terminal.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Terminal Type</h3>
              {terminal.deviceType === 'physical' ? (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                  Physical Terminal
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                  </svg>
                  Virtual Terminal
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
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
                  Pending Activation
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

          {/* Terminal Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Terminal Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Terminal ID:</span>
                <p className="font-mono text-gray-900 mt-1">{terminal.id}</p>
              </div>
              {terminal.pairingCode && (
                <div>
                  <span className="text-gray-500">Pairing Code:</span>
                  <p className="font-mono text-gray-900 mt-1">{terminal.pairingCode}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Last Check-in:</span>
                <p className="text-gray-900 mt-1">{formatLastCheckIn(terminal.lastCheckIn)}</p>
              </div>
              {terminal.version && (
                <div>
                  <span className="text-gray-500">Version:</span>
                  <p className="text-gray-900 mt-1">v{terminal.version}</p>
                </div>
              )}
              {terminal.lastUser && (
                <div>
                  <span className="text-gray-500">Last User:</span>
                  <p className="text-gray-900 mt-1">{terminal.lastUser}</p>
                </div>
              )}
              {terminal.ipAddress && (
                <div>
                  <span className="text-gray-500">IP Address:</span>
                  <p className="font-mono text-gray-900 mt-1">{terminal.ipAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{terminal.transactionsLast24h || 0}</p>
                  <p className="text-sm text-gray-500">Transactions (24h)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {terminal.errors > 0 ? (
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{terminal.errors}</p>
                  <p className="text-sm text-gray-500">Errors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Info (if available) */}
          {terminal.hardwareInfo && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Hardware Information</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(terminal.hardwareInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {terminal.deviceType === 'virtual' && (
            <Button 
              onClick={() => {
                // Navigate to virtual terminal management
                window.location.href = '/terminals/virtual';
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Manage Virtual Terminal
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalDetailModal;
