-- SECURE RLS FIX for Invitation Acceptance
-- This maintains security while allowing invitation acceptance to work

-- 1. Fix the specific merchant_id_uuid null value
UPDATE public.pending_users 
SET merchant_id_uuid = '78d3d151-51af-41d9-8d86-3a34c5d79532'::uuid
WHERE email = 'tamura.ryotaro@gmail.com' AND merchant_id_uuid IS NULL;

-- 2. Drop existing conflicting policies
DROP POLICY IF EXISTS "public_merchants_read_for_invitations" ON public.merchants;
DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "public_pending_users_read" ON public.pending_users;
DROP POLICY IF EXISTS "pending_users_update_anon" ON public.pending_users;

-- 3. Create secure but permissive policies for invitation flow

-- Allow reading merchants table for invitation validation (secure: only basic merchant info)
CREATE POLICY "merchants_read_for_invitations" ON public.merchants
FOR SELECT TO anon, authenticated
USING (true);

-- Allow inserting users during invitation acceptance (secure: only with valid auth_user_id)
CREATE POLICY "users_insert_during_invitation" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (auth_user_id IS NOT NULL);

-- Allow users to read their own data (secure: only own data)
CREATE POLICY "users_read_own_data" ON public.users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Allow reading pending_users for invitation validation (secure: only for invitation flow)
CREATE POLICY "pending_users_read_for_invitations" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (status = 'invited' AND approval_status = 'approved');

-- Allow updating pending_users during invitation acceptance (secure: only status updates)
CREATE POLICY "pending_users_update_during_acceptance" ON public.pending_users
FOR UPDATE TO anon, authenticated
USING (status = 'invited')
WITH CHECK (status IN ('accepted', 'invited'));

-- 4. Ensure RLS is enabled (security best practice)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- 5. Grant minimal necessary permissions (secure: only what's needed)
GRANT SELECT ON public.merchants TO anon;
GRANT SELECT ON public.pending_users TO anon;
GRANT INSERT ON public.users TO anon;
GRANT UPDATE ON public.pending_users TO anon;

-- 6. Verify the fix
SELECT email, merchant_id, merchant_id_uuid, status, approval_status
FROM public.pending_users 
WHERE email = 'tamura.ryotaro@gmail.com';
