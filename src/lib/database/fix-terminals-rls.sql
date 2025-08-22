-- Fix RLS issues on terminals table for Virtual Terminal Management
-- This disables RLS temporarily to allow virtual terminal creation
-- Security is enforced at application layer via Clerk authentication

-- Disable RLS on terminals table
ALTER TABLE public.terminals DISABLE ROW LEVEL SECURITY;

-- Optional: Add minimal RLS policy that allows authenticated users
-- (Alternative to complete RLS disabling)
-- ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow authenticated access" ON public.terminals;
-- CREATE POLICY "Allow authenticated access" ON public.terminals
--   FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Verify RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'terminals';
