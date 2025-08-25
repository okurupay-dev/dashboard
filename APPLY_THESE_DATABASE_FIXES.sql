-- URGENT: Apply these database fixes to resolve invitation acceptance errors
-- Run this in your Supabase SQL Editor to fix the 406/400/409 errors

-- 1. Fix merchant_id_uuid null values in pending_users table
UPDATE public.pending_users 
SET merchant_id_uuid = merchant_id::uuid 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- 2. Allow anonymous users to read merchants table (for invitation validation)
DROP POLICY IF EXISTS "public_merchants_read_for_invitations" ON public.merchants;
CREATE POLICY "public_merchants_read_for_invitations" ON public.merchants
FOR SELECT TO anon
USING (true);

-- 3. Allow anonymous users to insert into users table (during invitation acceptance)
DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
CREATE POLICY "users_insert_anon" ON public.users
FOR INSERT TO anon
WITH CHECK (true);

-- 4. Ensure pending_users table allows public read access
DROP POLICY IF EXISTS "public_pending_users_read" ON public.pending_users;
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

-- 5. Allow pending_users updates during invitation acceptance
DROP POLICY IF EXISTS "pending_users_update_anon" ON public.pending_users;
CREATE POLICY "pending_users_update_anon" ON public.pending_users
FOR UPDATE TO anon
WITH CHECK (true);
