import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://okurutest.up.railway.app';

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

export interface InvoiceApiPayload {
  // Basic invoice info
  title?: string;
  description?: string;
  notes?: string;
  
  // Merchant context
  merchant_id?: string;
  created_by?: string;
  
  // Customer details
  customer_email: string;
  customer_name?: string;
  customer_cc_emails?: string[];
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Amount structure
  is_simple_amount: boolean;
  simple_amount?: number;
  line_items?: any[];
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  
  // Crypto payment settings
  currency_mode: 'crypto';
  crypto_asset: string;     // Backend expects crypto_asset
  chain: string;            // Backend expects chain
  price_lock_secs?: number;
  min_confirmations?: number;
  allow_partial?: boolean;
  
  // Payment preferences
  tip_suggestions?: number[];
  tax_inclusive?: boolean;
  fee_payer?: string;
  
  // Settlement
  settlement_wallet_id?: string;
  
  // Timing
  due_date?: string;
  expires_at?: string;
  
  // Metadata
  tags?: string[];
  webhook_url?: string;
  notification_email?: string;
  send_email?: boolean;
  
  // Blockchain integration (new fields from your schema)
  payment_address?: string;
  qr_code_data?: string;
  blockchain_tx_hash?: string;
  confirmation_count?: number;
  
  // Settlement & processing (new fields from your schema)
  settlement_status?: 'pending' | 'processing' | 'completed';
  settlement_tx_hash?: string;
  gas_fee_paid?: number;
  net_amount?: number;
  
  // Status
  status: 'draft' | 'sent';
}

export interface Invoice {
  id: string;
  invoice_number: string;
  public_id: string;
  status: string;
  title?: string;
  description?: string;
  customer_email: string;
  customer_name?: string;
  customer_cc_emails?: string[];
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  crypto_asset: string;
  chain: string;
  amount_crypto?: number;
  simple_amount?: number;
  currency_mode: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  price_lock_secs?: number;
  min_confirmations?: number;
  allow_partial?: boolean;
  expires_at?: string;
  due_date?: string;
  qr_code_data?: string;
  blockchain_tx_hash?: string;
  confirmation_count?: number;
  settlement_status?: string;
  settlement_tx_hash?: string;
  gas_fee_paid?: number;
  net_amount?: number;
  settlement_wallet_id?: string;
  fee_payer?: string;
  is_simple_amount?: boolean;
  line_items?: Array<{
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }>;
  created_at: string;
  updated_at: string;
  public_url?: string;
  // Legacy fields for compatibility
  fiat_currency?: string;
  notes?: string;
}

class InvoiceApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth token status:', session ? 'Found' : 'Missing');
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async createInvoice(payload: InvoiceApiPayload): Promise<Invoice> {
    const token = await this.getAuthToken();
    
    // Sanitize payload to prevent UTF-8 encoding issues
    const sanitizedPayload = sanitizePayload(payload);
    
    console.log('📤 Sending invoice payload:', JSON.stringify(sanitizedPayload, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(sanitizedPayload)
    });

    if (!response.ok) {
      // Clone the response to avoid "body stream already read" error
      const responseClone = response.clone();
      
      try {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      } catch (e) {
        // If we can't parse the JSON, use the cloned response for text
        try {
          const errorText = await responseClone.text();
          console.error('API Error Response (text):', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        } catch (textError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    }

    return response.json();
  }

  async listInvoices(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Invoice[]> {
    const token = await this.getAuthToken();
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.append('status', sanitizeString(params.status));
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.search) searchParams.append('search', sanitizeString(params.search));

    const response = await fetch(`${API_BASE_URL}/dashboard-invoices?${searchParams}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  }

  async getInvoice(id: string): Promise<Invoice> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${sanitizeString(id)}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${sanitizeString(id)}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ status: sanitizeString(status) })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteInvoice(id: string): Promise<void> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${sanitizeString(id)}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async generatePaymentAddress(id: string): Promise<{ payment_address: string }> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${sanitizeString(id)}/generate-payment-address`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getQRCode(id: string): Promise<{ qr_code_data: string }> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${sanitizeString(id)}/qr-code`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getPublicInvoice(publicId: string): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/pay/${sanitizeString(publicId)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const invoiceApi = new InvoiceApiService();
