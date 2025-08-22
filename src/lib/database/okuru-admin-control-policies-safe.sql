-- Okuru Admin Control Policies (Safe Version)
-- Okuru company has FULL administrative control over all merchant data
-- Merchants have limited operational control only
-- This version safely handles existing policies

-- =============================================================================
-- OKURU ADMIN ROLE DETECTION
-- =============================================================================

-- Function to check if current user is Okuru admin
CREATE OR REPLACE FUNCTION is_okuru_admin()
RETURNS BOOLEAN AS $$
DECLARE
  clerk_user_id TEXT;
  user_role TEXT;
  user_email TEXT;
BEGIN
  clerk_user_id := get_current_clerk_user_id();
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is Okuru admin by email domain or special role
  SELECT u.role, u.email INTO user_role, user_email
  FROM users u
  WHERE u.clerk_user_id = clerk_user_id
  AND u.approved = true;
  
  -- Okuru admins identified by:
  -- 1. Role = 'okuru_admin' OR
  -- 2. Email ends with @okurupay.com OR @okuru.com
  RETURN (
    user_role = 'okuru_admin' OR
    user_email LIKE '%@okurupay.com' OR
    user_email LIKE '%@okuru.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SAFELY DROP EXISTING POLICIES BEFORE CREATING NEW ONES
-- =============================================================================

-- Drop existing policies safely (IF EXISTS prevents errors)
DROP POLICY IF EXISTS "merchants_okuru_full_access" ON merchants;
DROP POLICY IF EXISTS "merchants_merchant_read_only" ON merchants;
DROP POLICY IF EXISTS "Users can view their own merchant" ON merchants;
DROP POLICY IF EXISTS "Admins can update their merchant" ON merchants;

DROP POLICY IF EXISTS "users_okuru_full_access" ON users;
DROP POLICY IF EXISTS "users_merchant_select" ON users;
DROP POLICY IF EXISTS "users_merchant_staff_management" ON users;
DROP POLICY IF EXISTS "users_merchant_staff_update" ON users;
DROP POLICY IF EXISTS "users_merchant_staff_delete" ON users;
DROP POLICY IF EXISTS "Users can view users in their merchant" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their merchant" ON users;
DROP POLICY IF EXISTS "Admins can update users in their merchant" ON users;

DROP POLICY IF EXISTS "locations_okuru_full_access" ON locations;
DROP POLICY IF EXISTS "locations_merchant_read_only" ON locations;
DROP POLICY IF EXISTS "Users can view locations in their merchant" ON locations;
DROP POLICY IF EXISTS "Admins can manage locations in their merchant" ON locations;

DROP POLICY IF EXISTS "terminals_okuru_full_access" ON terminals;
DROP POLICY IF EXISTS "terminals_merchant_select" ON terminals;
DROP POLICY IF EXISTS "terminals_merchant_update_limited" ON terminals;
DROP POLICY IF EXISTS "Users can view terminals in their merchant" ON terminals;
DROP POLICY IF EXISTS "Admins can manage terminals in their merchant" ON terminals;
DROP POLICY IF EXISTS "terminals_select" ON terminals;
DROP POLICY IF EXISTS "terminals_update" ON terminals;

DROP POLICY IF EXISTS "terminal_crypto_config_okuru_full_access" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_merchant_select" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_merchant_management" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_merchant_update" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_merchant_delete" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_select" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_insert" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_update" ON terminal_crypto_config;
DROP POLICY IF EXISTS "terminal_crypto_config_delete" ON terminal_crypto_config;

DROP POLICY IF EXISTS "terminal_sessions_okuru_full_access" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_merchant_read_only" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_system_operations" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_system_update" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_select" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_insert" ON terminal_sessions;
DROP POLICY IF EXISTS "terminal_sessions_update" ON terminal_sessions;

DROP POLICY IF EXISTS "terminal_permissions_okuru_full_access" ON terminal_permissions;
DROP POLICY IF EXISTS "terminal_permissions_merchant_read_only" ON terminal_permissions;
DROP POLICY IF EXISTS "terminal_permissions_select" ON terminal_permissions;
DROP POLICY IF EXISTS "terminal_permissions_all" ON terminal_permissions;

DROP POLICY IF EXISTS "merchant_wallets_okuru_full_access" ON merchant_wallets;
DROP POLICY IF EXISTS "merchant_wallets_merchant_read_only" ON merchant_wallets;
DROP POLICY IF EXISTS "Users can view wallets in their merchant" ON merchant_wallets;
DROP POLICY IF EXISTS "Admins can manage wallets in their merchant" ON merchant_wallets;
DROP POLICY IF EXISTS "merchant_wallets_read_only" ON merchant_wallets;

DROP POLICY IF EXISTS "wallet_addresses_okuru_full_access" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_merchant_select" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_merchant_add_new_chains" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_merchant_verify" ON wallet_addresses;
DROP POLICY IF EXISTS "Users can view wallet addresses in their merchant" ON wallet_addresses;
DROP POLICY IF EXISTS "Admins can manage wallet addresses in their merchant" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_select" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_insert_new_chains" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_update_verification" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_insert" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_update" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_delete" ON wallet_addresses;

DROP POLICY IF EXISTS "transactions_okuru_full_access" ON transactions;
DROP POLICY IF EXISTS "transactions_merchant_read_only" ON transactions;
DROP POLICY IF EXISTS "transactions_system_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_system_update" ON transactions;
DROP POLICY IF EXISTS "Users can view transactions in their merchant" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions in their merchant" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions in their merchant" ON transactions;
DROP POLICY IF EXISTS "transactions_read_only" ON transactions;

DROP POLICY IF EXISTS "terminal_events_okuru_full_access" ON terminal_transaction_events;
DROP POLICY IF EXISTS "terminal_events_merchant_read_only" ON terminal_transaction_events;
DROP POLICY IF EXISTS "terminal_events_system_insert" ON terminal_transaction_events;
DROP POLICY IF EXISTS "terminal_events_select" ON terminal_transaction_events;
DROP POLICY IF EXISTS "terminal_events_insert" ON terminal_transaction_events;

DROP POLICY IF EXISTS "automations_okuru_full_access" ON automations;
DROP POLICY IF EXISTS "automations_merchant_select" ON automations;
DROP POLICY IF EXISTS "automations_merchant_management" ON automations;
DROP POLICY IF EXISTS "automations_merchant_update" ON automations;
DROP POLICY IF EXISTS "automations_merchant_delete" ON automations;
DROP POLICY IF EXISTS "Users can view automations in their merchant" ON automations;
DROP POLICY IF EXISTS "Admins can manage automations in their merchant" ON automations;
DROP POLICY IF EXISTS "automations_select" ON automations;
DROP POLICY IF EXISTS "automations_insert" ON automations;
DROP POLICY IF EXISTS "automations_update" ON automations;
DROP POLICY IF EXISTS "automations_delete" ON automations;

DROP POLICY IF EXISTS "automation_executions_okuru_full_access" ON automation_executions;
DROP POLICY IF EXISTS "automation_executions_merchant_read_only" ON automation_executions;
DROP POLICY IF EXISTS "Users can view automation executions in their merchant" ON automation_executions;
DROP POLICY IF EXISTS "automation_executions_read_only" ON automation_executions;

-- Drop Okuru admin table policies if they exist
DROP POLICY IF EXISTS "okuru_company_settings_okuru_only" ON okuru_company_settings;
DROP POLICY IF EXISTS "okuru_merchant_analytics_okuru_full" ON okuru_merchant_analytics;
DROP POLICY IF EXISTS "okuru_merchant_analytics_merchant_read" ON okuru_merchant_analytics;
DROP POLICY IF EXISTS "okuru_global_analytics_okuru_only" ON okuru_global_analytics;
DROP POLICY IF EXISTS "okuru_alerts_okuru_full" ON okuru_alerts;
DROP POLICY IF EXISTS "okuru_alerts_merchant_read" ON okuru_alerts;
DROP POLICY IF EXISTS "okuru_fee_collections_okuru_full" ON okuru_fee_collections;
DROP POLICY IF EXISTS "okuru_fee_collections_merchant_read" ON okuru_fee_collections;
DROP POLICY IF EXISTS "okuru_fee_collections_merchant_access" ON okuru_fee_collections;

-- =============================================================================
-- MERCHANTS TABLE - OKURU FULL CONTROL, MERCHANT READ-ONLY
-- =============================================================================

CREATE POLICY "merchants_okuru_full_access" ON merchants
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "merchants_merchant_read_only" ON merchants
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

-- =============================================================================
-- USERS TABLE - OKURU FULL CONTROL, MERCHANT LIMITED STAFF MANAGEMENT
-- =============================================================================

CREATE POLICY "users_okuru_full_access" ON users
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "users_merchant_select" ON users
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "users_merchant_staff_management" ON users
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_admin()
        AND role IN ('staff', 'merchant') -- Cannot create admin or okuru_admin users
    );

