import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://okurutest.up.railway.app';

export interface StorefrontConfig {
  storefront_id?: string;
  name?: string; // Store name (from storefronts table)
  slug: string;
  description?: string;
  tagline?: string;
  theme: 'light' | 'dark';
  primary_color: string;
  banner_url?: string;
  wallet_id?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
  };
  refund_policy?: string;
  terms?: string;
  selected_products?: string[];
  status?: 'draft' | 'published' | 'unpublished';
  product_count?: number;
  order_count?: number;
  total_revenue?: number;
  merchant_name?: string; // Merchant name (from merchants table, read-only)
  merchant_logo?: string;
  contact_email?: string;
  settlement_address?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface StorefrontOrder {
  order_id: string;
  order_number: string;
  product_id: string;
  product_name?: string;
  customer_email?: string;
  customer_name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  crypto_asset: string;
  chain: string;
  payment_address?: string;
  qr_code_data?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled' | 'expired';
  blockchain_tx_hash?: string;
  confirmation_count?: number;
  confirmed_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface CheckoutRequest {
  product_id: string;
  quantity: number;
  crypto_asset: 'USDC' | 'USDT' | 'DAI';
  customer_email?: string;
  customer_name?: string;
}

/**
 * Get auth token from Supabase session
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token found');
  }
  return session.access_token;
}

export const storefrontService = {
  /**
   * Create a new storefront
   */
  async createStorefront(config: Omit<StorefrontConfig, 'storefront_id'>): Promise<StorefrontConfig> {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/storefronts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create storefront';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('Create storefront error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get merchant's storefront
   */
  async getStorefront(): Promise<StorefrontConfig | null> {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/storefronts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 404) {
      return null; // No storefront exists
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch storefront');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Update storefront
   */
  async updateStorefront(storefrontId: string, config: Partial<StorefrontConfig>): Promise<StorefrontConfig> {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/storefronts/${storefrontId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to update storefront';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('Update storefront error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Publish storefront
   */
  async publishStorefront(storefrontId: string): Promise<void> {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/storefronts/${storefrontId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish storefront');
    }
  },

  /**
   * Unpublish storefront
   */
  async unpublishStorefront(storefrontId: string): Promise<void> {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/storefronts/${storefrontId}/unpublish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unpublish storefront');
    }
  },

  /**
   * Get public storefront (no auth required)
   */
  async getPublicStorefront(slug: string): Promise<StorefrontConfig> {
    const response = await fetch(`${API_BASE_URL}/storefronts/public/${slug}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Storefront not found');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Create order (checkout)
   */
  async checkout(slug: string, checkoutData: CheckoutRequest): Promise<StorefrontOrder> {
    const response = await fetch(`${API_BASE_URL}/storefronts/public/${slug}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Checkout failed');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<StorefrontOrder> {
    const response = await fetch(`${API_BASE_URL}/storefronts/orders/${orderId}/status`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get order status');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get storefront orders (merchant)
   */
  async getOrders(storefrontId: string, params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: StorefrontOrder[]; total: number }> {
    const token = await getAuthToken();
    
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(
      `${API_BASE_URL}/storefronts/${storefrontId}/orders?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch orders');
    }

    const result = await response.json();
    return result.data;
  }
};
