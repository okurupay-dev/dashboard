-- Fix pending_users table for invitation acceptance
-- Based on your current schema, here are the required changes:

-- 1. Enable RLS on pending_users table
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- 2. Allow public access for invitation validation (unauthenticated users need to read invitations)
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

-- 3. Allow authenticated users to update their own invitation status
CREATE POLICY "update_own_pending_invitation" ON public.pending_users
FOR UPDATE TO authenticated
USING (email = (auth.jwt() -> 'user_metadata' ->> 'email'))
WITH CHECK (email = (auth.jwt() -> 'user_metadata' ->> 'email'));

-- 4. Update the AcceptInvitation component to use correct status values
-- Your schema shows status has these possible values:
-- - 'pending_invite' (default)
-- - Other values based on your application logic

-- 5. Update merchant_id field type consistency
-- Your schema has both merchant_id (text) and merchant_id_uuid (uuid)
-- The foreign key constraint uses merchant_id_uuid, so ensure your queries use the correct field
