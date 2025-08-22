-- Clerk + Supabase JWT Integration Fix (Safe Version)
-- This addresses the RLS authentication issue by properly handling Clerk JWTs
-- WITHOUT dropping existing functions that have dependencies

-- =============================================================================
-- CLERK JWT HELPER FUNCTIONS (SAFE UPDATES)
-- =============================================================================

-- Create function to get Clerk user ID from JWT (NEW - no conflicts)
CREATE OR REPLACE FUNCTION get_current_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Clerk uses 'sub' field for user ID
  RETURN COALESCE(
    auth.jwt() ->> 'sub',           -- Standard JWT subject
    auth.jwt() ->> 'clerk_user_id', -- Custom claim if set
    auth.jwt() ->> 'user_id'        -- Alternative custom claim
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing get_current_merchant_id function to work with Clerk
-- This replaces the function body without dropping it (safe)
CREATE OR REPLACE FUNCTION get_current_merchant_id()
RETURNS UUID AS $$
DECLARE
  clerk_user_id TEXT;
  merchant_id UUID;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT u.merchant_id INTO merchant_id
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id
  AND u.approved = true;
  
  RETURN merchant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing is_admin function to work with Clerk
-- This replaces the function body without dropping it (safe)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  clerk_user_id TEXT;
  user_role TEXT;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id
  AND u.approved = true;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if current user is approved (NEW - no conflicts)
CREATE OR REPLACE FUNCTION is_approved_user()
RETURNS BOOLEAN AS $$
DECLARE
  clerk_user_id TEXT;
  user_approved BOOLEAN;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT u.approved INTO user_approved
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id;
  
  RETURN COALESCE(user_approved, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user ID (NEW - no conflicts)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  clerk_user_id TEXT;
  user_id UUID;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT u.user_id INTO user_id
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id
  AND u.approved = true;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CLERK METADATA HELPER FUNCTIONS
-- =============================================================================

-- Function to get user metadata from Clerk JWT
CREATE OR REPLACE FUNCTION get_clerk_user_metadata()
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata')::JSONB,
    (auth.jwt() -> 'public_metadata')::JSONB,
    (auth.jwt() -> 'private_metadata')::JSONB,
    '{}'::JSONB
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get specific metadata value
CREATE OR REPLACE FUNCTION get_clerk_metadata_value(metadata_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN get_clerk_user_metadata() ->> metadata_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ENHANCED AUTHENTICATION FUNCTIONS
-- =============================================================================

-- Function to validate user session and get full user context
CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE(
  user_id UUID,
  clerk_user_id TEXT,
  merchant_id UUID,
  role TEXT,
  approved BOOLEAN,
  email TEXT,
  name TEXT
) AS $$
DECLARE
  v_clerk_user_id TEXT;
BEGIN
  v_clerk_user_id := get_current_clerk_user_id();
  
  IF v_clerk_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.user_id,
    u.clerk_user_id,
    u.merchant_id,
    u.role,
    u.approved,
    u.email,
    u.name
  FROM users u
  WHERE u.clerk_user_id = v_clerk_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  clerk_user_id TEXT;
  user_role TEXT;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id
  AND u.approved = true;
  
  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user belongs to specific merchant
CREATE OR REPLACE FUNCTION belongs_to_merchant(target_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_merchant_id UUID;
BEGIN
  current_merchant_id := get_current_merchant_id();
  RETURN current_merchant_id = target_merchant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- JWT DEBUGGING FUNCTIONS (DEVELOPMENT ONLY)
-- =============================================================================

-- Function to debug JWT contents (use only in development)
CREATE OR REPLACE FUNCTION debug_jwt_claims()
RETURNS JSONB AS $$
BEGIN
  RETURN auth.jwt();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to debug user lookup (use only in development)
CREATE OR REPLACE FUNCTION debug_user_lookup()
RETURNS TABLE(
  clerk_id TEXT,
  found_user BOOLEAN,
  user_data JSONB
) AS $$
DECLARE
  v_clerk_user_id TEXT;
  v_user_exists BOOLEAN;
  v_user_data JSONB;
BEGIN
  v_clerk_user_id := get_current_clerk_user_id();
  
  SELECT EXISTS(
    SELECT 1 FROM users WHERE clerk_user_id = v_clerk_user_id
  ) INTO v_user_exists;
  
  SELECT to_jsonb(u.*) INTO v_user_data
  FROM users u
  WHERE u.clerk_user_id = v_clerk_user_id;
  
  RETURN QUERY SELECT v_clerk_user_id, v_user_exists, v_user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_current_clerk_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_clerk_user_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION get_clerk_metadata_value(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION belongs_to_merchant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_jwt_claims() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_lookup() TO authenticated;

-- Ensure existing functions have proper permissions
GRANT EXECUTE ON FUNCTION get_current_merchant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_approved_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- =============================================================================
-- EXAMPLE USAGE AND TESTING
-- =============================================================================

/*
-- Test the JWT integration (run these in Supabase SQL Editor while authenticated)

-- 1. Check JWT contents
SELECT debug_jwt_claims();

-- 2. Check user lookup
SELECT * FROM debug_user_lookup();

-- 3. Get current user context
SELECT * FROM get_current_user_context();

-- 4. Test authentication functions
SELECT 
  get_current_clerk_user_id() as clerk_id,
  get_current_merchant_id() as merchant_id,
  get_current_user_id() as user_id,
  is_admin() as is_admin,
  is_approved_user() as is_approved;

-- 5. Test role checking
SELECT 
  has_role('admin') as is_admin,
  has_role('merchant') as is_merchant,
  has_role('staff') as is_staff;

-- 6. Test metadata access
SELECT 
  get_clerk_user_metadata() as all_metadata,
  get_clerk_metadata_value('merchant_id') as merchant_id_from_metadata,
  get_clerk_metadata_value('role') as role_from_metadata;
*/

-- =============================================================================
-- NOTES
-- =============================================================================

/*
This safe version:
1. Does NOT drop existing functions (avoids dependency conflicts)
2. Updates function bodies using CREATE OR REPLACE (safe)
3. Adds new helper functions for better Clerk integration
4. Provides debugging functions for troubleshooting
5. Maintains all existing RLS policy compatibility
6. Adds enhanced authentication and authorization helpers

The existing RLS policies will continue to work because:
- get_current_merchant_id() function signature remains the same
- is_admin() function signature remains the same
- All existing function names are preserved
- Only the implementation is updated to work with Clerk JWTs

This approach is safe and won't break any existing policies or dependencies.
*/
