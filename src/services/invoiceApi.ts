import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://okurutest.up.railway.app';

export interface InvoiceApiPayload {
  title?: string;
  description?: string;
  is_simple_amount: boolean;
  simple_amount?: number;
  line_items?: any[];
  currency_mode: 'crypto';
  crypto_asset: string;
  chain: 'BASE';
  customer_email: string;
  customer_name?: string;
  customer_cc_emails?: string[];
  billing_address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  settlement_wallet_id: string;
  fee_payer: string;
  price_lock_secs?: number;
  min_confirmations?: number;
  allow_partial?: boolean;
  terms_conditions?: string;
  refund_policy?: string;
  due_date?: string;
  notes?: string;
  tags?: string[];
  webhook_url?: string;
  notification_email?: string;
  send_email?: boolean;
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
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
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
  notes?: string;
  tags?: string[];
  webhook_url?: string;
  notification_email?: string;
  send_email?: boolean;
  payment_address?: string;
  qr_code_data?: string;
  blockchain_tx_hash?: string;
  confirmation_count?: number;
  settlement_status?: string;
  settlement_tx_hash?: string;
  gas_fee_paid?: number;
  net_amount?: number;
  created_at: string;
  updated_at: string;
  public_url?: string;
  // Legacy fields for compatibility
  fiat_currency?: string;
  amount_fiat?: number;
}

class InvoiceApiService {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async createInvoice(payload: InvoiceApiPayload): Promise<Invoice> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.search) searchParams.append('search', params.search);

    const response = await fetch(`${API_BASE_URL}/dashboard-invoices?${searchParams}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getInvoice(id: string): Promise<Invoice> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${id}`, {
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
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteInvoice(id: string): Promise<void> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${id}`, {
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
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${id}/generate-payment-address`, {
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
    
    const response = await fetch(`${API_BASE_URL}/dashboard-invoices/${id}/qr-code`, {
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
    const response = await fetch(`${API_BASE_URL}/pay/${publicId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const invoiceApi = new InvoiceApiService();
