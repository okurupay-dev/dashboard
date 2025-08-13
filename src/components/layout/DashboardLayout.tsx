import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import logo from '../../assets/images/logo.svg';

// This would typically come from a context or API call
interface MerchantInfo {
  name: string;
  logo?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useClerk();
  
  // This would typically come from an API call or context
  // For now using sample data that would be replaced with actual merchant data
  const merchantInfo: MerchantInfo = {
    name: "Crypto Cafe",
    logo: logo // Using the imported logo as a placeholder, would be merchant's logo URL
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // User will be automatically redirected to sign-in page by the ProtectedRoute
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col">
        <div className="flex items-center mb-10 px-2">
          <img src={logo} alt="Okuru Logo" className="h-12 w-auto" />
        </div>
        
        <nav className="space-y-4 mt-2">
          <Link to="/">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="ml-1">Dashboard</span>
            </div>
          </Link>
          <Link to="/transactions">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/transactions' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-1">Transactions</span>
            </div>
          </Link>
          <Link to="/analytics">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/analytics' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="ml-1">Analytics</span>
            </div>
          </Link>
          <Link to="/settings">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/settings' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="ml-1">Settings</span>
            </div>
          </Link>
          <Link to="/terminals">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/terminals' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="ml-1">Terminals</span>
            </div>
          </Link>
          <Link to="/staff">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/staff' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="ml-1">Staff</span>
            </div>
          </Link>
          <Link to="/automations">
            <div className={`sidebar-item flex items-center p-4 rounded-lg transition-all duration-200 ${currentPath === '/automations' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="ml-1">Automations</span>
            </div>
          </Link>
        </nav>
        
        <div className="mt-auto pt-8">
          <div className="p-3 mb-3 border-t pt-3">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">John Merchant</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="sidebar-item flex items-center text-gray-600 p-2 rounded-md hover:bg-gray-100 w-full text-left transition-colors duration-200 hover:text-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {currentPath === '/dashboard' ? 'Dashboard' : ''}
              {currentPath === '/transactions' ? 'Transactions' : ''}
              {currentPath === '/analytics' ? 'Analytics' : ''}
              {currentPath === '/settings' ? 'Settings' : ''}
              {currentPath === '/terminals' ? 'Terminals' : ''}
            </h1>
          </div>
          <div className="flex items-center">
            <img 
              src={merchantInfo.logo} 
              alt={`${merchantInfo.name} Logo`} 
              className="h-5 w-auto mr-1.5" 
            />
            <span className="text-sm font-medium text-gray-700">{merchantInfo.name}</span>
          </div>
        </div>
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
