import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  BarChart3, 
  CreditCard, 
  Users, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  User,
  LogOut,
  Smartphone,
  FileText,
  TrendingUp,
  FileBarChart,
  Calculator,
  Package,
  Wallet,
  Home, Activity, DollarSign, Monitor, UserCheck, Menu, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletStatus } from '../../hooks/useWalletStatus';
import logo from '../../logo.svg';

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
  const navigate = useNavigate();
  const { userData, merchantData, signOut } = useAuth();
  const [userName, setUserName] = useState('');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({ name: '' });
  const currentPath = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      // Use the 'name' field from the users table
      setUserName(userData.name || '');
    }
    if (merchantData) {
      setMerchantInfo({
        name: merchantData.name || '',
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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // Collapse all sections when sidebar is collapsed
    if (!isCollapsed) {
      setExpandedSections({
        home: false,
        activity: false,
        sales: false,
        finance: false,
        operations: false,
        tools: false
      });
    }
  };

  const toggleSection = (section: string) => {
    // Don't allow section expansion when sidebar is collapsed
    if (isCollapsed) return;
    
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[section];
      
      // If clicking on an already expanded section, collapse it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [section]: false
        };
      }
      
      // Otherwise, collapse all sections and expand only the clicked one
      const newState: {[key: string]: boolean} = {};
      Object.keys(prev).forEach(key => {
        newState[key] = key === section;
      });
      
      return newState;
    });
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
        { path: '/taxes', label: 'Taxes', icon: Calculator, showIndicator: false, isSubItem: false },
        { path: '/payroll', label: 'Payroll', icon: UserCheck, showIndicator: false, isSubItem: false }
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: Monitor,
      items: [
        { path: '/terminals', label: 'Terminals', icon: Monitor, showIndicator: false, isSubItem: false },
        { path: '/terminals/virtual', label: 'Virtual Terminals', icon: Smartphone, showIndicator: false, isSubItem: false },
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
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 shadow-lg flex flex-col flex-shrink-0 overflow-y-auto bg-white border-r border-gray-200`}>
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'justify-between p-6'} border-b border-gray-200`}>
          {!isCollapsed && (
            <div className="flex items-center">
              <img src={logo} alt="Okuru Logo" className="h-8 w-auto" />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
        {/* Main Menu */}
        <div className="flex-1 p-4">
          {!isCollapsed && (
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Main Menu
            </div>
          )}
          
          <nav className="space-y-3">
            {navigationCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isExpanded = expandedSections[category.id];
              const hasActiveItem = category.items.some(item => currentPath === item.path);
              
              return (
                <div key={category.id} className="space-y-2">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleSection(category.id)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center p-4' : 'justify-between p-4'} rounded-lg hover:bg-gray-100 transition-all duration-200 group ${
                      hasActiveItem ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                    title={isCollapsed ? category.title : ''}
                  >
                    <div className="flex items-center">
                      <CategoryIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-4'} ${hasActiveItem ? 'text-blue-600' : 'text-gray-500'}`} />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">{category.title}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    )}
                  </button>
                  
                  {/* Category Items */}
                  {isExpanded && !isCollapsed && (
                    <div className="space-y-2 ml-6 pl-4 border-l border-gray-200">
                      {category.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = currentPath === item.path;
                        
                        return (
                          <Link key={item.path} to={item.path}>
                            <div className={`
                              flex items-center p-3 rounded-lg transition-all duration-200 text-sm
                              ${isActive 
                                ? 'bg-blue-100 text-blue-700 font-medium' 
                                : 'hover:bg-gray-50 text-gray-600'
                              }
                              ${item.showIndicator ? 'border border-yellow-200 bg-yellow-50' : ''}
                            `}>
                              <ItemIcon className="h-4 w-4 mr-4" />
                              <span>{item.label}</span>
                              {item.showIndicator && (
                                <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-200 text-yellow-800">
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
        </div>
        {/* Settings Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-4' : 'p-4'} rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-700 transition-all duration-200`}
              title={isCollapsed ? 'Sign Out' : ''}
            >
              <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-4'}`} />
              {!isCollapsed && <span className="text-sm">Sign Out</span>}
            </button>
          </div>
          
          {/* User Info - Clickable to Settings */}
          {!isCollapsed && (
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center">
                <User className="h-8 w-8 p-1.5 bg-gray-200 rounded-full mr-3" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-600 truncate">{merchantInfo.name}</p>
                </div>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          )}
          
          {/* Collapsed User Icon - Clickable to Settings */}
          {isCollapsed && (
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex justify-center p-4 rounded-lg hover:bg-gray-100 transition-all duration-200"
              title="Settings"
            >
              <User className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {currentPath === '/' ? 'Dashboard' : ''}
              {currentPath === '/transactions' ? 'Transactions' : ''}
              {currentPath === '/invoices' ? 'Invoices' : ''}
              {currentPath === '/products' ? 'Products' : ''}
              {currentPath === '/wallets' ? 'Wallets' : ''}
              {currentPath === '/taxes' ? 'Taxes' : ''}
              {currentPath === '/payroll' ? 'Payroll' : ''}
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
