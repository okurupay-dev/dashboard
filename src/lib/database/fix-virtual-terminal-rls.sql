-- Fix RLS policies for virtual_terminal_passwords table
-- This script removes problematic RLS policies and creates new ones that work with Clerk authentication

-- First, drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_delete_policy" ON virtual_terminal_passwords;

-- Create new RLS policies that work with Clerk authentication
-- These policies use get_current_merchant_id() function which should work with your Clerk setup

-- Allow merchants to select their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords
  FOR SELECT USING (merchant_id = get_current_merchant_id());

-- Allow merchants to insert their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords
  FOR INSERT WITH CHECK (merchant_id = get_current_merchant_id());

-- Allow merchants to update their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords
  FOR UPDATE USING (merchant_id = get_current_merchant_id())
  WITH CHECK (merchant_id = get_current_merchant_id());

-- Allow merchants to delete their own virtual terminal passwords (optional)
CREATE POLICY "virtual_terminal_passwords_delete_policy" ON virtual_terminal_passwords
  FOR DELETE USING (merchant_id = get_current_merchant_id());

-- Ensure RLS is enabled on the table
ALTER TABLE virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON virtual_terminal_passwords TO authenticated;

-- Test the policies by checking if get_current_merchant_id() function works
-- This should return your merchant ID if authentication is working properly
SELECT 
  'Testing get_current_merchant_id()' as test_name,
  get_current_merchant_id() as current_merchant_id,
  CASE 
    WHEN get_current_merchant_id() IS NOT NULL THEN 'PASS: Merchant ID found'
    ELSE 'FAIL: No merchant ID - check Clerk authentication setup'
  END as test_result;
