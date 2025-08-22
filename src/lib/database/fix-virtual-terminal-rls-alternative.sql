-- Alternative RLS fix for virtual_terminal_passwords table
-- This approach uses direct auth.uid() and users table lookup instead of get_current_merchant_id()
-- Use this if the get_current_merchant_id() function is causing issues

-- First, drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_delete_policy" ON virtual_terminal_passwords;

-- Create new RLS policies using direct auth.uid() lookup
-- These policies look up the merchant_id from the users table based on Clerk user ID

-- Allow merchants to select their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords
  FOR SELECT USING (
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
      AND u.approved = true
    )
  );

-- Allow merchants to insert their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords
  FOR INSERT WITH CHECK (
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
      AND u.approved = true
    )
  );

-- Allow merchants to update their own virtual terminal passwords
CREATE POLICY "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords
  FOR UPDATE USING (
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
      AND u.approved = true
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
      AND u.approved = true
    )
  );

-- Allow merchants to delete their own virtual terminal passwords (optional)
CREATE POLICY "virtual_terminal_passwords_delete_policy" ON virtual_terminal_passwords
  FOR DELETE USING (
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
      AND u.approved = true
    )
  );

-- Ensure RLS is enabled on the table
ALTER TABLE virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON virtual_terminal_passwords TO authenticated;

-- Test the policies by checking if auth context works
SELECT 
  'Testing auth context' as test_name,
  auth.jwt() ->> 'sub' as clerk_user_id,
  (SELECT u.merchant_id FROM users u WHERE u.clerk_user_id = auth.jwt() ->> 'sub' LIMIT 1) as merchant_id,
  CASE 
    WHEN auth.jwt() ->> 'sub' IS NOT NULL THEN 'PASS: Auth context found'
    ELSE 'FAIL: No auth context - check authentication'
  END as test_result;
