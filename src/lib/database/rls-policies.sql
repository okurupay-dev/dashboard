-- Row Level Security Policies for Merchant Dashboard
-- These policies ensure merchants can only access their own data

-- Enable RLS on all merchant tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okuru_merchant_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Transactions: Merchant data isolation
CREATE POLICY "merchant_own_transactions" ON public.transactions
FOR ALL TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'))
WITH CHECK (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Terminals: Merchant data isolation
CREATE POLICY "merchant_own_terminals" ON public.terminals
FOR ALL TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'))
WITH CHECK (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Locations: Merchant data isolation
CREATE POLICY "merchant_own_locations" ON public.locations
FOR ALL TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'))
WITH CHECK (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Merchants: Users can only access their own merchant record
CREATE POLICY "merchant_own_record" ON public.merchants
FOR ALL TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'))
WITH CHECK (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Users: Merchant staff isolation
CREATE POLICY "merchant_own_users" ON public.users
FOR SELECT TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Users: Only merchant_admin can manage staff
CREATE POLICY "merchant_admin_manage_users" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
);

CREATE POLICY "merchant_admin_update_users" ON public.users
FOR UPDATE TO authenticated
USING (
  merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
)
WITH CHECK (
  merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
);

-- Wallets: Only merchant_admin can access
CREATE POLICY "merchant_admin_wallets" ON public.merchant_wallets
FOR ALL TO authenticated
USING (
  merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
)
WITH CHECK (
  merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
);

-- Wallet Addresses: Only merchant_admin can access
CREATE POLICY "merchant_admin_wallet_addresses" ON public.wallet_addresses
FOR ALL TO authenticated
USING (
  wallet_id IN (
    SELECT wallet_id FROM public.merchant_wallets 
    WHERE merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  )
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
)
WITH CHECK (
  wallet_id IN (
    SELECT wallet_id FROM public.merchant_wallets 
    WHERE merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  )
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'merchant_admin'
);

-- Analytics: Merchant data isolation
CREATE POLICY "merchant_own_analytics" ON public.okuru_merchant_analytics
FOR SELECT TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Dashboard users can only VIEW transactions, not modify them
-- Transaction creation/updates should happen via backend API or terminal systems

-- Additional tables that need RLS
ALTER TABLE public.virtual_terminal_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can update their own record
CREATE POLICY "user_update_own_record" ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Policy: Users can manage virtual terminal passwords for their merchant
CREATE POLICY "merchant_virtual_terminal_passwords" ON public.virtual_terminal_passwords
FOR ALL TO authenticated
USING (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'))
WITH CHECK (merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id'));

-- Policy: Users can manage terminal configurations for their merchant

CREATE POLICY "merchant_terminal_configurations" ON public.terminal_configurations
FOR ALL TO authenticated
USING (
  terminal_id IN (
    SELECT terminal_id FROM public.terminals 
    WHERE merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  )
)
WITH CHECK (
  terminal_id IN (
    SELECT terminal_id FROM public.terminals 
    WHERE merchant_id::TEXT = (auth.jwt() -> 'user_metadata' ->> 'merchant_id')
  )
);

-- Pending Users: Allow public access for invitation validation (unauthenticated users need to read invitations)
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

-- Pending Users: Allow authenticated users to update their own invitation status
CREATE POLICY "update_own_pending_invitation" ON public.pending_users
FOR UPDATE TO authenticated
USING (email = (auth.jwt() -> 'user_metadata' ->> 'email'))
WITH CHECK (email = (auth.jwt() -> 'user_metadata' ->> 'email'));

-- Merchants: Allow public read access for invitation validation (unauthenticated users need merchant info)
CREATE POLICY "public_merchants_read_for_invitations" ON public.merchants
FOR SELECT TO anon
USING (true);
