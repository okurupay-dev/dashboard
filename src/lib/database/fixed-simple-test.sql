-- Fixed simple transaction RLS test

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy with complete syntax
CREATE POLICY "Users can view transactions for their merchant" 
ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id = '4d54dc5d-2e05-4848-8294-62341b176a6f'
);
