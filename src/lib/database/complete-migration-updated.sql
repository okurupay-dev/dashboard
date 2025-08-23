-- Complete Clerk to Supabase Auth Migration - UPDATED WITH ALL TABLES
-- Run this script in order to safely migrate from Clerk to Supabase Auth

-- STEP 1: Drop all existing RLS policies that depend on clerk_user_id
DROP POLICY IF EXISTS "users_merchant_staff_delete" ON public.users;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their merchant's documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Okuru admins can delete documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Users can view staff permissions in their merchant" ON public.staff_permissions;
DROP POLICY IF EXISTS "Admins can manage staff permissions in their merchant" ON public.staff_permissions;

-- Drop any transaction-related policies
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;
DROP POLICY IF EXISTS "Users can view terminals for their merchant" ON public.terminals;
DROP POLICY IF EXISTS "Users can view locations for their merchant" ON public.locations;
DROP POLICY IF EXISTS "Users can view merchant wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "Users can view wallet addresses" ON public.wallet_addresses;
DROP POLICY IF EXISTS "Users can view their merchant" ON public.merchants;
DROP POLICY IF EXISTS "Users can view users in their merchant" ON public.users;
DROP POLICY IF EXISTS "Users can update their merchant" ON public.merchants;
DROP POLICY IF EXISTS "Users can manage virtual terminal passwords" ON public.virtual_terminal_passwords;

-- STEP 2: Drop the clerk_user_id column
ALTER TABLE public.users DROP COLUMN clerk_user_id;

-- STEP 3: Add auth_user_id column for Supabase Auth
ALTER TABLE public.users ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) UNIQUE;

-- STEP 4: Enable RLS on ALL tables that contain merchant data
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

-- Additional tables that need RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_chain_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okuru_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okuru_fee_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okuru_merchant_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tx_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_terminal_settings_audit ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create comprehensive role-based RLS policies

-- Core merchant data tables
CREATE POLICY "Users can view their merchant transactions" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = transactions.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Users can view their merchant terminals" ON public.terminals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminals.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Users can view their merchant locations" ON public.locations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = locations.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Users can view their merchant wallets" ON public.merchant_wallets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_wallets.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Users can view wallet addresses" ON public.wallet_addresses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.merchant_wallets mw
    JOIN public.users u ON mw.merchant_id = u.merchant_id
    WHERE u.auth_user_id = auth.uid()
    AND mw.wallet_id = wallet_addresses.wallet_id
    AND u.approved = true
  )
);

CREATE POLICY "Users can view their merchant" ON public.merchants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchants.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can update their merchant" ON public.merchants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchants.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

CREATE POLICY "Users can view users in their merchant" ON public.users
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND approved = true
  )
);

-- Automations
CREATE POLICY "Users can view their merchant automations" ON public.automations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = automations.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage automations" ON public.automations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = automations.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

CREATE POLICY "Users can view automation executions" ON public.automation_executions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.automations a
    JOIN public.users u ON a.merchant_id = u.merchant_id
    WHERE u.auth_user_id = auth.uid()
    AND a.automation_id = automation_executions.automation_id
    AND u.approved = true
  )
);

-- Invoices
CREATE POLICY "Users can view their merchant invoices" ON public.invoices
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = invoices.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage invoices" ON public.invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = invoices.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Merchant chain addresses
CREATE POLICY "Users can view merchant chain addresses" ON public.merchant_chain_addresses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_chain_addresses.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage chain addresses" ON public.merchant_chain_addresses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_chain_addresses.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Okuru alerts
CREATE POLICY "Users can view their merchant alerts" ON public.okuru_alerts
FOR SELECT USING (
  merchant_id IS NULL OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = okuru_alerts.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Users can acknowledge alerts" ON public.okuru_alerts
FOR UPDATE USING (
  merchant_id IS NULL OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = okuru_alerts.merchant_id
    AND approved = true
  )
);

-- Okuru fee collections
CREATE POLICY "Users can view their fee collections" ON public.okuru_fee_collections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = okuru_fee_collections.merchant_id
    AND approved = true
  )
);

-- Okuru merchant analytics
CREATE POLICY "Users can view their merchant analytics" ON public.okuru_merchant_analytics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = okuru_merchant_analytics.merchant_id
    AND approved = true
  )
);

-- Pending users (invitation system)
CREATE POLICY "Admins can manage pending users" ON public.pending_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = pending_users.merchant_id_uuid
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Terminal audit log
CREATE POLICY "Users can view terminal audit logs" ON public.terminal_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminal_audit_log.merchant_id
    AND approved = true
  )
);

-- Terminal permissions
CREATE POLICY "Users can view terminal permissions" ON public.terminal_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminal_permissions.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage terminal permissions" ON public.terminal_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminal_permissions.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Terminal sessions
CREATE POLICY "Users can view terminal sessions" ON public.terminal_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminal_sessions.merchant_id
    AND approved = true
  )
);

-- Terminal transaction events
CREATE POLICY "Users can view terminal transaction events" ON public.terminal_transaction_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminal_transaction_events.merchant_id
    AND approved = true
  )
);

-- TX events (linked to invoices)
CREATE POLICY "Users can view tx events" ON public.tx_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.users u ON i.merchant_id = u.merchant_id
    WHERE u.auth_user_id = auth.uid()
    AND i.id = tx_events.invoice_id
    AND u.approved = true
  )
);

-- User preferences (personal data)
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Merchant documents
CREATE POLICY "Users can view merchant documents" ON public.merchant_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_documents.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage merchant documents" ON public.merchant_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_documents.merchant_id
    AND role IN ('admin', 'merchant', 'okuru_admin')
    AND approved = true
  )
);

-- Staff permissions
CREATE POLICY "Users can view staff permissions" ON public.staff_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = staff_permissions.merchant_id
    AND approved = true
  )
);

CREATE POLICY "Admins can manage staff permissions" ON public.staff_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = staff_permissions.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Virtual terminal passwords
CREATE POLICY "Admins can manage virtual terminal passwords" ON public.virtual_terminal_passwords
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = virtual_terminal_passwords.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

-- Virtual terminal settings audit
CREATE POLICY "Users can view virtual terminal audit" ON public.virtual_terminal_settings_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = virtual_terminal_settings_audit.merchant_id
    AND approved = true
  )
);

-- Migration complete! All 25+ tables now have proper RLS policies.
