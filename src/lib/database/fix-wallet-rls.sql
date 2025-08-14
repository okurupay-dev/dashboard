-- Fix RLS Policies for Wallet Operations
-- Run this in your Supabase SQL Editor to resolve wallet creation issues

-- First, let's check if the tables exist and create them if needed
CREATE TABLE IF NOT EXISTS merchant_wallets (
    wallet_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    web3auth_user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_addresses (
    address_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES merchant_wallets(wallet_id) ON DELETE CASCADE,
    blockchain TEXT NOT NULL,
    address TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_signature TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_id, blockchain)
);

-- Enable RLS on both tables
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "merchant_wallets_select_policy" ON merchant_wallets;
DROP POLICY IF EXISTS "merchant_wallets_insert_policy" ON merchant_wallets;
DROP POLICY IF EXISTS "merchant_wallets_update_policy" ON merchant_wallets;
DROP POLICY IF EXISTS "merchant_wallets_delete_policy" ON merchant_wallets;

DROP POLICY IF EXISTS "wallet_addresses_select_policy" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_insert_policy" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_update_policy" ON wallet_addresses;
DROP POLICY IF EXISTS "wallet_addresses_delete_policy" ON wallet_addresses;

-- Create comprehensive RLS policies for merchant_wallets

-- Allow users to view wallets for their merchant
CREATE POLICY "merchant_wallets_select_policy" ON merchant_wallets
    FOR SELECT USING (
        merchant_id IN (
            SELECT merchant_id FROM users 
            WHERE clerk_user_id = auth.jwt() ->> 'clerk_user_id'
        )
    );

-- Allow authenticated users to create wallets for their merchant
CREATE POLICY "merchant_wallets_insert_policy" ON merchant_wallets
    FOR INSERT WITH CHECK (
        merchant_id IN (
            SELECT merchant_id FROM users 
            WHERE clerk_user_id = auth.jwt() ->> 'clerk_user_id'
            AND approved = true
        )
    );

-- Allow users to update wallets for their merchant
CREATE POLICY "merchant_wallets_update_policy" ON merchant_wallets
    FOR UPDATE USING (
        merchant_id IN (
            SELECT merchant_id FROM users 
            WHERE clerk_user_id = auth.jwt() ->> 'clerk_user_id'
        )
    );

-- Allow users to delete wallets for their merchant (admin only)
CREATE POLICY "merchant_wallets_delete_policy" ON merchant_wallets
    FOR DELETE USING (
        merchant_id IN (
            SELECT merchant_id FROM users 
            WHERE clerk_user_id = auth.jwt() ->> 'clerk_user_id'
            AND role = 'admin'
        )
    );

-- Create comprehensive RLS policies for wallet_addresses

-- Allow users to view addresses for wallets belonging to their merchant
CREATE POLICY "wallet_addresses_select_policy" ON wallet_addresses
    FOR SELECT USING (
        wallet_id IN (
            SELECT w.wallet_id FROM merchant_wallets w
            JOIN users u ON w.merchant_id = u.merchant_id
            WHERE u.clerk_user_id = auth.jwt() ->> 'clerk_user_id'
        )
    );

-- Allow users to create addresses for wallets belonging to their merchant
CREATE POLICY "wallet_addresses_insert_policy" ON wallet_addresses
    FOR INSERT WITH CHECK (
        wallet_id IN (
            SELECT w.wallet_id FROM merchant_wallets w
            JOIN users u ON w.merchant_id = u.merchant_id
            WHERE u.clerk_user_id = auth.jwt() ->> 'clerk_user_id'
            AND u.approved = true
        )
    );

-- Allow users to update addresses for wallets belonging to their merchant
CREATE POLICY "wallet_addresses_update_policy" ON wallet_addresses
    FOR UPDATE USING (
        wallet_id IN (
            SELECT w.wallet_id FROM merchant_wallets w
            JOIN users u ON w.merchant_id = u.merchant_id
            WHERE u.clerk_user_id = auth.jwt() ->> 'clerk_user_id'
        )
    );

-- Allow users to delete addresses for wallets belonging to their merchant (admin only)
CREATE POLICY "wallet_addresses_delete_policy" ON wallet_addresses
    FOR DELETE USING (
        wallet_id IN (
            SELECT w.wallet_id FROM merchant_wallets w
            JOIN users u ON w.merchant_id = u.merchant_id
            WHERE u.clerk_user_id = auth.jwt() ->> 'clerk_user_id'
            AND u.role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merchant_wallets_merchant_id ON merchant_wallets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_wallet_id ON wallet_addresses(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_blockchain ON wallet_addresses(blockchain);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_merchant_wallets_updated_at ON merchant_wallets;
CREATE TRIGGER update_merchant_wallets_updated_at
    BEFORE UPDATE ON merchant_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_addresses TO authenticated;
GRANT USAGE ON SEQUENCE merchant_wallets_wallet_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE wallet_addresses_address_id_seq TO authenticated;

-- Note: The RLS policies above assume that your JWT contains 'clerk_user_id'
-- If your JWT structure is different, you may need to adjust the auth.jwt() ->> 'clerk_user_id' part
-- to match your actual JWT payload structure.

-- To test if the policies work, you can run:
-- SELECT * FROM merchant_wallets; -- Should only show wallets for your merchant
-- INSERT INTO merchant_wallets (merchant_id, web3auth_user_id) VALUES ('your-merchant-id', 'test-user-id');
