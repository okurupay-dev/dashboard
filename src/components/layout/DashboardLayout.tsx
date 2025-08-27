import React, { useState, useEffect } from 'react';
import { useWalletStatus } from '../../hooks/useWalletStatus';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/images/logo.svg';
import { 
  Home, Activity, DollarSign, CreditCard, Settings, 
  Users, Package, BarChart3, FileText, Calculator,
  Monitor, ChevronDown, ChevronRight, User, LogOut
} from 'lucide-react';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// This would typically come from a context or API call
interface MerchantInfo {
  name: string;
  logoUrl?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { shouldShowIndicator } = useWalletStatus();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, userData, merchantData } = useAuth();
  const [userName, setUserName] = useState<string>('Loading...');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    name: 'Loading...',
    logoUrl: logo
  });
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    home: true,
    activity: false,
    sales: false,
    finance: false,
    operations: false,
    tools: false
  });
  
  // Fetch user name and merchant info from database
  useEffect(() => {
    if (userData) {
      setUserName(userData.name || 'User');
    }
    if (merchantData) {
      setMerchantInfo({
        name: merchantData.name || 'Unknown Merchant',
        logoUrl: merchantData.logo_url || undefined
      });
    }
  }, [userData, merchantData]);
  


  const handleLogout = async () => {
    if (isDevelopment) {
      // In development mode, just reload the page
      window.location.reload();
      return;
    }
    
    try {
      if (signOut) {
        await signOut();
      }
      // User will be automatically redirected to sign-in page by the ProtectedRoute
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigationCategories = [
    {
      id: 'home',
      title: 'Home',
      icon: Home,
      items: [
        { path: '/', label: 'Dashboard', icon: Home, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'activity',
      title: 'Activity',
      icon: Activity,
      items: [
        { path: '/transactions', label: 'Transactions', icon: DollarSign, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'sales',
      title: 'Sales',
      icon: BarChart3,
      items: [
        { path: '/invoices', label: 'Invoices', icon: FileText, showIndicator: false, isSubItem: false },
        { path: '/products', label: 'Products', icon: Package, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: CreditCard,
      items: [
        { path: '/wallets', label: 'Wallets', icon: CreditCard, showIndicator: shouldShowIndicator, isSubItem: false },
        { path: '/taxes', label: 'Taxes', icon: Calculator, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: Monitor,
      items: [
        { path: '/terminals', label: 'Terminals', icon: Monitor, showIndicator: false, isSubItem: false },
        { path: '/terminals/virtual', label: 'Virtual Terminals', icon: Monitor, showIndicator: false, isSubItem: true },
        { path: '/staff', label: 'Staff', icon: Users, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'tools',
      title: 'Tools',
      icon: BarChart3,
      items: [
        { path: '/analytics', label: 'Analytics', icon: BarChart3, showIndicator: false, isSubItem: false },
        { path: '/reports', label: 'Reports', icon: FileText, showIndicator: false, isSubItem: false }
      ]
    }
  ];
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shadow-lg p-6 flex flex-col flex-shrink-0 overflow-y-auto" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #999999 100%)' }}>
        <div className="flex items-center mb-10 px-2">
          <img src={logo} alt="Okuru Logo" className="h-12 w-auto" />
        </div>
        
        <nav className="space-y-2 mt-2 flex-1">
          {navigationCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedSections[category.id];
            
            return (
              <div key={category.id} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all duration-200"
                >
                  <div className="flex items-center">
                    <CategoryIcon className="h-4 w-4 mr-3" />
                    <span>{category.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {/* Category Items */}
                {isExpanded && (
                  <div className="space-y-1 ml-2">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = currentPath === item.path;
                      
                      return (
                        <Link key={item.path} to={item.path}>
                          <div className={`
                            sidebar-item flex items-center p-3 rounded-lg transition-all duration-200
                            ${item.isSubItem ? 'ml-4' : ''}
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                              : 'hover:bg-gray-50 text-gray-700'
                            }
                            ${item.showIndicator ? 'wallet-attention-border' : ''}
                          `}>
                            <ItemIcon className="h-4 w-4 mr-3" />
                            <span className="text-sm">{item.label}</span>
                            {item.showIndicator && (
                              <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 opacity-80">
                                required
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* User Account Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center p-3 rounded-lg bg-gray-50 mb-3">
            <User className="h-8 w-8 p-1.5 bg-gray-200 rounded-full mr-3" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-600 truncate">{merchantInfo.name}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-3" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #999999 100%)' }}>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {currentPath === '/' ? 'Dashboard' : ''}
              {currentPath === '/transactions' ? 'Transactions' : ''}
              {currentPath === '/invoices' ? 'Invoices' : ''}
              {currentPath === '/products' ? 'Products' : ''}
              {currentPath === '/wallets' ? 'Wallets' : ''}
              {currentPath === '/taxes' ? 'Taxes' : ''}
              {currentPath === '/terminals' ? 'Terminals' : ''}
              {currentPath === '/terminals/virtual' ? 'Virtual Terminals' : ''}
              {currentPath === '/staff' ? 'Staff' : ''}
              {currentPath === '/analytics' ? 'Analytics' : ''}
              {currentPath === '/reports' ? 'Reports' : ''}
            </h1>
          </div>
          <div className="flex items-center">
            {merchantInfo.logoUrl && merchantInfo.logoUrl !== logo ? (
              <img 
                src={merchantInfo.logoUrl} 
                alt={`${merchantInfo.name} Logo`} 
                className="h-5 w-auto mr-1.5" 
              />
            ) : null}
            <span className="text-sm font-medium text-gray-700">{merchantInfo.name}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Add CSS for the wallet attention animation
const walletAttentionStyle = `
  @keyframes walletBorderPulse {
    0% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.7); }
    70% { box-shadow: 0 0 0 4px rgba(252, 211, 77, 0); }
    100% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0); }
  }

  .wallet-attention-border {
    animation: walletBorderPulse 2s infinite;
    border: 1px solid #fcd34d;
    background: linear-gradient(135deg, rgba(252, 211, 77, 0.1) 0%, rgba(252, 211, 77, 0.05) 100%);
  }
`;

// Add the style to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = walletAttentionStyle;
  document.head.appendChild(styleElement);
}

export default DashboardLayout;
