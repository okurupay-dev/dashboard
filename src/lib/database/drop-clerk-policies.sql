-- Drop all existing RLS policies that depend on clerk_user_id
-- This must be run BEFORE dropping the clerk_user_id column

-- Drop policies on users table
DROP POLICY IF EXISTS "users_merchant_staff_delete" ON public.users;

-- Drop policies on user_preferences table
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

-- Drop policies on merchant_documents table
DROP POLICY IF EXISTS "Users can view their merchant's documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.merchant_documents;
DROP POLICY IF EXISTS "Okuru admins can delete documents" ON public.merchant_documents;

-- Drop policies on staff_permissions table
DROP POLICY IF EXISTS "Users can view staff permissions in their merchant" ON public.staff_permissions;
DROP POLICY IF EXISTS "Admins can manage staff permissions in their merchant" ON public.staff_permissions;

-- Drop any other policies that might reference clerk_user_id
-- Check for additional policies
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;
DROP POLICY IF EXISTS "Users can view terminals for their merchant" ON public.terminals;
DROP POLICY IF EXISTS "Users can view locations for their merchant" ON public.locations;
DROP POLICY IF EXISTS "Users can view merchant wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "Users can view wallet addresses" ON public.wallet_addresses;
DROP POLICY IF EXISTS "Users can view their merchant" ON public.merchants;
DROP POLICY IF EXISTS "Users can view users in their merchant" ON public.users;
DROP POLICY IF EXISTS "Users can update their merchant" ON public.merchants;
DROP POLICY IF EXISTS "Users can manage virtual terminal passwords" ON public.virtual_terminal_passwords;

-- Now safe to drop the column
ALTER TABLE public.users DROP COLUMN clerk_user_id;

-- Add the new auth_user_id column
ALTER TABLE public.users ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) UNIQUE;
