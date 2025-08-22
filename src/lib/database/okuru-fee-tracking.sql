-- Okuru Business Fee Tracking System
-- Tracks 1% processing fees collected from merchants for revenue reporting

-- 1. Add fee tracking columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS okuru_fee_rate DECIMAL(5,4) DEFAULT 0.0100,  -- 1% = 0.0100
ADD COLUMN IF NOT EXISTS okuru_fee_fiat DECIMAL(15,2),                -- Fee in fiat currency
ADD COLUMN IF NOT EXISTS okuru_fee_crypto DECIMAL(30,18),             -- Fee in crypto
ADD COLUMN IF NOT EXISTS okuru_fee_collected BOOLEAN DEFAULT false,   -- Has fee been collected?
ADD COLUMN IF NOT EXISTS okuru_fee_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS merchant_net_amount_fiat DECIMAL(15,2),      -- Amount after Okuru fee
ADD COLUMN IF NOT EXISTS merchant_net_amount_crypto DECIMAL(30,18);   -- Crypto amount after fee

-- 2. Create Okuru Fee Collections table for detailed tracking
CREATE TABLE IF NOT EXISTS okuru_fee_collections (
    collection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Fee details
    fee_rate DECIMAL(5,4) NOT NULL,           -- 0.0100 for 1%
    gross_amount_fiat DECIMAL(15,2) NOT NULL, -- Original transaction amount
    fee_amount_fiat DECIMAL(15,2) NOT NULL,   -- Okuru's fee in fiat
    fee_amount_crypto DECIMAL(30,18) NOT NULL, -- Okuru's fee in crypto
    net_amount_fiat DECIMAL(15,2) NOT NULL,   -- Merchant gets this amount
    net_amount_crypto DECIMAL(30,18) NOT NULL, -- Merchant gets this crypto
    
    -- Collection details
    collection_method VARCHAR(50) DEFAULT 'automatic', -- automatic, manual, batch
    collection_status VARCHAR(20) DEFAULT 'pending' CHECK (collection_status IN ('pending', 'collected', 'failed', 'disputed')),
    collection_tx_hash VARCHAR(255),          -- Blockchain transaction for fee collection
    
    -- Currency and blockchain
    fiat_currency VARCHAR(10) NOT NULL,
    crypto_currency VARCHAR(20) NOT NULL,
    blockchain VARCHAR(50) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Okuru Revenue Summary table for business reporting
CREATE TABLE IF NOT EXISTS okuru_revenue_summary (
    summary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Revenue totals
    total_transactions_processed INTEGER DEFAULT 0,
    total_gross_volume_fiat DECIMAL(20,2) DEFAULT 0,
    total_fees_collected_fiat DECIMAL(20,2) DEFAULT 0,
    average_fee_rate DECIMAL(5,4) DEFAULT 0.0100,
    
    -- Breakdown by currency
    btc_volume DECIMAL(30,18) DEFAULT 0,
    btc_fees_collected DECIMAL(30,18) DEFAULT 0,
    eth_volume DECIMAL(30,18) DEFAULT 0,
    eth_fees_collected DECIMAL(30,18) DEFAULT 0,
    usdc_volume DECIMAL(30,18) DEFAULT 0,
    usdc_fees_collected DECIMAL(30,18) DEFAULT 0,
    
    -- Merchant breakdown
    total_active_merchants INTEGER DEFAULT 0,
    top_merchant_id UUID REFERENCES merchants(merchant_id),
    top_merchant_volume DECIMAL(20,2) DEFAULT 0,
    
    -- Status
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(period_type, period_start, period_end)
);

-- 4. Function to calculate and apply Okuru fees
CREATE OR REPLACE FUNCTION calculate_okuru_fees(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_transaction RECORD;
    v_okuru_fee_fiat DECIMAL(15,2);
    v_okuru_fee_crypto DECIMAL(30,18);
    v_merchant_net_fiat DECIMAL(15,2);
    v_merchant_net_crypto DECIMAL(30,18);
    v_fee_rate DECIMAL(5,4) := 0.0100; -- 1%
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM transactions
    WHERE transaction_id = p_transaction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;
    
    -- Calculate Okuru fees (1% of transaction amount)
    v_okuru_fee_fiat := v_transaction.amount_fiat * v_fee_rate;
    v_okuru_fee_crypto := v_transaction.amount_crypto * v_fee_rate;
    
    -- Calculate net amounts for merchant
    v_merchant_net_fiat := v_transaction.amount_fiat - v_okuru_fee_fiat;
    v_merchant_net_crypto := v_transaction.amount_crypto - v_okuru_fee_crypto;
    
    -- Update transaction with fee calculations
    UPDATE transactions 
    SET 
        okuru_fee_rate = v_fee_rate,
        okuru_fee_fiat = v_okuru_fee_fiat,
        okuru_fee_crypto = v_okuru_fee_crypto,
        merchant_net_amount_fiat = v_merchant_net_fiat,
        merchant_net_amount_crypto = v_merchant_net_crypto,
        updated_at = NOW()
    WHERE transaction_id = p_transaction_id;
    
    -- Create fee collection record
    INSERT INTO okuru_fee_collections (
        transaction_id, merchant_id, fee_rate,
        gross_amount_fiat, fee_amount_fiat, fee_amount_crypto,
        net_amount_fiat, net_amount_crypto,
        fiat_currency, crypto_currency, blockchain
    ) VALUES (
        p_transaction_id, v_transaction.merchant_id, v_fee_rate,
        v_transaction.amount_fiat, v_okuru_fee_fiat, v_okuru_fee_crypto,
        v_merchant_net_fiat, v_merchant_net_crypto,
        v_transaction.fiat_currency, v_transaction.crypto_currency, v_transaction.blockchain
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to mark fee as collected
CREATE OR REPLACE FUNCTION mark_okuru_fee_collected(
    p_collection_id UUID,
    p_collection_tx_hash VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Update collection record
    UPDATE okuru_fee_collections 
    SET 
        collection_status = 'collected',
        collection_tx_hash = p_collection_tx_hash,
        collected_at = NOW(),
        updated_at = NOW()
    WHERE collection_id = p_collection_id
    RETURNING transaction_id INTO v_transaction_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update transaction record
    UPDATE transactions 
    SET 
        okuru_fee_collected = true,
        okuru_fee_collected_at = NOW(),
        updated_at = NOW()
    WHERE transaction_id = v_transaction_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to generate Okuru revenue report
CREATE OR REPLACE FUNCTION generate_okuru_revenue_report(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'period', json_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days', p_end_date - p_start_date + 1
        ),
        'revenue_summary', json_build_object(
            'total_transactions', COUNT(*),
            'total_gross_volume_fiat', COALESCE(SUM(t.amount_fiat), 0),
            'total_okuru_fees_fiat', COALESCE(SUM(t.okuru_fee_fiat), 0),
            'total_merchant_net_fiat', COALESCE(SUM(t.merchant_net_amount_fiat), 0),
            'average_transaction_size', COALESCE(AVG(t.amount_fiat), 0),
            'average_okuru_fee', COALESCE(AVG(t.okuru_fee_fiat), 0)
        ),
        'collection_status', json_build_object(
            'fees_collected', COUNT(CASE WHEN t.okuru_fee_collected = true THEN 1 END),
            'fees_pending', COUNT(CASE WHEN t.okuru_fee_collected = false THEN 1 END),
            'collection_rate', 
                CASE 
                    WHEN COUNT(*) > 0 THEN 
                        ROUND(COUNT(CASE WHEN t.okuru_fee_collected = true THEN 1 END) * 100.0 / COUNT(*), 2)
                    ELSE 0 
                END
        ),
        'currency_breakdown', (
            SELECT json_agg(
                json_build_object(
                    'crypto_currency', crypto_currency,
                    'transaction_count', COUNT(*),
                    'total_volume_crypto', SUM(amount_crypto),
                    'okuru_fees_crypto', SUM(okuru_fee_crypto),
                    'total_volume_fiat', SUM(amount_fiat),
                    'okuru_fees_fiat', SUM(okuru_fee_fiat)
                )
            ) FROM (
                SELECT 
                    crypto_currency,
                    COUNT(*),
                    SUM(amount_crypto),
                    SUM(okuru_fee_crypto),
                    SUM(amount_fiat),
                    SUM(okuru_fee_fiat)
                FROM transactions 
                WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
                AND okuru_fee_fiat IS NOT NULL
                GROUP BY crypto_currency
            ) currency_stats
        ),
        'top_merchants', (
            SELECT json_agg(
                json_build_object(
                    'merchant_id', merchant_id,
                    'merchant_name', (SELECT name FROM merchants WHERE merchant_id = t.merchant_id),
                    'transaction_count', COUNT(*),
                    'total_volume_fiat', SUM(amount_fiat),
                    'okuru_fees_generated', SUM(okuru_fee_fiat)
                )
            ) FROM (
                SELECT 
                    merchant_id,
                    COUNT(*),
                    SUM(amount_fiat),
                    SUM(okuru_fee_fiat)
                FROM transactions 
                WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
                AND okuru_fee_fiat IS NOT NULL
                GROUP BY merchant_id
                ORDER BY SUM(okuru_fee_fiat) DESC
                LIMIT 10
            ) t
        )
    ) INTO v_result
    FROM transactions t
    WHERE DATE(t.created_at) BETWEEN p_start_date AND p_end_date
    AND t.okuru_fee_fiat IS NOT NULL;
    
    RETURN COALESCE(v_result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update the process_terminal_transaction function to include fee calculation
CREATE OR REPLACE FUNCTION process_terminal_transaction_with_fees(
    p_terminal_id UUID,
    p_session_id UUID,
    p_amount_fiat DECIMAL(15,2),
    p_fiat_currency VARCHAR(10),
    p_crypto_currency VARCHAR(20),
    p_blockchain VARCHAR(50),
    p_customer_wallet_address VARCHAR(255),
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_merchant_id UUID;
    v_location_id UUID;
    v_user_id UUID;
    v_crypto_amount DECIMAL(30,18);
    v_wallet_address VARCHAR(255);
    v_okuru_fee_fiat DECIMAL(15,2);
    v_okuru_fee_crypto DECIMAL(30,18);
    v_merchant_net_fiat DECIMAL(15,2);
    v_merchant_net_crypto DECIMAL(30,18);
    v_fee_rate DECIMAL(5,4) := 0.0100; -- 1%
BEGIN
    -- 1. Validate terminal session
    IF NOT validate_terminal_session(p_session_id) THEN
        RAISE EXCEPTION 'Invalid or expired terminal session';
    END IF;
    
    -- 2. Get terminal and session details
    SELECT 
        t.merchant_id, t.location_id, ts.user_id
    INTO 
        v_merchant_id, v_location_id, v_user_id
    FROM terminals t
    JOIN terminal_sessions ts ON ts.terminal_id = t.terminal_id
    WHERE t.terminal_id = p_terminal_id 
    AND ts.session_id = p_session_id
    AND ts.status = 'active';
    
    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Terminal or session not found';
    END IF;
    
    -- 3. Get merchant wallet address for the specified blockchain
    SELECT wa.address INTO v_wallet_address
    FROM merchant_wallets mw
    JOIN wallet_addresses wa ON mw.wallet_id = wa.wallet_id
    WHERE mw.merchant_id = v_merchant_id
    AND wa.blockchain = p_blockchain
    AND wa.is_verified = true
    LIMIT 1;
    
    IF v_wallet_address IS NULL THEN
        RAISE EXCEPTION 'No verified wallet address found for blockchain: %', p_blockchain;
    END IF;
    
    -- 4. Calculate crypto amount (simplified - in real implementation, use live rates)
    v_crypto_amount := p_amount_fiat;
    
    -- 5. Calculate Okuru fees
    v_okuru_fee_fiat := p_amount_fiat * v_fee_rate;
    v_okuru_fee_crypto := v_crypto_amount * v_fee_rate;
    v_merchant_net_fiat := p_amount_fiat - v_okuru_fee_fiat;
    v_merchant_net_crypto := v_crypto_amount - v_okuru_fee_crypto;
    
    -- 6. Create transaction record with fees
    INSERT INTO transactions (
        merchant_id, location_id, terminal_id, terminal_session_id,
        staff_user_id, processed_by_user_id,
        amount_fiat, fiat_currency, amount_crypto, crypto_currency,
        blockchain, status, notes,
        okuru_fee_rate, okuru_fee_fiat, okuru_fee_crypto,
        merchant_net_amount_fiat, merchant_net_amount_crypto,
        dashboard_updated_at
    ) VALUES (
        v_merchant_id, v_location_id, p_terminal_id, p_session_id,
        v_user_id, v_user_id,
        p_amount_fiat, p_fiat_currency, v_crypto_amount, p_crypto_currency,
        p_blockchain, 'pending', p_notes,
        v_fee_rate, v_okuru_fee_fiat, v_okuru_fee_crypto,
        v_merchant_net_fiat, v_merchant_net_crypto,
        NOW()
    ) RETURNING transaction_id INTO v_transaction_id;
    
    -- 7. Create fee collection record
    INSERT INTO okuru_fee_collections (
        transaction_id, merchant_id, fee_rate,
        gross_amount_fiat, fee_amount_fiat, fee_amount_crypto,
        net_amount_fiat, net_amount_crypto,
        fiat_currency, crypto_currency, blockchain
    ) VALUES (
        v_transaction_id, v_merchant_id, v_fee_rate,
        p_amount_fiat, v_okuru_fee_fiat, v_okuru_fee_crypto,
        v_merchant_net_fiat, v_merchant_net_crypto,
        p_fiat_currency, p_crypto_currency, p_blockchain
    );
    
    -- 8. Create transaction event
    INSERT INTO terminal_transaction_events (
        transaction_id, terminal_id, merchant_id, event_type, event_data
    ) VALUES (
        v_transaction_id, p_terminal_id, v_merchant_id, 'transaction_initiated',
        jsonb_build_object(
            'gross_amount_fiat', p_amount_fiat,
            'okuru_fee_fiat', v_okuru_fee_fiat,
            'merchant_net_fiat', v_merchant_net_fiat,
            'crypto_currency', p_crypto_currency,
            'blockchain', p_blockchain,
            'merchant_wallet', v_wallet_address,
            'customer_wallet', p_customer_wallet_address,
            'processed_by', v_user_id
        )
    );
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_okuru_fee_collections_merchant ON okuru_fee_collections(merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_okuru_fee_collections_status ON okuru_fee_collections(collection_status);
CREATE INDEX IF NOT EXISTS idx_transactions_okuru_fees ON transactions(okuru_fee_collected, created_at);
CREATE INDEX IF NOT EXISTS idx_okuru_revenue_period ON okuru_revenue_summary(period_type, period_start, period_end);

-- 9. Enable RLS on new tables
ALTER TABLE okuru_fee_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE okuru_revenue_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Okuru admin access only for revenue data)
CREATE POLICY "okuru_fee_collections_merchant_access" ON okuru_fee_collections
    FOR SELECT USING (merchant_id = get_current_merchant_id());

-- Revenue summary should be restricted to Okuru admins only
CREATE POLICY "okuru_revenue_admin_only" ON okuru_revenue_summary
    FOR ALL USING (false); -- Will need special admin role for Okuru team

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON okuru_fee_collections TO authenticated;
GRANT SELECT ON okuru_revenue_summary TO authenticated;

-- Example usage:
-- 1. Process transaction with automatic fee calculation:
-- SELECT process_terminal_transaction_with_fees(
--     'terminal-uuid', 'session-uuid', 100.00, 'USD', 'BTC', 'bitcoin', 
--     'customer-wallet', 'Coffee purchase'
-- );
-- Result: $100 transaction → $1 Okuru fee → $99 to merchant

-- 2. Mark fee as collected:
-- SELECT mark_okuru_fee_collected('collection-uuid', 'blockchain-tx-hash');

-- 3. Generate revenue report:
-- SELECT generate_okuru_revenue_report('2024-01-01', '2024-01-31');

-- This ensures Okuru tracks every 1% fee for business revenue reporting!
