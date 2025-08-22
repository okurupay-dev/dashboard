-- Complete Terminal-to-Dashboard Integration
-- Ensures seamless data flow: Terminal → Transaction → Database → Merchant → Dashboard

-- 1. Enhanced Transactions table with complete audit trail
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS terminal_session_id UUID REFERENCES terminal_sessions(session_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS processed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_receipt_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS merchant_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dashboard_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Create Terminal Transaction Events table for real-time updates
CREATE TABLE IF NOT EXISTS terminal_transaction_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    terminal_id UUID NOT NULL REFERENCES terminals(terminal_id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'transaction_initiated', 'payment_received', 'confirmation_pending',
        'transaction_confirmed', 'transaction_failed', 'refund_initiated',
        'refund_completed', 'automation_triggered'
    )),
    event_data JSONB,
    
    -- Real-time sync
    dashboard_synced BOOLEAN DEFAULT false,
    webhook_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create comprehensive view for dashboard data
CREATE OR REPLACE VIEW dashboard_transaction_view AS
SELECT 
    t.transaction_id,
    t.merchant_id,
    t.location_id,
    t.terminal_id,
    t.amount_fiat,
    t.fiat_currency,
    t.amount_crypto,
    t.crypto_currency,
    t.blockchain,
    t.tx_hash,
    t.status,
    t.confirmations,
    t.required_confirmations,
    t.fee,
    t.tip,
    t.automation_triggered,
    t.automation_type,
    t.created_at,
    t.updated_at,
    
    -- Terminal information
    term.name as terminal_name,
    term.status as terminal_status,
    
    -- Location information
    loc.name as location_name,
    loc.address as location_address,
    
    -- Staff information (who processed the transaction)
    staff.name as processed_by_name,
    staff.employee_id as processed_by_employee_id,
    staff.role as processed_by_role,
    
    -- Session information
    ts.started_at as session_started_at,
    ts.auth_method as session_auth_method,
    
    -- Merchant information
    m.name as merchant_name,
    m.logo_url as merchant_logo_url
    
FROM transactions t
LEFT JOIN terminals term ON t.terminal_id = term.terminal_id
LEFT JOIN locations loc ON t.location_id = loc.location_id
LEFT JOIN users staff ON t.processed_by_user_id = staff.user_id
LEFT JOIN terminal_sessions ts ON t.terminal_session_id = ts.session_id
LEFT JOIN merchants m ON t.merchant_id = m.merchant_id;

