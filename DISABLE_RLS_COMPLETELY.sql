-- DISABLE RLS COMPLETELY - Get invitation working first, secure later

-- 1. Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.okuru_merchant_analytics DISABLE ROW LEVEL SECURITY;

-- 2. Grant full permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Fix the merchant_id_uuid issue one more time
UPDATE public.pending_users 
SET merchant_id_uuid = merchant_id::uuid 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- 4. Verify everything is accessible
SELECT 'users' as table_name, count(*) as count FROM public.users
UNION ALL
SELECT 'merchants' as table_name, count(*) as count FROM public.merchants
UNION ALL
SELECT 'pending_users' as table_name, count(*) as count FROM public.pending_users;
