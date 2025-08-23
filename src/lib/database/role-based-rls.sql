-- Role-based RLS Policy for Transactions
-- Option 1: Check if user exists in database with merchant role

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view transactions for their merchant" ON public.transactions;

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Option 1: Simple role-based policy
-- Users can see transactions for their merchant if they have merchant/admin role
CREATE POLICY "Merchant users can view their transactions" ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND role IN ('merchant', 'admin', 'staff')
    AND approved = true
  )
);

-- Option 2: More specific role-based policy
-- Only merchant admins can see all transactions, staff see limited data
/*
CREATE POLICY "Role based transaction access" ON public.transactions
FOR SELECT
TO authenticated
USING (
  CASE 
    -- Merchant admins see all transactions for their merchant
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND merchant_id = transactions.merchant_id
      AND role = 'admin'
      AND approved = true
    ) THEN true
    
    -- Regular merchants see all transactions for their merchant
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND merchant_id = transactions.merchant_id
      AND role = 'merchant'
      AND approved = true
    ) THEN true
    
    -- Staff only see transactions they processed
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND merchant_id = transactions.merchant_id
      AND role = 'staff'
      AND approved = true
      AND user_id = transactions.staff_user_id
    ) THEN true
    
    ELSE false
  END
);
*/
