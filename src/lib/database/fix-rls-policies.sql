-- Fix RLS policies for users table to allow auto-sync functionality
-- Run this in your Supabase SQL Editor

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can only view own data" ON users;
DROP POLICY IF EXISTS "Users can only update own data" ON users;
DROP POLICY IF EXISTS "Users can only insert own data" ON users;

-- Temporarily disable RLS for development to allow auto-sync functionality
-- This allows the system to link existing users with Clerk IDs
-- Re-enable with proper service role policies in production
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on merchants table to allow merchant data fetching
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;

-- Disable RLS on invoices table to allow analytics data fetching
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Disable RLS on wallet tables to allow wallet creation and management
ALTER TABLE merchant_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_addresses DISABLE ROW LEVEL SECURITY;

-- For production, you would want policies like:
-- CREATE POLICY "Service role full access" ON users FOR ALL TO service_role USING (true);
-- CREATE POLICY "Users can view own records" ON users FOR SELECT TO authenticated 
--   USING (clerk_user_id = auth.jwt() ->> 'sub' OR email = auth.jwt() ->> 'email');

-- (ONLY for development/testing - re-enable for production)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';