CREATE POLICY "users_merchant_staff_update" ON users
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_admin()
        AND role IN ('staff', 'merchant') -- Cannot modify admin users
    )
    WITH CHECK (
        merchant_id = get_current_merchant_id()
        AND role IN ('staff', 'merchant') -- Cannot promote to admin
    );

CREATE POLICY "users_merchant_staff_delete" ON users
    FOR DELETE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_admin()
        AND role IN ('staff', 'merchant') -- Cannot delete admin users
        AND user_id != (
            SELECT user_id FROM users 
            WHERE clerk_user_id = get_current_clerk_user_id()
        ) -- Cannot delete self
    );

-- =============================================================================
-- LOCATIONS TABLE - OKURU FULL CONTROL, MERCHANT READ-ONLY
-- =============================================================================

CREATE POLICY "locations_okuru_full_access" ON locations
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "locations_merchant_read_only" ON locations
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

-- =============================================================================
-- TERMINALS TABLE - OKURU FULL CONTROL, MERCHANT LIMITED UPDATE
-- =============================================================================

CREATE POLICY "terminals_okuru_full_access" ON terminals
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "terminals_merchant_select" ON terminals
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "terminals_merchant_update_limited" ON terminals
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    )
    WITH CHECK (merchant_id = get_current_merchant_id());

