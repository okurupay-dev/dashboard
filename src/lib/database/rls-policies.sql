-- Row Level Security Policies for Okuru Dashboard
-- These policies ensure users can only access data for their merchant

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transactions for their merchant
CREATE POLICY "Users can view transactions for their merchant" ON public.transactions
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Dashboard users can only VIEW transactions, not modify them
-- Transaction creation/updates should happen via backend API or terminal systems

-- Enable RLS on related tables
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view terminals for their merchant
CREATE POLICY "Users can view terminals for their merchant" ON public.terminals
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can view locations for their merchant
CREATE POLICY "Users can view locations for their merchant" ON public.locations
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can view merchant wallets for their merchant
CREATE POLICY "Users can view merchant wallets for their merchant" ON public.merchant_wallets
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can view wallet addresses for their merchant
CREATE POLICY "Users can view wallet addresses for their merchant" ON public.wallet_addresses
FOR SELECT
TO authenticated
USING (
  wallet_id IN (
    SELECT wallet_id 
    FROM public.merchant_wallets 
    WHERE merchant_id IN (
      SELECT merchant_id 
      FROM public.users 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
);

-- Policy: Users can view other users in their merchant (for staff listings)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view users in their merchant" ON public.users
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own record" ON public.users
FOR UPDATE
TO authenticated
USING (clerk_user_id = auth.jwt() ->> 'sub')
WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Merchants table - users can view their own merchant
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their merchant" ON public.merchants
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can update merchant settings (virtual terminal config, etc.)
CREATE POLICY "Users can update their merchant" ON public.merchants
FOR UPDATE
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
)
WITH CHECK (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can manage virtual terminal passwords for their merchant
ALTER TABLE public.virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage virtual terminal passwords" ON public.virtual_terminal_passwords
FOR ALL
TO authenticated
USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
)
WITH CHECK (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Policy: Users can manage terminal configurations for their merchant
ALTER TABLE public.terminal_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage terminal configurations" ON public.terminal_configurations
FOR ALL
TO authenticated
USING (
  terminal_id IN (
    SELECT terminal_id 
    FROM public.terminals 
    WHERE merchant_id IN (
      SELECT merchant_id 
      FROM public.users 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
)
WITH CHECK (
  terminal_id IN (
    SELECT terminal_id 
    FROM public.terminals 
    WHERE merchant_id IN (
      SELECT merchant_id 
      FROM public.users 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
);
