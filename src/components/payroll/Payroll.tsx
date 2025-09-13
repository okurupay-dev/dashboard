import React from 'react';
import { UserCheck, ExternalLink } from 'lucide-react';

const Payroll: React.FC = () => {
  const handleRedirectToPayrollApp = () => {
    // This will be updated later to redirect to the actual payroll app
    console.log('Redirecting to payroll application...');
    // window.open('https://payroll.okurupay.com', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
              <p className="text-gray-600">Manage employee payments and payroll processing</p>
            </div>
          </div>
          <button
            onClick={handleRedirectToPayrollApp}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>Open Payroll App</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>


    </div>
  );
};

export default Payroll;
