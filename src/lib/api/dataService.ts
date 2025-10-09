import { useAuth } from '../../contexts/AuthContext';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.okurupay.com';

// Utility function to sanitize strings and prevent UTF-8 encoding issues
const sanitizeString = (str: any): string => {
  if (!str) return '';
  return String(str)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // Remove BOM and other problematic Unicode characters
    .trim();
};

// Utility function to sanitize entire payload
const sanitizePayload = (payload: any): any => {
  if (typeof payload === 'string') {
    return sanitizeString(payload);
  }
  
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item));
  }
  
  if (payload && typeof payload === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(payload)) {
      sanitized[key] = sanitizePayload(value);
    }
    return sanitized;
  }
  
  return payload;
};

// Interface for API requests with user context
interface UserContext {
  userId: string;
  merchantId: string;
  userRole: string;
  isApproved: boolean;
}

// Hook to get current user context for API calls
export const useAuthContext = () => {
  const { userData } = useAuth();
  
  if (!userData?.auth_user_id || !userData.merchant_id) {
    return null;
  }
  
  return {
    userId: userData.auth_user_id,
    merchantId: userData.merchant_id,
    userRole: userData.role,
    isApproved: userData.approved
  };
};

// Generic API request function with user context
const apiRequest = async (
  endpoint: string, 
  userContext: UserContext, 
  options: RequestInit = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN}`,
    'X-User-ID': userContext.userId,
    'X-Merchant-ID': userContext.merchantId,
    'X-User-Role': userContext.userRole,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};

// Dashboard Data Services
export const dashboardService = {
  // Get user-specific dashboard stats
  getStats: async (userContext: UserContext) => {
    return apiRequest('/dashboard/stats', userContext);
  },

  // Get user-specific transactions
  getTransactions: async (userContext: UserContext, limit = 10) => {
    return apiRequest(`/transactions?limit=${limit}`, userContext);
  },

  // Get user-specific portfolio data
  getPortfolio: async (userContext: UserContext) => {
    return apiRequest('/portfolio', userContext);
  },

  // Get user-specific terminals
  getTerminals: async (userContext: UserContext) => {
    return apiRequest('/terminals', userContext);
  },

  // Get user-specific staff members
  getStaff: async (userContext: UserContext) => {
    return apiRequest('/staff', userContext);
  },

  // Get user-specific automations
  getAutomations: async (userContext: UserContext) => {
    return apiRequest('/automations', userContext);
  },

  // Get user-specific analytics
  getAnalytics: async (userContext: UserContext, timeframe = '30d') => {
    return apiRequest(`/analytics?timeframe=${timeframe}`, userContext);
  }
};

// Transaction Services
export const transactionService = {
  // Create new transaction for user's merchant
  create: async (userContext: UserContext, transactionData: any) => {
    return apiRequest('/transactions', userContext, {
      method: 'POST',
      body: JSON.stringify(sanitizePayload(transactionData))
    });
  },

  // Get transaction details
  getById: async (userContext: UserContext, transactionId: string) => {
    return apiRequest(`/transactions/${sanitizeString(transactionId)}`, userContext);
  },

  // Update transaction
  update: async (userContext: UserContext, transactionId: string, updateData: any) => {
    return apiRequest(`/transactions/${sanitizeString(transactionId)}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(sanitizePayload(updateData))
    });
  }
};

// Staff Services
export const staffService = {
  // Create new staff member for user's merchant
  create: async (userContext: UserContext, staffData: any) => {
    return apiRequest('/staff', userContext, {
      method: 'POST',
      body: JSON.stringify(sanitizePayload(staffData))
    });
  },

  // Update staff member
  update: async (userContext: UserContext, staffId: string, updateData: any) => {
    return apiRequest(`/staff/${sanitizeString(staffId)}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(sanitizePayload(updateData))
    });
  },

  // Assign PIN to staff member
  assignPin: async (userContext: UserContext, staffId: string, pin: string) => {
    return apiRequest(`/staff/${sanitizeString(staffId)}/pin`, userContext, {
      method: 'POST',
      body: JSON.stringify({ pin: sanitizeString(pin) })
    });
  }
};

// Terminal Services
export const terminalService = {
  // Get terminal details
  getById: async (userContext: UserContext, terminalId: string) => {
    return apiRequest(`/terminals/${sanitizeString(terminalId)}`, userContext);
  },

  // Update terminal settings
  update: async (userContext: UserContext, terminalId: string, updateData: any) => {
    return apiRequest(`/terminals/${sanitizeString(terminalId)}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(sanitizePayload(updateData))
    });
  }
};

// Automation Services
export const automationService = {
  // Create new automation rule
  create: async (userContext: UserContext, automationData: any) => {
    return apiRequest('/automations', userContext, {
      method: 'POST',
      body: JSON.stringify(sanitizePayload(automationData))
    });
  },

  // Update automation rule
  update: async (userContext: UserContext, automationId: string, updateData: any) => {
    return apiRequest(`/automations/${sanitizeString(automationId)}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(sanitizePayload(updateData))
    });
  },

  // Delete automation rule
  delete: async (userContext: UserContext, automationId: string) => {
    return apiRequest(`/automations/${sanitizeString(automationId)}`, userContext, {
      method: 'DELETE'
    });
  }
};

// React hooks for data fetching with user context
export const useAuthData = () => {
  const userContext = useAuthContext();
  
  return {
    userContext,
    isReady: !!userContext,
    dashboardService,
    transactionService,
    staffService,
    terminalService,
    automationService
  };
};
