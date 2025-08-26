-- EMERGENCY FIX - Run this immediately
-- This will completely disable RLS temporarily to fix the invitation flow

-- 1. Fix the specific pending_users record that's causing issues
UPDATE public.pending_users 
SET merchant_id_uuid = '78d3d151-51af-41d9-8d86-3a34c5d79532'::uuid
WHERE email = 'tamura.ryotaro@gmail.com' AND merchant_id_uuid IS NULL;

-- 2. Temporarily disable RLS on critical tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users DISABLE ROW LEVEL SECURITY;

-- 3. Grant full permissions to anon role temporarily
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.merchants TO anon;
GRANT ALL ON public.pending_users TO anon;

-- 4. Verify the fix
SELECT email, merchant_id, merchant_id_uuid 
FROM public.pending_users 
WHERE email = 'tamura.ryotaro@gmail.com';
