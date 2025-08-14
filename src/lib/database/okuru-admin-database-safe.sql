-- Okuru Admin Database Schema (Safe Version)
-- Central business intelligence and operations dashboard for Okuru company
-- This version only adds NEW tables and functions, doesn't recreate existing ones

-- =============================================================================
-- OKURU COMPANY SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS okuru_company_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company settings
INSERT INTO okuru_company_settings (setting_key, setting_value, setting_type, description) VALUES
('default_fee_rate', '0.0100', 'number', 'Default 1% processing fee rate'),
('company_name', 'Okuru', 'string', 'Company name'),
('supported_currencies', '["BTC", "ETH", "USDC", "USDT"]', 'json', 'Supported cryptocurrencies'),
('min_transaction_amount', '1.00', 'number', 'Minimum transaction amount in USD'),
('max_transaction_amount', '10000.00', 'number', 'Maximum transaction amount in USD'),
('fee_collection_method', 'automatic', 'string', 'How fees are collected from merchants'),
('webhook_retry_attempts', '3', 'number', 'Number of webhook retry attempts'),
('session_timeout_hours', '8', 'number', 'Terminal session timeout in hours')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- OKURU MERCHANT ANALYTICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS okuru_merchant_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Time period
    period_date DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Transaction metrics
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    refunded_transactions INTEGER DEFAULT 0,
    
    -- Volume metrics (fiat)
    gross_volume_fiat DECIMAL(20,2) DEFAULT 0,
    net_volume_fiat DECIMAL(20,2) DEFAULT 0,
    average_transaction_fiat DECIMAL(15,2) DEFAULT 0,
    
    -- Okuru revenue from this merchant
    okuru_fees_collected_fiat DECIMAL(20,2) DEFAULT 0,
    okuru_fees_collected_crypto JSONB DEFAULT '{}', -- {"BTC": 0.001, "ETH": 0.05}
    
    -- Crypto metrics
    crypto_volumes JSONB DEFAULT '{}', -- {"BTC": {"amount": 1.5, "fiat_value": 45000}}
    
    -- Terminal metrics
    active_terminals INTEGER DEFAULT 0,
    total_terminal_sessions INTEGER DEFAULT 0,
    average_session_duration_minutes INTEGER DEFAULT 0,
    
    -- Staff metrics
    active_staff_count INTEGER DEFAULT 0,
    staff_transactions INTEGER DEFAULT 0,
    
    -- Wallet metrics
    total_wallet_addresses INTEGER DEFAULT 0,
    verified_wallet_addresses INTEGER DEFAULT 0,
    
    -- Automation metrics
    active_automations INTEGER DEFAULT 0,
    automation_executions INTEGER DEFAULT 0,
    automation_volume_fiat DECIMAL(20,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(merchant_id, period_date, period_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_okuru_merchant_analytics_merchant_id ON okuru_merchant_analytics(merchant_id);
CREATE INDEX IF NOT EXISTS idx_okuru_merchant_analytics_period_date ON okuru_merchant_analytics(period_date);
CREATE INDEX IF NOT EXISTS idx_okuru_merchant_analytics_period_type ON okuru_merchant_analytics(period_type);

-- =============================================================================
-- OKURU GLOBAL ANALYTICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS okuru_global_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    period_date DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Global transaction metrics
    total_merchants INTEGER DEFAULT 0,
    active_merchants INTEGER DEFAULT 0,
    new_merchants INTEGER DEFAULT 0,
    
    -- Global transaction volume
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    gross_volume_fiat DECIMAL(20,2) DEFAULT 0,
    net_volume_fiat DECIMAL(20,2) DEFAULT 0,
    
    -- Okuru revenue metrics
    total_okuru_fees_fiat DECIMAL(20,2) DEFAULT 0,
    total_okuru_fees_crypto JSONB DEFAULT '{}',
    
    -- Platform metrics
    total_terminals INTEGER DEFAULT 0,
    active_terminals INTEGER DEFAULT 0,
    total_locations INTEGER DEFAULT 0,
    
    -- Crypto metrics
    supported_cryptos JSONB DEFAULT '[]',
    crypto_volumes JSONB DEFAULT '{}',
    top_crypto_by_volume VARCHAR(10),
    
    -- Staff metrics
    total_staff INTEGER DEFAULT 0,
    active_staff INTEGER DEFAULT 0,
    
    -- Automation metrics
    total_automations INTEGER DEFAULT 0,
    active_automations INTEGER DEFAULT 0,
    automation_executions INTEGER DEFAULT 0,
    
    -- Growth metrics
    merchant_growth_rate DECIMAL(5,2) DEFAULT 0,
    volume_growth_rate DECIMAL(5,2) DEFAULT 0,
    revenue_growth_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(period_date, period_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_okuru_global_analytics_period_date ON okuru_global_analytics(period_date);
CREATE INDEX IF NOT EXISTS idx_okuru_global_analytics_period_type ON okuru_global_analytics(period_type);

-- =============================================================================
-- OKURU ALERTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS okuru_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(merchant_id) ON DELETE CASCADE, -- NULL for global alerts
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'high_volume', 'failed_transactions', 'new_merchant', etc.
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert data
    alert_data JSONB DEFAULT '{}', -- Additional context data
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_okuru_alerts_merchant_id ON okuru_alerts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_okuru_alerts_alert_type ON okuru_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_okuru_alerts_severity ON okuru_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_okuru_alerts_status ON okuru_alerts(status);
CREATE INDEX IF NOT EXISTS idx_okuru_alerts_created_at ON okuru_alerts(created_at);

-- =============================================================================
-- BUSINESS INTELLIGENCE FUNCTIONS
-- =============================================================================

-- Function to calculate merchant analytics for a specific date
CREATE OR REPLACE FUNCTION calculate_merchant_analytics(
    p_merchant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    v_total_transactions INTEGER;
    v_successful_transactions INTEGER;
    v_failed_transactions INTEGER;
    v_refunded_transactions INTEGER;
    v_gross_volume_fiat DECIMAL(20,2);
    v_net_volume_fiat DECIMAL(20,2);
    v_average_transaction_fiat DECIMAL(15,2);
    v_okuru_fees_collected_fiat DECIMAL(20,2);
    v_active_terminals INTEGER;
    v_total_terminal_sessions INTEGER;
    v_active_staff_count INTEGER;
    v_total_wallet_addresses INTEGER;
    v_verified_wallet_addresses INTEGER;
    v_active_automations INTEGER;
    v_automation_executions INTEGER;
BEGIN
    -- Calculate analytics for the merchant and date
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_transactions,
        COALESCE(SUM(amount_fiat), 0) as gross_volume_fiat,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount_fiat ELSE 0 END), 0) as net_volume_fiat,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN amount_fiat END), 0) as average_transaction_fiat,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN okuru_fee_fiat ELSE 0 END), 0) as okuru_fees_collected_fiat
    INTO v_total_transactions, v_successful_transactions, v_failed_transactions, v_refunded_transactions,
         v_gross_volume_fiat, v_net_volume_fiat, v_average_transaction_fiat, v_okuru_fees_collected_fiat
    FROM transactions 
    WHERE merchant_id = p_merchant_id 
    AND DATE(created_at) = p_date;
    
    -- Calculate terminal metrics
    SELECT COUNT(*) INTO v_active_terminals
    FROM terminals 
    WHERE merchant_id = p_merchant_id 
    AND status = 'online';
    
    SELECT COUNT(*) INTO v_total_terminal_sessions
    FROM terminal_sessions 
    WHERE merchant_id = p_merchant_id 
    AND DATE(login_at) = p_date;
    
    -- Calculate staff metrics
    SELECT COUNT(*) INTO v_active_staff_count
    FROM users 
    WHERE merchant_id = p_merchant_id 
    AND approved = true 
    AND role IN ('staff', 'merchant', 'admin');
    
    -- Calculate wallet metrics
    SELECT 
        COUNT(*) as total_addresses,
        COUNT(CASE WHEN verified_at IS NOT NULL THEN 1 END) as verified_addresses
    INTO v_total_wallet_addresses, v_verified_wallet_addresses
    FROM wallet_addresses wa
    JOIN merchant_wallets mw ON wa.wallet_id = mw.wallet_id
    WHERE mw.merchant_id = p_merchant_id;
    
    -- Calculate automation metrics
    SELECT 
        COUNT(*) as active_automations,
        COALESCE(SUM(CASE WHEN DATE(ae.executed_at) = p_date THEN 1 ELSE 0 END), 0) as automation_executions
    INTO v_active_automations, v_automation_executions
    FROM automations a
    LEFT JOIN automation_executions ae ON a.automation_id = ae.automation_id
    WHERE a.merchant_id = p_merchant_id 
    AND a.enabled = true;
    
    -- Insert or update analytics record
    INSERT INTO okuru_merchant_analytics (
        merchant_id, period_date, period_type,
        total_transactions, successful_transactions, failed_transactions, refunded_transactions,
        gross_volume_fiat, net_volume_fiat, average_transaction_fiat,
        okuru_fees_collected_fiat,
        active_terminals, total_terminal_sessions,
        active_staff_count,
        total_wallet_addresses, verified_wallet_addresses,
        active_automations, automation_executions
    ) VALUES (
        p_merchant_id, p_date, 'daily',
        v_total_transactions, v_successful_transactions, v_failed_transactions, v_refunded_transactions,
        v_gross_volume_fiat, v_net_volume_fiat, v_average_transaction_fiat,
        v_okuru_fees_collected_fiat,
        v_active_terminals, v_total_terminal_sessions,
        v_active_staff_count,
        v_total_wallet_addresses, v_verified_wallet_addresses,
        v_active_automations, v_automation_executions
    )
    ON CONFLICT (merchant_id, period_date, period_type)
    DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        successful_transactions = EXCLUDED.successful_transactions,
        failed_transactions = EXCLUDED.failed_transactions,
        refunded_transactions = EXCLUDED.refunded_transactions,
        gross_volume_fiat = EXCLUDED.gross_volume_fiat,
        net_volume_fiat = EXCLUDED.net_volume_fiat,
        average_transaction_fiat = EXCLUDED.average_transaction_fiat,
        okuru_fees_collected_fiat = EXCLUDED.okuru_fees_collected_fiat,
        active_terminals = EXCLUDED.active_terminals,
        total_terminal_sessions = EXCLUDED.total_terminal_sessions,
        active_staff_count = EXCLUDED.active_staff_count,
        total_wallet_addresses = EXCLUDED.total_wallet_addresses,
        verified_wallet_addresses = EXCLUDED.verified_wallet_addresses,
        active_automations = EXCLUDED.active_automations,
        automation_executions = EXCLUDED.automation_executions,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate Okuru executive dashboard
