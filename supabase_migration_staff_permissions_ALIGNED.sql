-- Enhanced Staff Management Migration for OkuruDash
-- PROPERLY ALIGNED with actual current database schema in SQLINFO
-- Builds on existing pending_users table and adds staff_permissions table

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

-- Enhance existing pending_users table with additional fields needed for enhanced workflow
-- Your existing pending_users table has: id, email, name, role, merchant_id, employee_id, status, created_at, updated_at, metadata

-- Add new columns to existing pending_users table for enhanced staff management
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{}';
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS initiated_by_name VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS initiated_by_email VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied', 'expired'));
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved_by_email VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Update existing pending_users to use UUID for merchant_id if it's currently text
-- Your current pending_users.merchant_id is text, but we need UUID to reference merchants table
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS merchant_id_uuid UUID;

-- Update merchant_id_uuid from existing merchant_id text field
UPDATE pending_users 
SET merchant_id_uuid = merchant_id::UUID 
WHERE merchant_id_uuid IS NULL AND merchant_id IS NOT NULL;

-- Add foreign key constraint for merchant_id_uuid (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pending_users_merchant_id_uuid_fkey'
        AND table_name = 'pending_users'
    ) THEN
        ALTER TABLE pending_users ADD CONSTRAINT pending_users_merchant_id_uuid_fkey 
            FOREIGN KEY (merchant_id_uuid) REFERENCES merchants(merchant_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_permissions_merchant_id ON staff_permissions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_merchant_id_uuid ON pending_users(merchant_id_uuid);
CREATE INDEX IF NOT EXISTS idx_pending_users_approval_status ON pending_users(approval_status);
CREATE INDEX IF NOT EXISTS idx_pending_users_expires_at ON pending_users(expires_at);

-- Row Level Security (RLS) Policies
-- Enable RLS on new table
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- Staff Permissions RLS Policies
-- Note: Using your existing RLS functions if they exist, or basic policies if not

-- Users can view permissions for their merchant
CREATE POLICY "Users can view staff permissions in their merchant" ON staff_permissions
  FOR SELECT USING (
    merchant_id IN (
      SELECT u.merchant_id FROM users u WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Only admins can manage staff permissions
CREATE POLICY "Admins can manage staff permissions in their merchant" ON staff_permissions
  FOR ALL USING (
    merchant_id IN (
      SELECT u.merchant_id FROM users u 
      WHERE u.clerk_user_id = auth.jwt() ->> 'sub' 
      AND u.role IN ('admin', 'okuru_admin')
    )
  );

-- Default Permission Templates
-- Insert default permission templates for common staff roles for existing merchants
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
    approver_record RECORD;
BEGIN
    -- Get the pending user record
    SELECT * INTO pending_record 
    FROM pending_users 
    WHERE id = pending_user_id AND approval_status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get approver information
    SELECT name, email INTO approver_record
    FROM users 
    WHERE user_id = approver_user_id;
    
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
        'pending_' || pending_record.id::text, -- Temporary clerk_user_id until real one is assigned
        pending_record.merchant_id_uuid,
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
        approved_by_name = approver_record.name,
        approved_by_email = approver_record.email,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = pending_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deny pending users
CREATE OR REPLACE FUNCTION deny_pending_user(
    pending_user_id UUID,
    approver_user_id UUID,
    reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    approver_record RECORD;
BEGIN
    -- Get approver information
    SELECT name, email INTO approver_record
    FROM users 
    WHERE user_id = approver_user_id;
    
    -- Update pending user status
    UPDATE pending_users 
    SET 
        approval_status = 'denied',
        approved_by = approver_user_id,
        approved_by_name = approver_record.name,
        approved_by_email = approver_record.email,
        approved_at = NOW(),
        denial_reason = reason,
        updated_at = NOW()
    WHERE id = pending_user_id AND approval_status = 'pending';
    
    RETURN FOUND;
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
COMMENT ON FUNCTION approve_pending_user IS 'Approves a pending user and moves them to the main users table';
COMMENT ON FUNCTION deny_pending_user IS 'Denies a pending user with optional reason';
COMMENT ON FUNCTION expire_old_pending_users IS 'Expires pending users that have exceeded their expiration date';

-- Success message
SELECT 'Enhanced Staff Management migration completed successfully!' as result;
