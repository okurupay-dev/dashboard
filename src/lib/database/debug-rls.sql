-- Debug RLS setup step by step

-- 1. First, let's disable RLS temporarily to see if transactions exist
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 2. Check if transactions exist for your merchant
SELECT COUNT(*) as transaction_count 
FROM public.transactions 
WHERE merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f';

-- 3. Check what transactions exist (first 5)
SELECT transaction_id, merchant_id, amount_fiat, status, created_at
FROM public.transactions 
WHERE merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
LIMIT 5;

-- 4. Check authentication context
SELECT current_user, session_user;

-- 5. Re-enable RLS and create policy
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;

CREATE POLICY "Users can view transactions for their merchant" 
ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);

-- 6. Test the policy
SELECT COUNT(*) as transaction_count_with_rls
FROM public.transactions 
WHERE merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f';
