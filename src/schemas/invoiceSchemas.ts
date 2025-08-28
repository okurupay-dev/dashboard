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
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required')
});

export const invoiceFormSchema = z.object({
  // Details tab
  title: z.string().optional(),
  description: z.string().optional(),
  is_simple_amount: z.boolean(),
  simple_amount: z.number().min(0).optional(),
  line_items: z.array(lineItemSchema).optional(),
  
  // Payment tab - Base network stablecoins only
  currency_mode: z.enum(['crypto']),
  crypto_asset: z.enum(['USDC', 'USDT', 'DAI', 'USDbC']),
  chain: z.enum(['BASE']),
  price_lock_secs: z.number().min(60).max(3600).optional().default(900),
  min_confirmations: z.number().min(1).max(12).optional().default(1),
  allow_partial: z.boolean().optional().default(false),
  tip_suggestions: z.array(z.number().min(0).max(100)).optional().default([0, 10, 15]),
  tax_inclusive: z.boolean().optional().default(false),
  invoice_discount: z.object({
    type: z.enum(['flat', 'percentage']),
    value: z.number().min(0)
  }).optional(),
  
  // Customer tab
  customer_email: z.string().email('Valid email is required'),
  customer_name: z.string().optional(),
  customer_cc_emails: z.string().optional(), // Comma-separated string
  billing_address: billingAddressSchema.optional(),
  
  // Settlement tab
  settlement_wallet_id: z.string().min(1, 'Settlement wallet is required'),
  fee_payer: z.enum(['merchant', 'customer', 'split']).optional().default('merchant'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string
  
  // Notifications
  webhook_url: z.string().url().optional().or(z.literal('')),
  notification_email: z.string().email().optional().or(z.literal('')),
  send_email: z.boolean().optional().default(true),
  
  // Policy tab
  terms_url: z.string().url().optional().or(z.literal('')),
  refund_policy_url: z.string().url().optional().or(z.literal('')),
  restricted_jurisdictions: z.boolean().optional().default(false),
  kyc_threshold: z.number().min(0).optional()
}).refine((data) => {
  // Validate crypto payment details (Base network only)
  return data.crypto_asset && data.chain && data.simple_amount !== undefined;
}, {
  message: 'Crypto payment details are required',
  path: ['currency_mode']
}).refine((data) => {
  // Validate amount or line items
  if (data.is_simple_amount) {
    return data.simple_amount !== undefined && data.simple_amount > 0;
  } else {
    return data.line_items && data.line_items.length > 0;
  }
}, {
  message: 'Either simple amount or line items are required',
  path: ['is_simple_amount']
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
