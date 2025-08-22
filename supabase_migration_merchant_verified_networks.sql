-- Migration: Create merchant_verified_networks table
-- This table stores verified wallet addresses for merchants per network

CREATE TABLE IF NOT EXISTS merchant_verified_networks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL,
    network_name VARCHAR(50) NOT NULL,
    chain_id INTEGER NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    message TEXT NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_merchant_network UNIQUE (merchant_id, network_name, wallet_address),
    CONSTRAINT valid_ethereum_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merchant_verified_networks_merchant_id 
    ON merchant_verified_networks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_verified_networks_network 
    ON merchant_verified_networks(network_name, chain_id);
CREATE INDEX IF NOT EXISTS idx_merchant_verified_networks_address 
    ON merchant_verified_networks(wallet_address);

-- Add RLS (Row Level Security) policies
ALTER TABLE merchant_verified_networks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own merchant's verified networks
CREATE POLICY "Users can view own merchant verified networks" ON merchant_verified_networks
    FOR SELECT USING (
        merchant_id IN (
            SELECT merchant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Policy: Users can insert verified networks for their own merchant
CREATE POLICY "Users can insert own merchant verified networks" ON merchant_verified_networks
    FOR INSERT WITH CHECK (
        merchant_id IN (
            SELECT merchant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Policy: Users cannot update or delete verified networks (immutable)
-- This ensures wallet addresses remain immutable once verified

-- Add comments for documentation
COMMENT ON TABLE merchant_verified_networks IS 'Stores verified wallet addresses for merchants per blockchain network';
COMMENT ON COLUMN merchant_verified_networks.merchant_id IS 'Reference to the merchant who owns this verified address';
COMMENT ON COLUMN merchant_verified_networks.network_name IS 'Human-readable network name (e.g., Ethereum, Polygon)';
COMMENT ON COLUMN merchant_verified_networks.chain_id IS 'Blockchain chain ID (e.g., 1 for Ethereum mainnet)';
COMMENT ON COLUMN merchant_verified_networks.wallet_address IS 'Verified wallet address (42-character hex string)';
COMMENT ON COLUMN merchant_verified_networks.signature IS 'Cryptographic signature proving ownership';
COMMENT ON COLUMN merchant_verified_networks.message IS 'Original message that was signed';
COMMENT ON COLUMN merchant_verified_networks.verified_at IS 'Timestamp when the address was verified';
