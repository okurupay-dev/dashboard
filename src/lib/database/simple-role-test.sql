-- Simple role-based test for transactions
-- This checks if the authenticated user has merchant access via the users table

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Simple test: Allow access if user exists in users table for this merchant
CREATE POLICY "Users can view transactions for their merchant" ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
