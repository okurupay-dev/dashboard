-- Fix merchant_id_uuid null values in pending_users table
-- Update all pending_users records to have merchant_id_uuid = merchant_id

UPDATE public.pending_users 
SET merchant_id_uuid = merchant_id::uuid 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- Apply the RLS policy fix for merchants table
DROP POLICY IF EXISTS "public_merchants_read_for_invitations" ON public.merchants;
CREATE POLICY "public_merchants_read_for_invitations" ON public.merchants
FOR SELECT TO anon
USING (true);

-- Also ensure users table allows anonymous inserts during invitation acceptance
DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
CREATE POLICY "users_insert_anon" ON public.users
FOR INSERT TO anon
WITH CHECK (true);
