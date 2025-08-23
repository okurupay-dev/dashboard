-- Simple debug: Check if transactions exist at all

-- 1. Disable RLS to see raw data
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 2. Count all transactions
SELECT COUNT(*) as total_transactions FROM public.transactions;

-- 3. Show first few transactions with merchant info
SELECT transaction_id, merchant_id, amount_fiat, status, created_at
FROM public.transactions 
LIMIT 5;

-- 4. Check your specific merchant
SELECT COUNT(*) as your_merchant_transactions
FROM public.transactions 
WHERE merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f';
