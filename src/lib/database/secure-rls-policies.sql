-- Secure RLS policies for production use
-- Run this in your Supabase SQL Editor to re-enable security

-- Re-enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view own records" ON users;
DROP POLICY IF EXISTS "Users can update own records" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON users;
DROP POLICY IF EXISTS "Allow system to insert users" ON users;
DROP POLICY IF EXISTS "Allow system to update users" ON users;

-- USERS TABLE POLICIES
-- Merchants can only VIEW their own user data (read-only)
CREATE POLICY "Merchants can view own data" ON users
  FOR SELECT TO authenticated
  USING (
    clerk_user_id = auth.jwt() ->> 'sub' OR
    email = auth.jwt() ->> 'email'
  );

-- ONLY admin dashboard (service role) can INSERT/UPDATE/DELETE users
CREATE POLICY "Admin only can manage users" ON users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- MERCHANTS TABLE POLICIES  
-- Merchants can only VIEW their associated merchant data (read-only)
CREATE POLICY "Merchants can view own merchant data" ON merchants
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (
      SELECT merchant_id FROM users 
      WHERE clerk_user_id = auth.jwt() ->> 'sub' OR email = auth.jwt() ->> 'email'
    )
  );

-- ONLY admin dashboard (service role) can INSERT/UPDATE/DELETE merchants
CREATE POLICY "Admin only can manage merchants" ON merchants
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('users', 'merchants')
ORDER BY tablename, policyname;
