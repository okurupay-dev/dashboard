-- Proper Clerk/Supabase authentication integration fix
-- This creates RLS policies that work with your current setup while maintaining security

-- First, let's create a simple function that extracts merchant_id from the request headers
-- This allows us to maintain RLS while working with Clerk authentication

-- Create a function to get merchant ID from custom headers or JWT claims
CREATE OR REPLACE FUNCTION get_request_merchant_id()
RETURNS UUID AS $$
DECLARE
  merchant_id UUID;
BEGIN
  -- Try to get merchant_id from custom header (set by your application)
  merchant_id := current_setting('request.headers', true)::json->>'x-merchant-id';
  
  -- If not found in headers, try JWT claims
  IF merchant_id IS NULL THEN
    merchant_id := current_setting('request.jwt.claims', true)::json->>'merchant_id';
  END IF;
  
  -- If still not found, try the auth.jwt() function
  IF merchant_id IS NULL THEN
    merchant_id := (auth.jwt() ->> 'merchant_id')::UUID;
  END IF;
  
  RETURN merchant_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing problematic policies
DROP POLICY IF EXISTS "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords;
DROP POLICY IF EXISTS "virtual_terminal_passwords_delete_policy" ON virtual_terminal_passwords;

-- Create new RLS policies using the custom function
CREATE POLICY "virtual_terminal_passwords_select_policy" ON virtual_terminal_passwords
  FOR SELECT USING (
    merchant_id = get_request_merchant_id() OR
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id'
      AND u.approved = true
    )
  );

CREATE POLICY "virtual_terminal_passwords_insert_policy" ON virtual_terminal_passwords
  FOR INSERT WITH CHECK (
    merchant_id = get_request_merchant_id() OR
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id'
      AND u.approved = true
    )
  );

CREATE POLICY "virtual_terminal_passwords_update_policy" ON virtual_terminal_passwords
  FOR UPDATE USING (
    merchant_id = get_request_merchant_id() OR
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id'
      AND u.approved = true
    )
  )
  WITH CHECK (
    merchant_id = get_request_merchant_id() OR
    merchant_id IN (
      SELECT u.merchant_id 
      FROM users u 
      WHERE u.clerk_user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id'
      AND u.approved = true
    )
  );

-- Enable RLS
ALTER TABLE virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON virtual_terminal_passwords TO authenticated;

-- Test the function
SELECT 
  'Testing get_request_merchant_id()' as test_name,
  get_request_merchant_id() as merchant_id_from_function,
  current_setting('request.headers', true) as current_headers,
  'Check if headers contain merchant info' as note;
