-- Enhanced Staff Management Migration for OkuruDash
-- PROPERLY ALIGNED with existing database schema in supabase-schema.sql
-- Adds only the missing tables needed for custom permissions and pending approval workflow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff Permissions Table
-- Stores custom permission configurations for different staff roles per merchant
-- References your existing merchants(merchant_id) and users(user_id) tables
CREATE TABLE IF NOT EXISTS staff_permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- 'cashier', 'manager', 'supervisor', etc.
    permissions JSONB NOT NULL DEFAULT '{}', -- Flexible permission storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Ensure unique role names per merchant
    UNIQUE(merchant_id, role_name)
);

-- Pending Users Table
-- Stores staff addition requests that require admin approval
-- Field structure exactly matches your existing users table for easy migration
CREATE TABLE IF NOT EXISTS pending_users (
    pending_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
    
    -- User information (exactly matches your existing users table structure)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'merchant', 'staff')),
    
    -- Permission and PIN information
    role_permissions JSONB NOT NULL DEFAULT '{}',
    pin_hash VARCHAR(255), -- Same field name and type as your existing users.pin_hash
    
    -- Audit trail
    initiated_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    initiated_by_name VARCHAR(255) NOT NULL,
    initiated_by_email VARCHAR(255) NOT NULL,
    
    -- Approval workflow
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied', 'expired')),
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by_name VARCHAR(255),
    approved_by_email VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Constraints
    UNIQUE(merchant_id, email) -- Prevent duplicate pending requests for same email
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_permissions_merchant_id ON staff_permissions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_merchant_id ON pending_users(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(approval_status);
CREATE INDEX IF NOT EXISTS idx_pending_users_expires_at ON pending_users(expires_at);

-- Row Level Security (RLS) Policies
-- Enable RLS on new tables
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Staff Permissions RLS Policies
-- Users can view permissions for their merchant
CREATE POLICY "Users can view staff permissions in their merchant" ON staff_permissions
  FOR SELECT USING (merchant_id = get_current_merchant_id());

-- Only admins can manage staff permissions
CREATE POLICY "Admins can manage staff permissions in their merchant" ON staff_permissions
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Pending Users RLS Policies
-- Users can view pending users for their merchant
CREATE POLICY "Users can view pending users in their merchant" ON pending_users
  FOR SELECT USING (merchant_id = get_current_merchant_id());

-- Admins can manage pending users in their merchant
CREATE POLICY "Admins can manage pending users in their merchant" ON pending_users
  FOR ALL USING (merchant_id = get_current_merchant_id() AND is_admin());

-- Default Permission Templates
-- Insert default permission templates for common staff roles
INSERT INTO staff_permissions (merchant_id, role_name, permissions) 
SELECT 
    m.merchant_id,
    'cashier',
    '{
        "dashboard": {"view": true},
        "transactions": {"view": true, "process": true},
        "terminals": {"access": true, "process_payments": true},
        "reports": {"view": false},
        "settings": {"view": false},
        "staff": {"view": false},
        "wallets": {"view": false},
        "automations": {"view": false}
    }'::jsonb
FROM merchants m
WHERE NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.merchant_id = m.merchant_id AND sp.role_name = 'cashier'
);

INSERT INTO staff_permissions (merchant_id, role_name, permissions) 
SELECT 
    m.merchant_id,
    'manager',
    '{
        "dashboard": {"view": true},
        "transactions": {"view": true, "process": true, "refund": true},
        "terminals": {"access": true, "process_payments": true, "manage": true},
        "reports": {"view": true, "export": true},
        "settings": {"view": true},
        "staff": {"view": true},
        "wallets": {"view": true},
        "automations": {"view": false}
    }'::jsonb
FROM merchants m
WHERE NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.merchant_id = m.merchant_id AND sp.role_name = 'manager'
);

INSERT INTO staff_permissions (merchant_id, role_name, permissions) 
SELECT 
    m.merchant_id,
    'supervisor',
    '{
        "dashboard": {"view": true},
        "transactions": {"view": true, "process": true, "refund": true, "void": true},
        "terminals": {"access": true, "process_payments": true, "manage": true, "configure": true},
        "reports": {"view": true, "export": true, "analytics": true},
        "settings": {"view": true, "update": true},
        "staff": {"view": true, "manage": true},
        "wallets": {"view": true},
        "automations": {"view": true}
    }'::jsonb
FROM merchants m
WHERE NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.merchant_id = m.merchant_id AND sp.role_name = 'supervisor'
);

-- Function to approve pending users
-- Moves approved pending users to the main users table
CREATE OR REPLACE FUNCTION approve_pending_user(
    pending_user_id UUID,
    approver_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    pending_record RECORD;
    new_user_id UUID;
BEGIN
    -- Get the pending user record
    SELECT * INTO pending_record 
    FROM pending_users 
    WHERE pending_id = pending_user_id AND approval_status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert into users table
    INSERT INTO users (
        clerk_user_id,
        merchant_id,
        name,
        email,
        role,
        employee_id,
        pin_hash,
        status,
        approved,
        created_at,
        updated_at
    ) VALUES (
        'pending_' || pending_record.pending_id::text, -- Temporary clerk_user_id
        pending_record.merchant_id,
        pending_record.name,
        pending_record.email,
        pending_record.role,
        pending_record.employee_id,
        pending_record.pin_hash,
        'active',
        true,
        NOW(),
        NOW()
    ) RETURNING user_id INTO new_user_id;
    
    -- Update pending user status
    UPDATE pending_users 
    SET 
        approval_status = 'approved',
        approved_by = approver_user_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE pending_id = pending_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old pending users
CREATE OR REPLACE FUNCTION expire_old_pending_users() RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE pending_users 
    SET 
        approval_status = 'expired',
        updated_at = NOW()
    WHERE 
        approval_status = 'pending' 
        AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE staff_permissions IS 'Stores custom permission configurations for different staff roles per merchant';
COMMENT ON TABLE pending_users IS 'Stores staff addition requests that require admin approval before activation';
COMMENT ON FUNCTION approve_pending_user IS 'Approves a pending user and moves them to the main users table';
COMMENT ON FUNCTION expire_old_pending_users IS 'Expires pending users that have exceeded their expiration date';