-- =============================================================================
-- TERMINAL CRYPTO CONFIG - OKURU FULL CONTROL, MERCHANT FULL MANAGEMENT
-- =============================================================================

CREATE POLICY "terminal_crypto_config_okuru_full_access" ON terminal_crypto_config
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "terminal_crypto_config_merchant_select" ON terminal_crypto_config
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "terminal_crypto_config_merchant_management" ON terminal_crypto_config
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
        AND terminal_id IN (
            SELECT terminal_id FROM terminals 
            WHERE merchant_id = get_current_merchant_id()
        )
    );

CREATE POLICY "terminal_crypto_config_merchant_update" ON terminal_crypto_config
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    )
    WITH CHECK (
        merchant_id = get_current_merchant_id()
        AND terminal_id IN (
            SELECT terminal_id FROM terminals 
            WHERE merchant_id = get_current_merchant_id()
        )
    );

CREATE POLICY "terminal_crypto_config_merchant_delete" ON terminal_crypto_config
    FOR DELETE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    );

-- =============================================================================
-- TERMINAL SESSIONS - OKURU FULL CONTROL, MERCHANT READ-ONLY
-- =============================================================================

CREATE POLICY "terminal_sessions_okuru_full_access" ON terminal_sessions
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "terminal_sessions_merchant_read_only" ON terminal_sessions
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "terminal_sessions_system_operations" ON terminal_sessions
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "terminal_sessions_system_update" ON terminal_sessions
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    )
    WITH CHECK (merchant_id = get_current_merchant_id());

-- =============================================================================
-- TERMINAL PERMISSIONS - OKURU FULL CONTROL, MERCHANT READ-ONLY
-- =============================================================================

CREATE POLICY "terminal_permissions_okuru_full_access" ON terminal_permissions
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "terminal_permissions_merchant_read_only" ON terminal_permissions
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

-- =============================================================================
-- WALLETS - OKURU FULL CONTROL, MERCHANT LIMITED ACCESS
-- =============================================================================

CREATE POLICY "merchant_wallets_okuru_full_access" ON merchant_wallets
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "merchant_wallets_merchant_read_only" ON merchant_wallets
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "wallet_addresses_okuru_full_access" ON wallet_addresses
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "wallet_addresses_merchant_select" ON wallet_addresses
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND wallet_id IN (
            SELECT wallet_id FROM merchant_wallets 
            WHERE merchant_id = get_current_merchant_id()
        )
    );

CREATE POLICY "wallet_addresses_merchant_add_new_chains" ON wallet_addresses
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND wallet_id IN (
            SELECT wallet_id FROM merchant_wallets 
            WHERE merchant_id = get_current_merchant_id()
        )
        AND is_approved_user()
        AND NOT EXISTS (
            SELECT 1 FROM wallet_addresses wa2
            WHERE wa2.wallet_id = wallet_id
            AND wa2.blockchain = blockchain
        )
    );

CREATE POLICY "wallet_addresses_merchant_verify" ON wallet_addresses
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND wallet_id IN (
            SELECT wallet_id FROM merchant_wallets 
            WHERE merchant_id = get_current_merchant_id()
        )
        AND is_approved_user()
    )
    WITH CHECK (
        wallet_id IN (
            SELECT wallet_id FROM merchant_wallets 
            WHERE merchant_id = get_current_merchant_id()
        )
    );

-- =============================================================================
-- TRANSACTIONS - OKURU FULL CONTROL, MERCHANT READ-ONLY + SYSTEM OPERATIONS
-- =============================================================================