-- 4. Function to process terminal transaction (complete flow)
CREATE OR REPLACE FUNCTION process_terminal_transaction(
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
    -- For now, using 1:1 ratio - replace with actual price feed
    v_crypto_amount := p_amount_fiat;
    
    -- 5. Create transaction record
    INSERT INTO transactions (
        merchant_id, location_id, terminal_id, terminal_session_id,
        staff_user_id, processed_by_user_id,
        amount_fiat, fiat_currency, amount_crypto, crypto_currency,
        blockchain, status, notes, dashboard_updated_at
    ) VALUES (
        v_merchant_id, v_location_id, p_terminal_id, p_session_id,
        v_user_id, v_user_id,
        p_amount_fiat, p_fiat_currency, v_crypto_amount, p_crypto_currency,
        p_blockchain, 'pending', p_notes, NOW()
    ) RETURNING transaction_id INTO v_transaction_id;
    
    -- 6. Create transaction event for real-time updates
    INSERT INTO terminal_transaction_events (
        transaction_id, terminal_id, merchant_id, event_type, event_data
    ) VALUES (
        v_transaction_id, p_terminal_id, v_merchant_id, 'transaction_initiated',
        jsonb_build_object(
            'amount_fiat', p_amount_fiat,
            'crypto_currency', p_crypto_currency,
            'blockchain', p_blockchain,
            'merchant_wallet', v_wallet_address,
            'customer_wallet', p_customer_wallet_address,
            'processed_by', v_user_id
        )
    );
    
    -- 7. Update terminal last activity
    UPDATE terminals 
    SET last_heartbeat = NOW()
    WHERE terminal_id = p_terminal_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update transaction status (from blockchain confirmations)
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_transaction_id UUID,
    p_tx_hash VARCHAR(255),
    p_confirmations INTEGER,
    p_status VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_merchant_id UUID;
    v_terminal_id UUID;
    v_old_status VARCHAR(20);
BEGIN
    -- Get current transaction details
    SELECT merchant_id, terminal_id, status 
    INTO v_merchant_id, v_terminal_id, v_old_status
    FROM transactions 
    WHERE transaction_id = p_transaction_id;
    
    IF v_merchant_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update transaction
    UPDATE transactions 
    SET 
        tx_hash = COALESCE(p_tx_hash, tx_hash),
        confirmations = p_confirmations,
        status = p_status,
        updated_at = NOW(),
        dashboard_updated_at = NOW()
    WHERE transaction_id = p_transaction_id;
    
    -- Create event if status changed
    IF v_old_status != p_status THEN
        INSERT INTO terminal_transaction_events (
            transaction_id, terminal_id, merchant_id, event_type, event_data
        ) VALUES (
            p_transaction_id, v_terminal_id, v_merchant_id, 
            CASE p_status
                WHEN 'completed' THEN 'transaction_confirmed'
                WHEN 'failed' THEN 'transaction_failed'
                ELSE 'confirmation_pending'
            END,
            jsonb_build_object(
                'tx_hash', p_tx_hash,
                'confirmations', p_confirmations,
                'old_status', v_old_status,
                'new_status', p_status
            )
        );
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get real-time dashboard data
CREATE OR REPLACE FUNCTION get_merchant_dashboard_data(p_merchant_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'stats', json_build_object(
            'total_sales_today', COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount_fiat ELSE 0 END), 0),
            'total_transactions_today', COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END),
            'pending_transactions', COUNT(CASE WHEN status = 'pending' THEN 1 END),
            'active_terminals', (
                SELECT COUNT(*) FROM terminals 
                WHERE merchant_id = p_merchant_id 
                AND status = 'online'
                AND last_heartbeat > NOW() - INTERVAL '5 minutes'
            ),
            'automations_triggered_today', COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND automation_triggered = true THEN 1 END)
        ),
        'recent_transactions', (
            SELECT json_agg(
                json_build_object(
                    'transaction_id', transaction_id,
                    'amount_fiat', amount_fiat,
                    'crypto_currency', crypto_currency,
                    'status', status,
                    'terminal_name', terminal_name,
                    'location_name', location_name,
                    'processed_by_name', processed_by_name,
                    'created_at', created_at,
                    'tx_hash', tx_hash,
                    'automation_triggered', automation_triggered
                )
            ) FROM (
                SELECT * FROM dashboard_transaction_view 
                WHERE merchant_id = p_merchant_id 
                ORDER BY created_at DESC 
                LIMIT 10
            ) recent
        ),
        'terminal_status', (
            SELECT json_agg(
                json_build_object(
                    'terminal_id', terminal_id,
                    'name', name,
                    'status', status,
                    'location_name', (SELECT name FROM locations WHERE location_id = terminals.location_id),
                    'last_heartbeat', last_heartbeat,
                    'active_session', (
                        SELECT json_build_object(
                            'user_name', u.name,
                            'started_at', ts.started_at
                        ) FROM terminal_sessions ts
                        JOIN users u ON ts.user_id = u.user_id
                        WHERE ts.terminal_id = terminals.terminal_id
                        AND ts.status = 'active'
                        LIMIT 1
                    )
                )
            ) FROM terminals WHERE merchant_id = p_merchant_id
        )
    ) INTO v_result
    FROM dashboard_transaction_view
    WHERE merchant_id = p_merchant_id;
    
    RETURN COALESCE(v_result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_dashboard_updated ON transactions(dashboard_updated_at);
CREATE INDEX IF NOT EXISTS idx_terminal_events_merchant ON terminal_transaction_events(merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_terminal_events_sync ON terminal_transaction_events(dashboard_synced, created_at);

-- 8. Enable RLS on new table
ALTER TABLE terminal_transaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terminal_events_select" ON terminal_transaction_events
    FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "terminal_events_insert" ON terminal_transaction_events
    FOR INSERT WITH CHECK (merchant_id = get_current_merchant_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON terminal_transaction_events TO authenticated;
GRANT SELECT ON dashboard_transaction_view TO authenticated;

-- Example usage:
-- 1. Terminal processes transaction:
-- SELECT process_terminal_transaction(
--     'terminal-uuid', 'session-uuid', 100.00, 'USD', 'BTC', 'bitcoin', 
--     'customer-wallet-address', 'Customer purchase'
-- );

-- 2. Blockchain service updates transaction:
-- SELECT update_transaction_status(
--     'transaction-uuid', 'blockchain-tx-hash', 3, 'completed'
-- );

-- 3. Dashboard fetches real-time data:
-- SELECT get_merchant_dashboard_data('merchant-uuid');

-- 9. Function to validate crypto against terminal configuration
CREATE OR REPLACE FUNCTION validate_terminal_crypto(
    p_terminal_id UUID,
    p_crypto_currency VARCHAR(20),
    p_blockchain VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config_exists BOOLEAN;
BEGIN
    -- Check if the crypto is one of the 3 configured for this terminal
    SELECT EXISTS(
        SELECT 1 FROM terminal_crypto_config tcc
        WHERE tcc.terminal_id = p_terminal_id
        AND (
            (tcc.crypto_1 = p_crypto_currency AND tcc.crypto_1_blockchain = p_blockchain AND tcc.crypto_1_enabled = true) OR
            (tcc.crypto_2 = p_crypto_currency AND tcc.crypto_2_blockchain = p_blockchain AND tcc.crypto_2_enabled = true) OR
            (tcc.crypto_3 = p_crypto_currency AND tcc.crypto_3_blockchain = p_blockchain AND tcc.crypto_3_enabled = true)
        )
    ) INTO v_config_exists;
    
    RETURN COALESCE(v_config_exists, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get terminal's configured cryptos
CREATE OR REPLACE FUNCTION get_terminal_cryptos(p_terminal_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'crypto_1', json_build_object(
            'currency', crypto_1,
            'blockchain', crypto_1_blockchain,
            'enabled', crypto_1_enabled,
            'min_amount', crypto_1_min_amount,
            'max_amount', crypto_1_max_amount
        ),
        'crypto_2', json_build_object(
            'currency', crypto_2,
            'blockchain', crypto_2_blockchain,
            'enabled', crypto_2_enabled,
            'min_amount', crypto_2_min_amount,
            'max_amount', crypto_2_max_amount
        ),
        'crypto_3', json_build_object(
            'currency', crypto_3,
            'blockchain', crypto_3_blockchain,
            'enabled', crypto_3_enabled,
            'min_amount', crypto_3_min_amount,
            'max_amount', crypto_3_max_amount
        ),
        'configured_at', configured_at,
        'configured_by', (SELECT name FROM users WHERE user_id = configured_by)
    ) INTO v_result
    FROM terminal_crypto_config
    WHERE terminal_id = p_terminal_id;
    
    RETURN COALESCE(v_result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Enhanced process_terminal_transaction with crypto validation
CREATE OR REPLACE FUNCTION process_terminal_transaction_validated(
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
    v_crypto_valid BOOLEAN;
BEGIN
    -- 1. Validate terminal session
    IF NOT validate_terminal_session(p_session_id) THEN
        RAISE EXCEPTION 'Invalid or expired terminal session';
    END IF;
    
    -- 2. Validate crypto currency against terminal configuration
    v_crypto_valid := validate_terminal_crypto(p_terminal_id, p_crypto_currency, p_blockchain);
    IF NOT v_crypto_valid THEN
        RAISE EXCEPTION 'Crypto currency % on blockchain % is not configured for this terminal', p_crypto_currency, p_blockchain;
    END IF;
    
    -- 3. Get terminal and session details
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
    
    -- 4. Get merchant wallet address for the specified blockchain
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
    
    -- 5. Calculate crypto amount (simplified - in real implementation, use live rates)
    v_crypto_amount := p_amount_fiat;
    
    -- 6. Create transaction record
    INSERT INTO transactions (
        merchant_id, location_id, terminal_id, terminal_session_id,
        staff_user_id, processed_by_user_id,
        amount_fiat, fiat_currency, amount_crypto, crypto_currency,
        blockchain, status, notes, dashboard_updated_at
    ) VALUES (
        v_merchant_id, v_location_id, p_terminal_id, p_session_id,
        v_user_id, v_user_id,
        p_amount_fiat, p_fiat_currency, v_crypto_amount, p_crypto_currency,
        p_blockchain, 'pending', p_notes, NOW()
    ) RETURNING transaction_id INTO v_transaction_id;
    
    -- 7. Create transaction event for real-time updates
    INSERT INTO terminal_transaction_events (
        transaction_id, terminal_id, merchant_id, event_type, event_data
    ) VALUES (
        v_transaction_id, p_terminal_id, v_merchant_id, 'transaction_initiated',
        jsonb_build_object(
            'amount_fiat', p_amount_fiat,
            'crypto_currency', p_crypto_currency,
            'blockchain', p_blockchain,
            'merchant_wallet', v_wallet_address,
            'customer_wallet', p_customer_wallet_address,
            'processed_by', v_user_id,
            'crypto_validated', true
        )
    );
    
    -- 8. Update terminal last activity
    UPDATE terminals 
    SET last_heartbeat = NOW()
    WHERE terminal_id = p_terminal_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to sync terminal events to dashboard
CREATE OR REPLACE FUNCTION sync_terminal_events_to_dashboard()
RETURNS INTEGER AS $$
DECLARE
    v_synced_count INTEGER;
BEGIN
    -- Mark unsynced events as synced and return count
    UPDATE terminal_transaction_events 
    SET dashboard_synced = true, updated_at = NOW()
    WHERE dashboard_synced = false;
    
    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    
    RETURN v_synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions for new functions
GRANT EXECUTE ON FUNCTION validate_terminal_crypto(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_terminal_cryptos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_terminal_transaction_validated(UUID, UUID, DECIMAL, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_terminal_events_to_dashboard() TO authenticated;

-- This creates a complete audit trail with crypto validation:
-- Terminal → Crypto Config Validation → Session → Transaction → Event → Dashboard
-- Every transaction is fully traceable and validates against terminal's 3 configured cryptos
