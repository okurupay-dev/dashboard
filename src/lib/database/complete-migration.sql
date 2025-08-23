-- Complete Clerk to Supabase Auth Migration
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

-- STEP 4: Enable RLS on all tables
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

-- STEP 5: Create new role-based RLS policies using Supabase Auth

-- Transactions - Role-based access
CREATE POLICY "Admins can view all merchant transactions" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = transactions.merchant_id
    AND role IN ('admin', 'merchant')
    AND approved = true
  )
);

CREATE POLICY "Staff can view permitted transactions" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u
    LEFT JOIN public.staff_permissions sp ON u.merchant_id = sp.merchant_id AND sp.role_name = u.role
    WHERE u.auth_user_id = auth.uid()
    AND u.merchant_id = transactions.merchant_id
    AND u.role = 'staff'
    AND u.approved = true
    AND (sp.permissions->>'view_transactions' = 'true' OR sp.permissions IS NULL)
  )
);

-- Terminals - Role-based access
CREATE POLICY "Users can view merchant terminals" ON public.terminals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = terminals.merchant_id
    AND approved = true
  )
);

-- Locations - Role-based access
CREATE POLICY "Users can view merchant locations" ON public.locations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = locations.merchant_id
    AND approved = true
  )
);

-- Merchant Wallets - Role-based access
CREATE POLICY "Users can view merchant wallets" ON public.merchant_wallets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = merchant_wallets.merchant_id
    AND approved = true
  )
);

-- Wallet Addresses - Role-based access
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

-- Merchants - Role-based access
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

-- Users - Role-based access
CREATE POLICY "Users can view users in their merchant" ON public.users
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND approved = true
  )
);

-- User Preferences - Personal access
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Merchant Documents - Role-based access
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

-- Staff Permissions - Admin access only
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

-- Virtual Terminal Passwords - Admin access only
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

-- Migration complete!