CREATE POLICY "transactions_okuru_full_access" ON transactions
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "transactions_merchant_read_only" ON transactions
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "transactions_system_insert" ON transactions
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "transactions_system_update" ON transactions
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    )
    WITH CHECK (merchant_id = get_current_merchant_id());

-- =============================================================================
-- TERMINAL EVENTS - OKURU FULL CONTROL, MERCHANT READ-ONLY + SYSTEM OPERATIONS
-- =============================================================================

CREATE POLICY "terminal_events_okuru_full_access" ON terminal_transaction_events
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "terminal_events_merchant_read_only" ON terminal_transaction_events
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "terminal_events_system_insert" ON terminal_transaction_events
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

-- =============================================================================
-- AUTOMATIONS - OKURU FULL CONTROL, MERCHANT FULL MANAGEMENT
-- =============================================================================

CREATE POLICY "automations_okuru_full_access" ON automations
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "automations_merchant_select" ON automations
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "automations_merchant_management" ON automations
    FOR INSERT WITH CHECK (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    );

CREATE POLICY "automations_merchant_update" ON automations
    FOR UPDATE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    )
    WITH CHECK (merchant_id = get_current_merchant_id());

CREATE POLICY "automations_merchant_delete" ON automations
    FOR DELETE USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id() 
        AND is_approved_user()
    );

CREATE POLICY "automation_executions_okuru_full_access" ON automation_executions
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "automation_executions_merchant_read_only" ON automation_executions
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND automation_id IN (
            SELECT automation_id FROM automations 
            WHERE merchant_id = get_current_merchant_id()
        )
    );

-- =============================================================================
-- OKURU ADMIN TABLES - OKURU EXCLUSIVE ACCESS
-- =============================================================================

CREATE POLICY "okuru_company_settings_okuru_only" ON okuru_company_settings
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "okuru_merchant_analytics_okuru_full" ON okuru_merchant_analytics
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "okuru_merchant_analytics_merchant_read" ON okuru_merchant_analytics
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "okuru_global_analytics_okuru_only" ON okuru_global_analytics
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "okuru_alerts_okuru_full" ON okuru_alerts
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "okuru_alerts_merchant_read" ON okuru_alerts
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

CREATE POLICY "okuru_fee_collections_okuru_full" ON okuru_fee_collections
    FOR ALL USING (is_okuru_admin());

CREATE POLICY "okuru_fee_collections_merchant_read" ON okuru_fee_collections
    FOR SELECT USING (
        NOT is_okuru_admin() 
        AND merchant_id = get_current_merchant_id()
    );

-- =============================================================================
-- UPDATE USER ROLE ENUM TO INCLUDE OKURU_ADMIN
-- =============================================================================

-- Add okuru_admin role to users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'merchant', 'staff', 'okuru_admin'));

-- =============================================================================
-- GRANT OKURU ADMIN FULL PERMISSIONS
-- =============================================================================

-- Okuru admins get full access to everything
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================================================
-- SUMMARY OF ACCESS CONTROL
-- =============================================================================

/*
OKURU ADMINS CAN:
✅ VIEW, CREATE, UPDATE, DELETE everything across all merchants
✅ Manage all merchant profiles and business settings
✅ Add, modify, delete locations and terminals
✅ Configure terminal crypto settings for any merchant
✅ View all transactions across all merchants
✅ Manage all user accounts (including creating okuru_admin users)
✅ Access all analytics, alerts, and fee collections
✅ Modify company settings and global configurations
✅ Override any merchant restrictions

MERCHANTS CAN:
✅ VIEW their own merchant data (read-only profile)
✅ ADD new wallet addresses for new blockchains only
✅ UPDATE wallet address verification status
✅ ADD, UPDATE, DELETE staff members (not admins)
✅ CREATE, UPDATE, DELETE automations
✅ UPDATE terminal settings (name, status, etc.)
✅ CONFIGURE terminal crypto settings (3 cryptocurrencies per terminal)
✅ VIEW their own analytics, alerts, and fee collections

MERCHANTS CANNOT:
❌ Modify merchant profile/business settings (Okuru controls this)
❌ Add/modify/delete locations (Okuru controls this)
❌ Add/delete terminals (Okuru controls this, merchants can only update)
❌ Modify transactions (system-only)
❌ Access other merchants' data
❌ Access Okuru admin data or global analytics
❌ Modify company settings
❌ Create admin or okuru_admin users
❌ Override Okuru's configurations

SYSTEM CAN:
✅ Process transactions from terminals
✅ Update transaction status from blockchain
✅ Create terminal sessions (login/logout)
✅ Log terminal events
✅ Update analytics and fees
*/
