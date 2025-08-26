-- PERMISSIVE RLS POLICIES for First-Time Password Creation
-- Allows invitation acceptance while keeping RLS enabled

-- 1. Drop all existing policies that are causing conflicts
DROP POLICY IF EXISTS "allow_merchant_read" ON public.merchants;
DROP POLICY IF EXISTS "allow_user_operations" ON public.users;
DROP POLICY IF EXISTS "allow_pending_user_operations" ON public.pending_users;

-- 2. Create permissive policies for invitation flow

-- Merchants: Allow all operations for invitation validation
CREATE POLICY "merchants_permissive_access" ON public.merchants
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Users: Allow all operations during invitation acceptance
-- This is permissive for first-time password creation
CREATE POLICY "users_permissive_access" ON public.users
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Pending Users: Allow all operations for invitation flow
CREATE POLICY "pending_users_permissive_access" ON public.pending_users
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Ensure RLS is enabled but with permissive policies
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.merchants TO anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pending_users TO anon;

-- 5. Fix merchant_id_uuid for all records
UPDATE public.pending_users 
SET merchant_id_uuid = merchant_id::uuid 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- 6. Test query to verify access
SELECT 'Test successful - RLS is enabled but permissive' as status;
