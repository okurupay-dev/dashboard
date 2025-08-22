-- Terminal Authentication Flow Improvements
-- Addresses the Terminal → Merchant → User login relationship gaps

-- 1. Add Terminal Sessions table to track who's logged into which terminal
CREATE TABLE terminal_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id UUID NOT NULL REFERENCES terminals(terminal_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Session management
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 hours'),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Authentication method
    auth_method VARCHAR(20) DEFAULT 'pin' CHECK (auth_method IN ('pin', 'badge', 'biometric')),
    
    -- Session status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'ended', 'locked')),
    
    -- Audit trail
    login_ip INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active session per terminal
    UNIQUE(terminal_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Add Terminal Permissions table (which staff can use which terminals)
CREATE TABLE terminal_permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id UUID NOT NULL REFERENCES terminals(terminal_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- Permission details
    can_process_payments BOOLEAN DEFAULT true,
    can_issue_refunds BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_manage_inventory BOOLEAN DEFAULT false,
    
    -- Time restrictions
    allowed_start_time TIME,
    allowed_end_time TIME,
    allowed_days VARCHAR(20)[], -- ['monday', 'tuesday', etc.]
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES users(user_id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique permission per user per terminal
    UNIQUE(terminal_id, user_id)
);

-- 3. Update Transactions table to include session tracking
ALTER TABLE transactions 
ADD COLUMN terminal_session_id UUID REFERENCES terminal_sessions(session_id) ON DELETE SET NULL;

-- 4. Add indexes for performance
CREATE INDEX idx_terminal_sessions_terminal_id ON terminal_sessions(terminal_id);
CREATE INDEX idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX idx_terminal_sessions_status ON terminal_sessions(status);
CREATE INDEX idx_terminal_sessions_expires_at ON terminal_sessions(expires_at);
CREATE INDEX idx_terminal_permissions_terminal_user ON terminal_permissions(terminal_id, user_id);
CREATE INDEX idx_transactions_session_id ON transactions(terminal_session_id);

-- 5. Create functions for terminal authentication flow

-- Function to authenticate user to terminal
CREATE OR REPLACE FUNCTION authenticate_terminal_user(
    p_terminal_id UUID,
    p_employee_id VARCHAR(50),
    p_pin_hash VARCHAR(255),
    p_login_ip INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_session_id UUID;
    v_can_access BOOLEAN;
BEGIN
    -- 1. Verify user credentials
    SELECT u.user_id, u.merchant_id INTO v_user_id, v_merchant_id
    FROM users u
    JOIN terminals t ON u.merchant_id = t.merchant_id
    WHERE t.terminal_id = p_terminal_id
    AND u.employee_id = p_employee_id
    AND u.pin_hash = p_pin_hash
    AND u.status = 'active'
    AND u.approved = true;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials or user not authorized';
    END IF;
    
    -- 2. Check terminal permissions
    SELECT tp.can_process_payments INTO v_can_access
    FROM terminal_permissions tp
    WHERE tp.terminal_id = p_terminal_id
    AND tp.user_id = v_user_id
    AND tp.is_active = true;
    
    -- If no specific permissions, allow if user is admin/merchant
    IF v_can_access IS NULL THEN
        SELECT (u.role IN ('admin', 'merchant')) INTO v_can_access
        FROM users u WHERE u.user_id = v_user_id;
    END IF;
    
    IF NOT COALESCE(v_can_access, false) THEN
        RAISE EXCEPTION 'User not authorized for this terminal';
    END IF;
    
    -- 3. End any existing active sessions for this terminal
    UPDATE terminal_sessions 
    SET status = 'ended', ended_at = NOW()
    WHERE terminal_id = p_terminal_id 
    AND status = 'active';
    
    -- 4. Create new session
    INSERT INTO terminal_sessions (
        terminal_id, user_id, merchant_id, 
        auth_method, login_ip
    ) VALUES (
        p_terminal_id, v_user_id, v_merchant_id,
        'pin', p_login_ip
    ) RETURNING session_id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate active terminal session
CREATE OR REPLACE FUNCTION validate_terminal_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT (
        status = 'active' 
        AND expires_at > NOW()
        AND ended_at IS NULL
    ) INTO v_valid
    FROM terminal_sessions
    WHERE session_id = p_session_id;
    
    -- Update last activity if session is valid
    IF COALESCE(v_valid, false) THEN
        UPDATE terminal_sessions 
        SET last_activity = NOW()
        WHERE session_id = p_session_id;
    END IF;
    
    RETURN COALESCE(v_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end terminal session
CREATE OR REPLACE FUNCTION end_terminal_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE terminal_sessions 
    SET status = 'ended', ended_at = NOW()
    WHERE session_id = p_session_id
    AND status = 'active';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS on new tables
ALTER TABLE terminal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terminal_sessions
CREATE POLICY "terminal_sessions_select" ON terminal_sessions
    FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "terminal_sessions_insert" ON terminal_sessions
    FOR INSERT WITH CHECK (merchant_id = get_current_merchant_id());

CREATE POLICY "terminal_sessions_update" ON terminal_sessions
    FOR UPDATE USING (merchant_id = get_current_merchant_id());

-- RLS Policies for terminal_permissions  
CREATE POLICY "terminal_permissions_select" ON terminal_permissions
    FOR SELECT USING (merchant_id = get_current_merchant_id());

CREATE POLICY "terminal_permissions_all" ON terminal_permissions
    FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON terminal_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON terminal_permissions TO authenticated;

-- Example usage:
-- 1. Staff member logs into terminal:
-- SELECT authenticate_terminal_user('terminal-uuid', 'EMP001', 'hashed-pin', '192.168.1.100');

-- 2. Validate session before processing payment:
-- SELECT validate_terminal_session('session-uuid');

-- 3. End session when staff logs out:
-- SELECT end_terminal_session('session-uuid');
