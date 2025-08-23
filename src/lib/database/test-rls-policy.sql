-- Test RLS Policy for Transactions
-- Run this to test if RLS is working with your specific merchant ID

-- First, drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create test policy with your specific merchant ID
CREATE POLICY "Users can view transactions for their merchant" ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);

-- Also enable RLS on related tables for the joins to work
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for related tables
DROP POLICY IF EXISTS "Users can view terminals for their merchant" ON public.terminals;
CREATE POLICY "Users can view terminals for their merchant" ON public.terminals
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);

DROP POLICY IF EXISTS "Users can view locations for their merchant" ON public.locations;
CREATE POLICY "Users can view locations for their merchant" ON public.locations
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);

DROP POLICY IF EXISTS "Users can view users in their merchant" ON public.users;
CREATE POLICY "Users can view users in their merchant" ON public.users
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);
