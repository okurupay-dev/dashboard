-- Supabase Auth RLS Policies - Much Simpler!
-- With Supabase Auth, auth.uid() and auth.jwt() work natively

-- Enable RLS on all tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Simple, clean RLS policies using Supabase Auth
-- Users can only see data for their merchant
CREATE POLICY "Users can view transactions for their merchant" ON public.transactions
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view terminals for their merchant" ON public.terminals
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view locations for their merchant" ON public.locations
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view merchant wallets" ON public.merchant_wallets
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view wallet addresses" ON public.wallet_addresses
FOR SELECT USING (
  wallet_id IN (
    SELECT wallet_id 
    FROM public.merchant_wallets 
    WHERE merchant_id IN (
      SELECT merchant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view their merchant" ON public.merchants
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view users in their merchant" ON public.users
FOR SELECT USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Update policies for merchant settings
CREATE POLICY "Users can update their merchant" ON public.merchants
FOR UPDATE USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'merchant')
  )
);

-- Virtual terminal password management
ALTER TABLE public.virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage virtual terminal passwords" ON public.virtual_terminal_passwords
FOR ALL USING (
  merchant_id IN (
    SELECT merchant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'merchant')
  )
);
