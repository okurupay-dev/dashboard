-- Fix pending_users table for invitation acceptance
-- Based on your current schema, here are the required changes:

-- 1. Enable RLS on pending_users table (if not already enabled)
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "public_pending_users_read" ON public.pending_users;
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "update_own_pending_invitation" ON public.pending_users;
CREATE POLICY "update_own_pending_invitation" ON public.pending_users
FOR UPDATE TO authenticated
USING (email = (auth.jwt() -> 'user_metadata' ->> 'email'))
WITH CHECK (email = (auth.jwt() -> 'user_metadata' ->> 'email'));

-- 4. Update the AcceptInvitation component to use correct status values
-- Your schema shows status has these possible values:
-- - 'pending_invite' (default)
-- - Other values based on your application logic

-- 5. Add RLS policies for users table to fix 406/401 errors
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
FOR INSERT TO authenticated
WITH CHECK (true); -- Allow any authenticated user to insert

DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
CREATE POLICY "users_insert_anon" ON public.users
FOR INSERT TO anon
WITH CHECK (true); -- Allow anonymous users to insert during invitation acceptance

-- 6. Add RLS policy for merchants table (needed for invitation acceptance)
DROP POLICY IF EXISTS "merchants_read_public" ON public.merchants;
CREATE POLICY "merchants_read_public" ON public.merchants
FOR SELECT TO anon, authenticated
USING (true);

-- 7. Update merchant_id field type consistency
-- Your schema has both merchant_id (text) and merchant_id_uuid (uuid)
-- The foreign key constraint uses merchant_id_uuid, so ensure your queries use the correct field
