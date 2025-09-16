import { supabase } from '../lib/supabase';
import { invoiceApi, InvoiceApiPayload } from './invoiceApi';

export interface StandaloneInvoiceData {
  title?: string;
  description?: string;
  notes?: string;
  customer_email: string;
  customer_name?: string;
  customer_cc_emails?: string[];
  billing_address?: any;
  is_simple_amount: boolean;
  simple_amount?: number;
  line_items?: any[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency_mode: 'crypto';
  crypto_currency: string;
  crypto_chain: string;
  price_lock_secs?: number;
  min_confirmations?: number;
  allow_partial?: boolean;
  tip_suggestions?: number[];
  tax_inclusive?: boolean;
  fee_payer?: string;
  settlement_wallet_id?: string;
  due_date?: string;
  tags?: string[];
  webhook_url?: string;
  notification_email?: string;
  send_email?: boolean;
  status: 'draft' | 'sent';
}

class InvoiceService {
  /**
   * Save draft - Direct database save for speed
   * No payment infrastructure needed for drafts
   */
  async saveDraft(invoiceData: StandaloneInvoiceData, merchantId: string, userId: string) {
    try {
      console.log('Saving draft to database...', { merchantId, userId });
      
      // Generate unique identifiers with timestamp and random suffix to avoid conflicts
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp}-${randomSuffix}`;
      const publicId = `draft-${timestamp}-${randomSuffix}`;
      
      // Prepare data for database insert - only include valid fields
      const insertData = {
        merchant_id: merchantId,
        created_by: userId,
        status: 'draft',
        invoice_number: invoiceNumber,
        public_id: publicId,
        
        // Basic info
        title: invoiceData.title || 'Draft Invoice',
        description: invoiceData.description || '',
        notes: invoiceData.notes || '',
        
        // Customer info
        customer_email: invoiceData.customer_email || '',
        customer_name: invoiceData.customer_name || '',
        customer_cc_emails: invoiceData.customer_cc_emails || [],
        billing_address: invoiceData.billing_address || {},
        
        // Amount structure
        is_simple_amount: invoiceData.is_simple_amount !== undefined ? invoiceData.is_simple_amount : true,
        simple_amount: invoiceData.simple_amount || 0,
        line_items: invoiceData.line_items || [],
        
        // Amount calculations - use actual calculated values
        subtotal: invoiceData.subtotal || 0,
        tax_amount: invoiceData.tax_amount || 0,
        discount_amount: invoiceData.discount_amount || 0,
        total_amount: invoiceData.total_amount || 0,
        
        // Payment configuration
        currency_mode: invoiceData.currency_mode || 'crypto',
        crypto_currency: invoiceData.crypto_currency || 'USDC',
        crypto_chain: invoiceData.crypto_chain || 'BASE',
        price_lock_secs: invoiceData.price_lock_secs || 900,
        min_confirmations: invoiceData.min_confirmations || 1,
        allow_partial: invoiceData.allow_partial || false,
        tip_suggestions: invoiceData.tip_suggestions || [0, 10, 15],
        tax_inclusive: invoiceData.tax_inclusive || false,
        fee_payer: invoiceData.fee_payer || 'merchant',
        
        // Optional fields
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toISOString() : null,
        tags: invoiceData.tags || [],
        webhook_url: invoiceData.webhook_url || '',
        notification_email: invoiceData.notification_email || '',
        send_email: invoiceData.send_email || false,
        
        // Set to null for drafts to avoid foreign key issues
        settlement_wallet_id: null,
        restricted_jurisdictions: false
      };
      
      console.log('Saving draft with data:', insertData);
      console.log('Amount fields being saved:', {
        simple_amount: insertData.simple_amount,
        total_amount: insertData.total_amount,
        subtotal: insertData.subtotal,
        tax_amount: insertData.tax_amount,
        is_simple_amount: insertData.is_simple_amount
      });
      
      const { data: savedInvoice, error } = await supabase
        .from('standalone_invoices')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      
      console.log('Draft saved successfully:', savedInvoice);
      console.log('Saved amounts:', {
        simple_amount: savedInvoice.simple_amount,
        total_amount: savedInvoice.total_amount,
        subtotal: savedInvoice.subtotal,
        tax_amount: savedInvoice.tax_amount
      });
      return savedInvoice;
    } catch (error: any) {
      console.error('Error saving draft:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
  }

  /**
   * Send invoice - Use API for payment infrastructure
   * Creates payment address, QR codes, notifications
   */
  async sendInvoice(invoiceData: StandaloneInvoiceData) {
    try {
      // Convert to API payload format
      const apiPayload: InvoiceApiPayload = {
        ...invoiceData,
        status: 'sent'
      };

      // Use API to create sent invoice with payment infrastructure
      const result = await invoiceApi.createInvoice(apiPayload);
      
      console.log('Invoice sent via API:', result);
      return result;
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  /**
   * Update existing draft to sent status
   */
  async sendExistingDraft(draftId: string) {
    try {
      // Get draft from database
      const { data: draft, error: fetchError } = await supabase
        .from('standalone_invoices')
        .select('*')
        .eq('id', draftId)
        .single();

      if (fetchError) throw fetchError;

      // Send via API to create payment infrastructure
      const apiPayload: InvoiceApiPayload = {
        title: draft.title,
        description: draft.description,
        notes: draft.notes,
        customer_email: draft.customer_email,
        customer_name: draft.customer_name,
        customer_cc_emails: draft.customer_cc_emails,
        billing_address: draft.billing_address,
        is_simple_amount: draft.is_simple_amount,
        simple_amount: draft.simple_amount,
        line_items: draft.line_items,
        subtotal: draft.subtotal,
        tax_amount: draft.tax_amount,
        discount_amount: draft.discount_amount,
        total_amount: draft.total_amount,
        currency_mode: draft.currency_mode,
        crypto_currency: draft.crypto_currency,
        crypto_chain: draft.crypto_chain,
        price_lock_secs: draft.price_lock_secs,
        min_confirmations: draft.min_confirmations,
        allow_partial: draft.allow_partial,
        tip_suggestions: draft.tip_suggestions,
        tax_inclusive: draft.tax_inclusive,
        fee_payer: draft.fee_payer,
        settlement_wallet_id: draft.settlement_wallet_id,
        due_date: draft.due_date,
        tags: draft.tags,
        webhook_url: draft.webhook_url,
        notification_email: draft.notification_email,
        send_email: draft.send_email,
        status: 'sent'
      };

      const result = await invoiceApi.createInvoice(apiPayload);

      // Delete draft from database (now managed by API)
      await supabase
        .from('standalone_invoices')
        .delete()
        .eq('id', draftId);

      return result;
    } catch (error) {
      console.error('Error sending existing draft:', error);
      throw error;
    }
  }

  /**
   * List draft invoices from database
   */
  async listDrafts(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('standalone_invoices')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing drafts:', error);
      throw error;
    }
  }

  /**
   * List sent invoices via API
   */
  async listSentInvoices() {
    try {
      return await invoiceApi.listInvoices({ status: 'sent' });
    } catch (error) {
      console.error('Error listing sent invoices:', error);
      throw error;
    }
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}-${timestamp}`;
  }

  private generatePublicId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get verified wallets for merchant
   */
  async getVerifiedWallets(merchantId: string) {
    try {
      // This would typically call an API to get verified wallets
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('Error getting verified wallets:', error);
      return [];
    }
  }
}

export const invoiceService = new InvoiceService();