CREATE OR REPLACE FUNCTION get_okuru_executive_dashboard(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
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
        'merchants', json_build_object(
            'total', (SELECT COUNT(*) FROM merchants),
            'active', (SELECT COUNT(DISTINCT merchant_id) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date),
            'new', (SELECT COUNT(*) FROM merchants WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date)
        ),
        'transactions', json_build_object(
            'total', (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date),
            'successful', (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date AND status = 'completed'),
            'volume_fiat', (SELECT COALESCE(SUM(amount_fiat), 0) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date AND status = 'completed')
        ),
        'revenue', json_build_object(
            'total_fees_fiat', (SELECT COALESCE(SUM(okuru_fee_fiat), 0) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date AND status = 'completed'),
            'average_fee_per_transaction', (SELECT COALESCE(AVG(okuru_fee_fiat), 0) FROM transactions WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date AND status = 'completed')
        ),
        'terminals', json_build_object(
            'total', (SELECT COUNT(*) FROM terminals),
            'online', (SELECT COUNT(*) FROM terminals WHERE status = 'online'),
            'sessions_today', (SELECT COUNT(*) FROM terminal_sessions WHERE DATE(login_at) = CURRENT_DATE)
        ),
        'top_merchants', (
            SELECT json_agg(json_build_object(
                'merchant_id', merchant_id,
                'business_name', business_name,
                'volume_fiat', volume_fiat,
                'transaction_count', transaction_count
            ))
            FROM (
                SELECT 
                    m.merchant_id,
                    m.business_name,
                    COALESCE(SUM(t.amount_fiat), 0) as volume_fiat,
                    COUNT(t.transaction_id) as transaction_count
                FROM merchants m
                LEFT JOIN transactions t ON m.merchant_id = t.merchant_id 
                    AND DATE(t.created_at) BETWEEN p_start_date AND p_end_date 
                    AND t.status = 'completed'
                GROUP BY m.merchant_id, m.business_name
                ORDER BY volume_fiat DESC
                LIMIT 10
            ) top_merchants_data
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create business alerts
CREATE OR REPLACE FUNCTION check_okuru_business_alerts()
RETURNS INTEGER AS $$
DECLARE
    v_alerts_created INTEGER := 0;
    v_merchant RECORD;
    v_high_volume_threshold DECIMAL(20,2) := 50000; -- $50k daily volume threshold
    v_high_failure_rate DECIMAL(5,2) := 0.10; -- 10% failure rate threshold
BEGIN
    -- Check for high volume merchants (potential scaling needs)
    FOR v_merchant IN
        SELECT 
            m.merchant_id,
            m.business_name,
            COALESCE(SUM(t.amount_fiat), 0) as daily_volume
        FROM merchants m
        LEFT JOIN transactions t ON m.merchant_id = t.merchant_id 
            AND DATE(t.created_at) = CURRENT_DATE
            AND t.status = 'completed'
        GROUP BY m.merchant_id, m.business_name
        HAVING COALESCE(SUM(t.amount_fiat), 0) > v_high_volume_threshold
    LOOP
        -- Create high volume alert if not already exists
        INSERT INTO okuru_alerts (
            merchant_id, alert_type, severity, title, message, alert_data
        )
        SELECT 
            v_merchant.merchant_id,
            'high_volume',
            'medium',
            'High Volume Merchant Alert',
            format('Merchant %s has processed $%.2f today, exceeding the $%.2f threshold', 
                   v_merchant.business_name, v_merchant.daily_volume, v_high_volume_threshold),
            json_build_object('daily_volume', v_merchant.daily_volume, 'threshold', v_high_volume_threshold)
        WHERE NOT EXISTS (
            SELECT 1 FROM okuru_alerts 
            WHERE merchant_id = v_merchant.merchant_id 
            AND alert_type = 'high_volume' 
            AND DATE(created_at) = CURRENT_DATE
            AND status = 'active'
        );
        
        v_alerts_created := v_alerts_created + 1;
    END LOOP;
    
    -- Check for high failure rate merchants
    FOR v_merchant IN
        SELECT 
            m.merchant_id,
            m.business_name,
            COUNT(t.transaction_id) as total_transactions,
            COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_transactions,
            CASE 
                WHEN COUNT(t.transaction_id) > 0 THEN 
                    COUNT(CASE WHEN t.status = 'failed' THEN 1 END)::DECIMAL / COUNT(t.transaction_id)
                ELSE 0 
            END as failure_rate
        FROM merchants m
        LEFT JOIN transactions t ON m.merchant_id = t.merchant_id 
            AND DATE(t.created_at) = CURRENT_DATE
        GROUP BY m.merchant_id, m.business_name
        HAVING COUNT(t.transaction_id) >= 10 -- At least 10 transactions
        AND CASE 
                WHEN COUNT(t.transaction_id) > 0 THEN 
                    COUNT(CASE WHEN t.status = 'failed' THEN 1 END)::DECIMAL / COUNT(t.transaction_id)
                ELSE 0 
            END > v_high_failure_rate
    LOOP
        -- Create high failure rate alert
        INSERT INTO okuru_alerts (
            merchant_id, alert_type, severity, title, message, alert_data
        )
        SELECT 
            v_merchant.merchant_id,
            'high_failure_rate',
            'high',
            'High Failure Rate Alert',
            format('Merchant %s has a %.1f%% failure rate today (%d failed out of %d total)', 
                   v_merchant.business_name, v_merchant.failure_rate * 100, 
                   v_merchant.failed_transactions, v_merchant.total_transactions),
            json_build_object(
                'failure_rate', v_merchant.failure_rate,
                'failed_transactions', v_merchant.failed_transactions,
                'total_transactions', v_merchant.total_transactions
            )
        WHERE NOT EXISTS (
            SELECT 1 FROM okuru_alerts 
            WHERE merchant_id = v_merchant.merchant_id 
            AND alert_type = 'high_failure_rate' 
            AND DATE(created_at) = CURRENT_DATE
            AND status = 'active'
        );
        
        v_alerts_created := v_alerts_created + 1;
    END LOOP;
    
    RETURN v_alerts_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Trigger to update updated_at timestamp on okuru_company_settings
CREATE OR REPLACE FUNCTION update_okuru_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_okuru_company_settings_updated_at
    BEFORE UPDATE ON okuru_company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_okuru_company_settings_updated_at();

-- Trigger to update updated_at timestamp on okuru_merchant_analytics
CREATE OR REPLACE FUNCTION update_okuru_merchant_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_okuru_merchant_analytics_updated_at
    BEFORE UPDATE ON okuru_merchant_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_okuru_merchant_analytics_updated_at();

-- Trigger to update updated_at timestamp on okuru_global_analytics
CREATE OR REPLACE FUNCTION update_okuru_global_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_okuru_global_analytics_updated_at
    BEFORE UPDATE ON okuru_global_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_okuru_global_analytics_updated_at();

-- Trigger to update updated_at timestamp on okuru_alerts
CREATE OR REPLACE FUNCTION update_okuru_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_okuru_alerts_updated_at
    BEFORE UPDATE ON okuru_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_okuru_alerts_updated_at();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant permissions for authenticated users (will be restricted by RLS)
GRANT SELECT ON okuru_company_settings TO authenticated;
GRANT SELECT ON okuru_merchant_analytics TO authenticated;
GRANT SELECT ON okuru_global_analytics TO authenticated;
GRANT SELECT ON okuru_alerts TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_merchant_analytics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_okuru_executive_dashboard(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION check_okuru_business_alerts() TO authenticated;

-- =============================================================================
-- EXAMPLE USAGE
-- =============================================================================

/*
-- Calculate analytics for a specific merchant today
SELECT calculate_merchant_analytics('merchant-uuid-here');

-- Get executive dashboard for last 30 days
SELECT get_okuru_executive_dashboard();

-- Get executive dashboard for specific date range
SELECT get_okuru_executive_dashboard('2024-01-01', '2024-01-31');

-- Check for business alerts
SELECT check_okuru_business_alerts();

-- View merchant analytics
SELECT * FROM okuru_merchant_analytics 
WHERE merchant_id = 'merchant-uuid' 
ORDER BY period_date DESC;

-- View company settings
SELECT * FROM okuru_company_settings;

-- View active alerts
SELECT * FROM okuru_alerts 
WHERE status = 'active' 
ORDER BY severity DESC, created_at DESC;
*/
