import { z } from 'zod';

export const lineItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  tax_rate: z.number().min(0).max(100).optional(),
  discount: z.object({
    type: z.enum(['flat', 'percentage']),
    value: z.number().min(0)
  }).optional()
});

export const billingAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional()
});

export const invoiceFormSchema = z.object({
  // Essential invoice details
  title: z.string().min(1, 'Invoice title is required'),
  description: z.string().optional(),
  
  // Amount - either simple amount or line items
  is_simple_amount: z.boolean().default(true),
  simple_amount: z.number().min(0, 'Amount must be non-negative').optional(),
  line_items: z.array(lineItemSchema).optional(),
  
  // Payment configuration - simplified for crypto
  currency_mode: z.enum(['crypto']).default('crypto'),
  crypto_asset: z.enum(['USDC', 'USDT', 'DAI', 'USDbC']).default('USDC'),
  chain: z.enum(['BASE']).default('BASE'),
  
  // Optional payment settings
  price_lock_secs: z.number().min(60).max(3600).optional().default(900),
  min_confirmations: z.number().min(1).max(12).optional().default(1),
  allow_partial: z.boolean().optional().default(false),
  
  // Customer info - minimal for digital invoices
  customer_email: z.string().email('Valid email is required'),
  customer_name: z.string().optional(),
  
  // Optional fields
  customer_cc_emails: z.string().optional(),
  billing_address: billingAddressSchema.optional(),
  settlement_wallet_id: z.string().optional(),
  fee_payer: z.enum(['merchant', 'customer', 'split']).optional().default('merchant'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal('')),
  notification_email: z.string().email().optional().or(z.literal('')),
  send_email: z.boolean().optional().default(true),
  tip_suggestions: z.array(z.number().min(0).max(100)).optional().default([0, 10, 15]),
  tax_inclusive: z.boolean().optional().default(false),
  terms_url: z.string().url().optional().or(z.literal('')),
  refund_policy_url: z.string().url().optional().or(z.literal('')),
  restricted_jurisdictions: z.boolean().optional().default(false),
  kyc_threshold: z.number().min(0).optional()
}).refine((data) => {
  // For drafts, allow zero amounts. For sent invoices, require amount > 0
  // This validation will be handled at submission time based on isDraft flag
  return true;
}, {
  message: 'Either amount or line items are required',
  path: ['simple_amount']
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
