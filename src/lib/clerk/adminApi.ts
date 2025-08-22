// This file would typically be in a backend service
// For demonstration purposes, we're including it in the frontend
// In a real application, these admin functions should be secured behind admin-only API endpoints

interface CreateUserParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  merchantId: string;
  role: 'admin' | 'staff' | 'merchant';
  approved: boolean;
}

interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  metadata: {
    merchantId: string;
    role: string;
    approved: boolean;
  };
  createdAt: string;
}

// Mock function - in a real app this would call Clerk's Admin API
export const createUser = async (params: CreateUserParams): Promise<UserResponse> => {
  // In a real implementation, this would use Clerk's Admin API
  // https://clerk.dev/docs/reference/backend/user/create
  
  console.log('Creating user with params:', params);
  
  // Mock response
  return {
    id: `user_${Math.random().toString(36).substring(2, 11)}`,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    metadata: {
      merchantId: params.merchantId,
      role: params.role,
      approved: params.approved,
    },
    createdAt: new Date().toISOString(),
  };
};

// Mock function to set a temporary password and require reset
export const setTemporaryPassword = async (userId: string, password: string): Promise<void> => {
  // In a real implementation, this would:
  // 1. Use Clerk's Admin API to set the password
  // 2. Mark the password as requiring reset on next login
  
  console.log(`Setting temporary password for user ${userId}`);
};

// Mock function to approve a user
export const approveUser = async (userId: string): Promise<void> => {
  // In a real implementation, this would update the user's metadata via Clerk's Admin API
  
  console.log(`Approving user ${userId}`);
};

// Mock function to get all users for a merchant
export const getMerchantUsers = async (merchantId: string): Promise<UserResponse[]> => {
  // In a real implementation, this would fetch users with matching merchantId metadata
  
  console.log(`Getting users for merchant ${merchantId}`);
  
  // Mock response
  return [
    {
      id: 'user_123',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      metadata: {
        merchantId,
        role: 'admin',
        approved: true,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_456',
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'User',
      metadata: {
        merchantId,
        role: 'staff',
        approved: true,
      },
      createdAt: new Date().toISOString(),
    },
  ];
};
