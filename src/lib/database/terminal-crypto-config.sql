-- Terminal Crypto Configuration
-- Allows each terminal to accept exactly 3 different cryptocurrencies
-- Merchants can configure which 3 cryptos their terminals accept

-- =============================================================================
-- TERMINAL CRYPTO CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS terminal_crypto_config (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id UUID NOT NULL REFERENCES terminals(terminal_id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Crypto 1 Configuration
    crypto_1 VARCHAR(10) NOT NULL, -- e.g., 'BTC'
    crypto_1_blockchain VARCHAR(20) NOT NULL, -- e.g., 'bitcoin'
    crypto_1_enabled BOOLEAN DEFAULT true,
    crypto_1_min_amount DECIMAL(18,8) DEFAULT 0.00001,
    crypto_1_max_amount DECIMAL(18,8) DEFAULT 1000000,
    
    -- Crypto 2 Configuration  
    crypto_2 VARCHAR(10) NOT NULL, -- e.g., 'ETH'
    crypto_2_blockchain VARCHAR(20) NOT NULL, -- e.g., 'ethereum'
    crypto_2_enabled BOOLEAN DEFAULT true,
    crypto_2_min_amount DECIMAL(18,8) DEFAULT 0.001,
    crypto_2_max_amount DECIMAL(18,8) DEFAULT 1000000,
    
    -- Crypto 3 Configuration
    crypto_3 VARCHAR(10) NOT NULL, -- e.g., 'USDC'
    crypto_3_blockchain VARCHAR(20) NOT NULL, -- e.g., 'ethereum'
    crypto_3_enabled BOOLEAN DEFAULT true,
    crypto_3_min_amount DECIMAL(18,8) DEFAULT 1.0,
    crypto_3_max_amount DECIMAL(18,8) DEFAULT 1000000,
    
    -- Metadata
    configured_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT terminal_crypto_config_unique_terminal UNIQUE(terminal_id),
    CONSTRAINT terminal_crypto_config_different_cryptos CHECK (
        crypto_1 != crypto_2 AND 
        crypto_2 != crypto_3 AND 
        crypto_1 != crypto_3
    ),
    CONSTRAINT terminal_crypto_config_valid_amounts CHECK (
        crypto_1_min_amount > 0 AND crypto_1_max_amount > crypto_1_min_amount AND
        crypto_2_min_amount > 0 AND crypto_2_max_amount > crypto_2_min_amount AND
        crypto_3_min_amount > 0 AND crypto_3_max_amount > crypto_3_min_amount
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_terminal_crypto_config_terminal_id ON terminal_crypto_config(terminal_id);
CREATE INDEX IF NOT EXISTS idx_terminal_crypto_config_merchant_id ON terminal_crypto_config(merchant_id);

-- =============================================================================
-- CRYPTO VALIDATION FUNCTIONS
-- =============================================================================

-- Function to check if a crypto is configured for a terminal
CREATE OR REPLACE FUNCTION is_crypto_configured_for_terminal(
    p_terminal_id UUID,
    p_crypto VARCHAR(10),
    p_blockchain VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config_exists BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM terminal_crypto_config 
        WHERE terminal_id = p_terminal_id
        AND (
            (crypto_1 = p_crypto AND crypto_1_blockchain = p_blockchain AND crypto_1_enabled = true) OR
            (crypto_2 = p_crypto AND crypto_2_blockchain = p_blockchain AND crypto_2_enabled = true) OR
            (crypto_3 = p_crypto AND crypto_3_blockchain = p_blockchain AND crypto_3_enabled = true)
        )
    ) INTO v_config_exists;
    
    RETURN v_config_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get terminal crypto configuration
CREATE OR REPLACE FUNCTION get_terminal_crypto_config(p_terminal_id UUID)
RETURNS TABLE(
    crypto VARCHAR(10),
    blockchain VARCHAR(20),
    enabled BOOLEAN,
    min_amount DECIMAL(18,8),
    max_amount DECIMAL(18,8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcc.crypto_1 as crypto, tcc.crypto_1_blockchain as blockchain, 
        tcc.crypto_1_enabled as enabled, tcc.crypto_1_min_amount as min_amount, tcc.crypto_1_max_amount as max_amount
    FROM terminal_crypto_config tcc WHERE tcc.terminal_id = p_terminal_id
    UNION ALL
    SELECT 
        tcc.crypto_2 as crypto, tcc.crypto_2_blockchain as blockchain,
        tcc.crypto_2_enabled as enabled, tcc.crypto_2_min_amount as min_amount, tcc.crypto_2_max_amount as max_amount
    FROM terminal_crypto_config tcc WHERE tcc.terminal_id = p_terminal_id
    UNION ALL
    SELECT 
        tcc.crypto_3 as crypto, tcc.crypto_3_blockchain as blockchain,
        tcc.crypto_3_enabled as enabled, tcc.crypto_3_min_amount as min_amount, tcc.crypto_3_max_amount as max_amount
    FROM terminal_crypto_config tcc WHERE tcc.terminal_id = p_terminal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate crypto amount for terminal
CREATE OR REPLACE FUNCTION validate_crypto_amount_for_terminal(
    p_terminal_id UUID,
    p_crypto VARCHAR(10),
    p_blockchain VARCHAR(20),
    p_amount DECIMAL(18,8)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_min_amount DECIMAL(18,8);
    v_max_amount DECIMAL(18,8);
    v_enabled BOOLEAN;
BEGIN
    -- Get the crypto configuration for this terminal
    SELECT 
        CASE 
            WHEN crypto_1 = p_crypto AND crypto_1_blockchain = p_blockchain THEN crypto_1_min_amount
            WHEN crypto_2 = p_crypto AND crypto_2_blockchain = p_blockchain THEN crypto_2_min_amount
            WHEN crypto_3 = p_crypto AND crypto_3_blockchain = p_blockchain THEN crypto_3_min_amount
            ELSE NULL
        END,
        CASE 
            WHEN crypto_1 = p_crypto AND crypto_1_blockchain = p_blockchain THEN crypto_1_max_amount
            WHEN crypto_2 = p_crypto AND crypto_2_blockchain = p_blockchain THEN crypto_2_max_amount
            WHEN crypto_3 = p_crypto AND crypto_3_blockchain = p_blockchain THEN crypto_3_max_amount
            ELSE NULL
        END,
        CASE 
            WHEN crypto_1 = p_crypto AND crypto_1_blockchain = p_blockchain THEN crypto_1_enabled
            WHEN crypto_2 = p_crypto AND crypto_2_blockchain = p_blockchain THEN crypto_2_enabled
            WHEN crypto_3 = p_crypto AND crypto_3_blockchain = p_blockchain THEN crypto_3_enabled
            ELSE false
        END
    INTO v_min_amount, v_max_amount, v_enabled
    FROM terminal_crypto_config 
    WHERE terminal_id = p_terminal_id;
    
    -- Return false if crypto not configured or disabled
    IF v_min_amount IS NULL OR v_enabled = false THEN
        RETURN false;
    END IF;
    
    -- Check if amount is within range
    RETURN (p_amount >= v_min_amount AND p_amount <= v_max_amount);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEFAULT CRYPTO CONFIGURATIONS
-- =============================================================================

-- Insert default crypto configurations for existing terminals
-- This will set up BTC, ETH, USDC as defaults for all existing terminals
INSERT INTO terminal_crypto_config (
    terminal_id, 
    merchant_id,
    crypto_1, crypto_1_blockchain, crypto_1_min_amount, crypto_1_max_amount,
    crypto_2, crypto_2_blockchain, crypto_2_min_amount, crypto_2_max_amount,
    crypto_3, crypto_3_blockchain, crypto_3_min_amount, crypto_3_max_amount
)
SELECT 
    t.terminal_id,
    t.merchant_id,
    'BTC', 'bitcoin', 0.00001, 1.0,
    'ETH', 'ethereum', 0.001, 10.0,
    'USDC', 'ethereum', 1.0, 10000.0
FROM terminals t
WHERE NOT EXISTS (
    SELECT 1 FROM terminal_crypto_config tcc 
    WHERE tcc.terminal_id = t.terminal_id
);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_terminal_crypto_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_terminal_crypto_config_updated_at ON terminal_crypto_config;
CREATE TRIGGER trigger_update_terminal_crypto_config_updated_at
    BEFORE UPDATE ON terminal_crypto_config
    FOR EACH ROW
    EXECUTE FUNCTION update_terminal_crypto_config_updated_at();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant permissions for authenticated users
GRANT SELECT ON terminal_crypto_config TO authenticated;
GRANT EXECUTE ON FUNCTION is_crypto_configured_for_terminal(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_terminal_crypto_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_crypto_amount_for_terminal(UUID, VARCHAR, VARCHAR, DECIMAL) TO authenticated;

-- =============================================================================
-- EXAMPLE USAGE
-- =============================================================================

/*
-- Example: Configure a terminal to accept BTC, ETH, and USDC
INSERT INTO terminal_crypto_config (
    terminal_id, merchant_id,
    crypto_1, crypto_1_blockchain, crypto_1_min_amount, crypto_1_max_amount,
    crypto_2, crypto_2_blockchain, crypto_2_min_amount, crypto_2_max_amount,
    crypto_3, crypto_3_blockchain, crypto_3_min_amount, crypto_3_max_amount,
    configured_by
) VALUES (
    'terminal-uuid-here',
    'merchant-uuid-here',
    'BTC', 'bitcoin', 0.00001, 1.0,
    'ETH', 'ethereum', 0.001, 10.0,
    'USDC', 'ethereum', 1.0, 10000.0,
    'user-uuid-here'
);

-- Example: Check if BTC is configured for a terminal
SELECT is_crypto_configured_for_terminal('terminal-uuid', 'BTC', 'bitcoin');

-- Example: Get all crypto configurations for a terminal
SELECT * FROM get_terminal_crypto_config('terminal-uuid');

-- Example: Validate transaction amount
SELECT validate_crypto_amount_for_terminal('terminal-uuid', 'BTC', 'bitcoin', 0.001);
*/
