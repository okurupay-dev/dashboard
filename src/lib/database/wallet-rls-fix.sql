-- Quick fix for wallet table RLS issues
-- Run this in Supabase SQL Editor to enable wallet functionality

-- Disable RLS on wallet tables to allow wallet operations
ALTER TABLE merchant_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_addresses DISABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('merchant_wallets', 'wallet_addresses');
