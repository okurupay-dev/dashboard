-- Standalone Invoices Table for One-Time Invoices
-- This is separate from the terminal-based invoices table

CREATE TABLE public.standalone_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number character varying NOT NULL UNIQUE, -- OKU-2025-000123
  public_id character varying NOT NULL UNIQUE, -- okuru_7FQ2K
  merchant_id uuid NOT NULL,
  created_by uuid NOT NULL, -- staff member who created it
  
  -- Invoice Details
  title character varying,
  description text,
  notes text,
  
  -- Customer Information
  customer_email character varying NOT NULL,
  customer_name character varying,
  customer_cc_emails text[], -- additional emails to CC
  billing_address jsonb, -- full address object
  
  -- Amount Configuration
  is_simple_amount boolean NOT NULL DEFAULT true,
  simple_amount numeric(15,8), -- for simple amount mode
  line_items jsonb, -- array of line items for detailed mode
  
  -- Calculated Totals
  subtotal numeric(15,8) NOT NULL DEFAULT 0,
  tax_amount numeric(15,8) NOT NULL DEFAULT 0,
  discount_amount numeric(15,8) NOT NULL DEFAULT 0,
  total_amount numeric(15,8) NOT NULL DEFAULT 0,
  
  -- Payment Configuration
  currency_mode character varying NOT NULL CHECK (currency_mode IN ('fiat', 'crypto')),
  fiat_currency character varying, -- USD, EUR, JPY, THB
  crypto_currency character varying, -- USDC, USDT, ETH, BTC, SOL, ADA
  crypto_chain character varying, -- BASE, ETHEREUM, SOLANA, CARDANO, APTOS, AVALANCHE
  
  -- Payment Settings
  price_lock_secs integer NOT NULL DEFAULT 900, -- 15 minutes
  min_confirmations integer NOT NULL DEFAULT 1,
  allow_partial boolean NOT NULL DEFAULT false,
  tip_suggestions integer[] DEFAULT ARRAY[0, 10, 15], -- percentage tips
  tax_inclusive boolean NOT NULL DEFAULT false,
  
  -- Settlement
  settlement_wallet_id uuid, -- which wallet to settle to
  fee_payer character varying NOT NULL DEFAULT 'merchant' CHECK (fee_payer IN ('merchant', 'customer')),
  
  -- Policy & Restrictions
  terms_conditions text,
  refund_policy text,
  restricted_jurisdictions boolean NOT NULL DEFAULT false,
  kyc_threshold numeric(15,8),
  
  -- Status & Lifecycle
  status character varying NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 
    'overpaid', 'expired', 'cancelled', 'refunded', 'disputed'
  )),
  
  -- Payment Details (populated when paid)
  payment_method character varying, -- 'crypto', 'bank_transfer', etc.
  payment_tx_hash character varying,
  payment_address character varying,
  amount_paid numeric(15,8),
  paid_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  expires_at timestamp with time zone,
  
  -- Constraints
  CONSTRAINT standalone_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT standalone_invoices_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(merchant_id),
  CONSTRAINT standalone_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT standalone_invoices_settlement_wallet_fkey FOREIGN KEY (settlement_wallet_id) REFERENCES public.merchant_wallets(wallet_id)
);

-- Timeline Events Table for Invoice History
CREATE TABLE public.standalone_invoice_timeline (
  event_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL,
  event_type character varying NOT NULL CHECK (event_type IN (
    'created', 'sent', 'viewed', 'payment_initiated', 'payment_confirmed',
    'payment_failed', 'expired', 'cancelled', 'refunded', 'disputed',
    'reminder_sent', 'updated'
  )),
  event_data jsonb, -- additional event-specific data
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid, -- user who triggered the event (null for system events)
  
  CONSTRAINT standalone_invoice_timeline_pkey PRIMARY KEY (event_id),
  CONSTRAINT standalone_invoice_timeline_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.standalone_invoices(id) ON DELETE CASCADE,
  CONSTRAINT standalone_invoice_timeline_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- Indexes for Performance
CREATE INDEX idx_standalone_invoices_merchant_id ON public.standalone_invoices(merchant_id);
CREATE INDEX idx_standalone_invoices_status ON public.standalone_invoices(status);
CREATE INDEX idx_standalone_invoices_customer_email ON public.standalone_invoices(customer_email);
CREATE INDEX idx_standalone_invoices_created_at ON public.standalone_invoices(created_at);
CREATE INDEX idx_standalone_invoices_public_id ON public.standalone_invoices(public_id);
CREATE INDEX idx_standalone_invoice_timeline_invoice_id ON public.standalone_invoice_timeline(invoice_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_standalone_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER standalone_invoices_updated_at
  BEFORE UPDATE ON public.standalone_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_invoices_updated_at();
