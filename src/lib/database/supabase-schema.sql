-- OkuruDash Supabase Database Schema
-- Secure multi-tenant crypto payment processing dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants Table
CREATE TABLE merchants (
    merchant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    business_address TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Users Table (linked to Clerk authentication)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'merchant', 'staff')),
    employee_id VARCHAR(50),
    pin_hash VARCHAR(255), -- Hashed PIN for terminal access
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations Table
CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminals Table
CREATE TABLE terminals (
    terminal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    pairing_code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance')),
    firmware_version VARCHAR(50),
    ip_address INET,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Merchant Wallets Table (Web3Auth integration)
CREATE TABLE merchant_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    web3auth_user_id VARCHAR(255) UNIQUE, -- Web3Auth user identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(merchant_id) -- One wallet per merchant
);

-- Wallet Addresses Table (per-chain addresses)
CREATE TABLE wallet_addresses (
    address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES merchant_wallets(wallet_id) ON DELETE CASCADE,
    blockchain VARCHAR(50) NOT NULL, -- ethereum, polygon, bsc, etc.
    address VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verification_signature TEXT, -- Signature proving ownership
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_id, blockchain) -- One address per chain per wallet
);

-- Transactions Table
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
    terminal_id UUID REFERENCES terminals(terminal_id) ON DELETE SET NULL,
    staff_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    amount_fiat DECIMAL(15,2) NOT NULL,
    fiat_currency VARCHAR(10) NOT NULL,
    amount_crypto DECIMAL(30,18) NOT NULL,
    crypto_currency VARCHAR(20) NOT NULL,
    blockchain VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 1,
    fee DECIMAL(30,18),
    tip DECIMAL(15,2),
    notes TEXT,
    automation_triggered BOOLEAN DEFAULT false,
    automation_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automations Table
CREATE TABLE automations (
    automation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(20) NOT NULL, -- BTC, ETH, etc.
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('convert', 'transfer', 'split', 'swap')),
    condition_type VARCHAR(50) NOT NULL,
    condition_value DECIMAL(30,18) NOT NULL,
    action_description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Executions Table (audit trail)
CREATE TABLE automation_executions (
    execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_id UUID NOT NULL REFERENCES automations(automation_id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_merchant_id ON users(merchant_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_wallet_addresses_wallet_id ON wallet_addresses(wallet_id);
CREATE INDEX idx_terminals_merchant_id ON terminals(merchant_id);
CREATE INDEX idx_automations_merchant_id ON automations(merchant_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Function to get current user's merchant_id from JWT
CREATE OR REPLACE FUNCTION get_current_merchant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'merchant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Merchants RLS Policies
CREATE POLICY "Users can view their own merchant" ON merchants
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can update their merchant" ON merchants
  FOR UPDATE USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Users RLS Policies
CREATE POLICY "Users can view users in their merchant" ON users
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can insert users in their merchant" ON users
  FOR INSERT WITH CHECK (merchant_id = get_current_merchant_id() AND is_admin());

CREATE POLICY "Admins can update users in their merchant" ON users
  FOR UPDATE USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Locations RLS Policies
CREATE POLICY "Users can view locations in their merchant" ON locations
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can manage locations in their merchant" ON locations
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Terminals RLS Policies
CREATE POLICY "Users can view terminals in their merchant" ON terminals
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can manage terminals in their merchant" ON terminals
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Merchant Wallets RLS Policies
CREATE POLICY "Users can view wallets in their merchant" ON merchant_wallets
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can manage wallets in their merchant" ON merchant_wallets
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Wallet Addresses RLS Policies
CREATE POLICY "Users can view wallet addresses in their merchant" ON wallet_addresses
  FOR SELECT USING (
    wallet_id IN (
      SELECT wallet_id FROM merchant_wallets 
      WHERE merchant_id = get_current_merchant_id()
    )
  );

CREATE POLICY "Admins can manage wallet addresses in their merchant" ON wallet_addresses
  FOR ALL USING (
    wallet_id IN (
      SELECT wallet_id FROM merchant_wallets 
      WHERE merchant_id = get_current_merchant_id() AND is_admin()
    )
  );

-- Transactions RLS Policies
CREATE POLICY "Users can view transactions in their merchant" ON transactions
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Users can insert transactions in their merchant" ON transactions
  FOR INSERT WITH CHECK (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can update transactions in their merchant" ON transactions
  FOR UPDATE USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Automations RLS Policies
CREATE POLICY "Users can view automations in their merchant" ON automations
  FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "Admins can manage automations in their merchant" ON automations
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Automation Executions RLS Policies
CREATE POLICY "Users can view automation executions in their merchant" ON automation_executions
  FOR SELECT USING (
    automation_id IN (
      SELECT automation_id FROM automations 
      WHERE merchant_id = get_current_merchant_id()
    )
  );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_terminals_updated_at BEFORE UPDATE ON terminals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchant_wallets_updated_at BEFORE UPDATE ON merchant_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
