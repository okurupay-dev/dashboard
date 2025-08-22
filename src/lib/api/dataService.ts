import { useUser } from '@clerk/clerk-react';
import { useUserMetadata } from '../clerk/sessionUtils';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.okurupay.com';

// Interface for API requests with user context
interface UserContext {
  userId: string;
  merchantId: string;
  role: string;
}

// Hook to get current user context for API calls
export const useUserContext = () => {
  const { user } = useUser();
  const { metadata } = useUserMetadata();
  
  if (!user || !metadata.merchantId) {
    return null;
  }
  
  return {
    userId: user.id,
    merchantId: metadata.merchantId,
    role: metadata.role
  } as UserContext;
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
    'X-User-Role': userContext.role,
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
      body: JSON.stringify(transactionData)
    });
  },

  // Get transaction details
  getById: async (userContext: UserContext, transactionId: string) => {
    return apiRequest(`/transactions/${transactionId}`, userContext);
  },

  // Update transaction
  update: async (userContext: UserContext, transactionId: string, updateData: any) => {
    return apiRequest(`/transactions/${transactionId}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }
};

// Staff Services
export const staffService = {
  // Create new staff member for user's merchant
  create: async (userContext: UserContext, staffData: any) => {
    return apiRequest('/staff', userContext, {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  },

  // Update staff member
  update: async (userContext: UserContext, staffId: string, updateData: any) => {
    return apiRequest(`/staff/${staffId}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Assign PIN to staff member
  assignPin: async (userContext: UserContext, staffId: string, pin: string) => {
    return apiRequest(`/staff/${staffId}/pin`, userContext, {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }
};

// Terminal Services
export const terminalService = {
  // Get terminal details
  getById: async (userContext: UserContext, terminalId: string) => {
    return apiRequest(`/terminals/${terminalId}`, userContext);
  },

  // Update terminal settings
  update: async (userContext: UserContext, terminalId: string, updateData: any) => {
    return apiRequest(`/terminals/${terminalId}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }
};

// Automation Services
export const automationService = {
  // Create new automation rule
  create: async (userContext: UserContext, automationData: any) => {
    return apiRequest('/automations', userContext, {
      method: 'POST',
      body: JSON.stringify(automationData)
    });
  },

  // Update automation rule
  update: async (userContext: UserContext, automationId: string, updateData: any) => {
    return apiRequest(`/automations/${automationId}`, userContext, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Delete automation rule
  delete: async (userContext: UserContext, automationId: string) => {
    return apiRequest(`/automations/${automationId}`, userContext, {
      method: 'DELETE'
    });
  }
};

// React hooks for data fetching with user context
export const useUserData = () => {
  const userContext = useUserContext();
  
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
