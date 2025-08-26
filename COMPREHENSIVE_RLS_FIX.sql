-- COMPREHENSIVE RLS FIX for Invitation Acceptance
-- Run this ENTIRE script in your Supabase SQL Editor to fix all RLS issues

-- 1. Fix merchant_id_uuid null values in pending_users table
UPDATE public.pending_users 
SET merchant_id_uuid = merchant_id::uuid 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- 2. Drop ALL existing RLS policies that might conflict
DROP POLICY IF EXISTS "public_merchants_read_for_invitations" ON public.merchants;
DROP POLICY IF EXISTS "merchant_own_data" ON public.merchants;
DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
DROP POLICY IF EXISTS "users_own_data" ON public.users;
DROP POLICY IF EXISTS "merchant_admin_manage_users" ON public.users;
DROP POLICY IF EXISTS "merchant_admin_update_users" ON public.users;
DROP POLICY IF EXISTS "public_pending_users_read" ON public.pending_users;
DROP POLICY IF EXISTS "pending_users_update_anon" ON public.pending_users;
DROP POLICY IF EXISTS "update_own_pending_invitation" ON public.pending_users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- 3. Create permissive policies for invitation acceptance

-- Allow anonymous read access to merchants table
CREATE POLICY "public_merchants_read_for_invitations" ON public.merchants
FOR SELECT TO anon, authenticated
USING (true);

-- Allow anonymous insert into users table during invitation acceptance
CREATE POLICY "users_insert_anon" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow authenticated users to read their own user data
CREATE POLICY "users_read_own" ON public.users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Allow anonymous read access to pending_users table
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

-- Allow anonymous updates to pending_users during invitation acceptance
CREATE POLICY "pending_users_update_anon" ON public.pending_users
FOR UPDATE TO anon, authenticated
WITH CHECK (true);

-- 4. Ensure RLS is enabled on all tables
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions to anon role
GRANT SELECT ON public.merchants TO anon;
GRANT SELECT ON public.pending_users TO anon;
GRANT INSERT ON public.users TO anon;
GRANT UPDATE ON public.pending_users TO anon;

-- 6. Verify the foreign key constraint exists and is valid
-- This should show the constraint - if it errors, the constraint is missing
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE conname = 'users_auth_user_id_fkey';