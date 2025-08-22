-- Migration: Enhanced Staff Management with Permissions and Approval Workflow
-- Enhanced Staff Management Migration for OkuruDash
-- Builds on existing schema: merchants, users, locations, terminals, etc.
-- Adds custom permissions and pending approval workflow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff Permissions Table
-- Stores custom permission configurations for different staff roles per merchant
-- References your existing merchants and users tables
CREATE TABLE IF NOT EXISTS public.staff_permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- 'cashier', 'manager', 'supervisor', etc.
    permissions JSONB NOT NULL DEFAULT '{}', -- Flexible permission storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    
    -- Ensure unique role names per merchant
    UNIQUE(merchant_id, role_name)
);

-- Pending Users Table
-- Stores staff addition requests that require admin approval
-- Field structure matches your existing users table for easy migration
CREATE TABLE IF NOT EXISTS public.pending_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id_uuid UUID NOT NULL REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
    
    -- User information (exactly matches your existing users table structure)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'merchant', 'staff')),
    
    -- Permission and PIN information
    role_permissions JSONB NOT NULL DEFAULT '{}',
    terminal_pin_hash VARCHAR(255), -- Same as your existing users.pin_hash field
    
    -- Audit trail
    initiated_by_user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    initiated_by_name VARCHAR(255) NOT NULL,
    initiated_by_email VARCHAR(255) NOT NULL,
    
    -- Approval workflow
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied', 'expired')),
    approved_by_user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    approved_by_name VARCHAR(255),
    approved_by_email VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Constraints
    UNIQUE(merchant_id_uuid, email) -- Prevent duplicate pending requests for same email
);
ALTER TABLE public.pending_users ADD COLUMN IF NOT EXISTS denial_reason text;
ALTER TABLE public.pending_users ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + INTERVAL '7 days');

-- Add foreign key constraints for new fields
ALTER TABLE public.pending_users ADD CONSTRAINT pending_users_merchant_id_uuid_fkey 
    FOREIGN KEY (merchant_id_uuid) REFERENCES public.merchants(merchant_id) ON DELETE CASCADE;
ALTER TABLE public.pending_users ADD CONSTRAINT pending_users_initiated_by_user_id_fkey 
    FOREIGN KEY (initiated_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.pending_users ADD CONSTRAINT pending_users_approved_by_user_id_fkey 
    FOREIGN KEY (approved_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_staff_permissions_merchant_id ON public.staff_permissions(merchant_id);
CREATE INDEX idx_staff_permissions_role_name ON public.staff_permissions(role_name);
CREATE INDEX idx_pending_users_merchant_id_uuid ON public.pending_users(merchant_id_uuid);
CREATE INDEX idx_pending_users_approval_status ON public.pending_users(approval_status);
CREATE INDEX idx_pending_users_initiated_by ON public.pending_users(initiated_by_user_id);
CREATE INDEX idx_pending_users_expires_at ON public.pending_users(expires_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see permissions for their own merchant
CREATE POLICY "Users can view their merchant's staff permissions" ON public.staff_permissions
    FOR SELECT USING (
        merchant_id IN (
            SELECT merchant_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Policy: Only admins can insert/update staff permissions
CREATE POLICY "Admins can manage staff permissions" ON public.staff_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'okuru_admin')
            AND merchant_id = staff_permissions.merchant_id
        )
    );

-- Update RLS policies for pending_users table
DROP POLICY IF EXISTS "Users can view their merchant's pending users" ON public.pending_users;
CREATE POLICY "Users can view their merchant's pending users" ON public.pending_users
    FOR SELECT USING (
        merchant_id_uuid IN (
            SELECT merchant_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'okuru_admin'
        )
    );

-- Policy: Merchant admins can insert pending users
CREATE POLICY "Merchant admins can create pending users" ON public.pending_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role IN ('admin', 'merchant')
            AND merchant_id = pending_users.merchant_id_uuid
        )
    );

-- Policy: Only Okuru admins can update pending users (approve/deny)
CREATE POLICY "Okuru admins can update pending users" ON public.pending_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'okuru_admin'
        )
    );

-- Insert default permission templates for common staff roles
INSERT INTO public.staff_permissions (merchant_id, role_name, permissions, created_by_user_id)
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
    }'::jsonb,
    u.user_id
FROM public.merchants m
JOIN public.users u ON u.merchant_id = m.merchant_id AND u.role = 'admin'
WHERE m.status = 'active'
ON CONFLICT (merchant_id, role_name) DO NOTHING;

INSERT INTO public.staff_permissions (merchant_id, role_name, permissions, created_by_user_id)
SELECT 
    m.merchant_id,
    'manager',
    '{
        "dashboard": {"view": true},
        "transactions": {"view": true, "process": true, "refund": true},
        "terminals": {"access": true, "process_payments": true, "manage": true},
        "reports": {"view": true, "export": true},
        "settings": {"view": true, "update": false},
        "staff": {"view": true, "manage": false},
        "wallets": {"view": true},
        "automations": {"view": true}
    }'::jsonb,
    u.user_id
FROM public.merchants m
JOIN public.users u ON u.merchant_id = m.merchant_id AND u.role = 'admin'
WHERE m.status = 'active'
ON CONFLICT (merchant_id, role_name) DO NOTHING;

INSERT INTO public.staff_permissions (merchant_id, role_name, permissions, created_by_user_id)
SELECT 
    m.merchant_id,
    'supervisor',
    '{
        "dashboard": {"view": true},
        "transactions": {"view": true, "process": true, "refund": true, "void": true},
        "terminals": {"access": true, "process_payments": true, "manage": true, "configure": true},
        "reports": {"view": true, "export": true, "analytics": true},
        "settings": {"view": true, "update": true},
        "staff": {"view": true, "manage": true, "add": false},
        "wallets": {"view": true, "manage": false},
        "automations": {"view": true, "manage": false}
    }'::jsonb,
    u.user_id
FROM public.merchants m
JOIN public.users u ON u.merchant_id = m.merchant_id AND u.role = 'admin'
WHERE m.status = 'active'
ON CONFLICT (merchant_id, role_name) DO NOTHING;

-- Create function to automatically expire old pending users
CREATE OR REPLACE FUNCTION expire_old_pending_users()
RETURNS void AS $$
BEGIN
    UPDATE public.pending_users 
    SET approval_status = 'expired'
    WHERE approval_status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to approve pending user and create actual user
CREATE OR REPLACE FUNCTION approve_pending_user(
    pending_user_id uuid,
    approving_admin_id uuid
)
RETURNS uuid AS $$
DECLARE
    pending_record RECORD;
    new_user_id uuid;
BEGIN
    -- Get pending user record
    SELECT * INTO pending_record 
    FROM public.pending_users 
    WHERE id = pending_user_id AND approval_status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending user not found or already processed';
    END IF;
    
    -- Create the actual user
    INSERT INTO public.users (
        merchant_id,
        name,
        email,
        employee_id,
        role,
        pin_hash,
        status,
        approved,
        metadata
    ) VALUES (
        pending_record.merchant_id_uuid,
        pending_record.name,
        pending_record.email,
        pending_record.employee_id,
        pending_record.role,
        pending_record.terminal_pin_hash,
        'active',
        true,
        pending_record.metadata || jsonb_build_object('permissions', pending_record.role_permissions)
    ) RETURNING user_id INTO new_user_id;
    
    -- Update pending record
    UPDATE public.pending_users 
    SET 
        approval_status = 'approved',
        approved_by_user_id = approving_admin_id,
        approved_at = NOW()
    WHERE id = pending_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.staff_permissions IS 'Custom permission templates for staff roles per merchant';
COMMENT ON COLUMN public.staff_permissions.permissions IS 'JSON object defining specific permissions for this role';
COMMENT ON COLUMN public.pending_users.role_permissions IS 'Custom permissions selected for this pending staff member';
COMMENT ON COLUMN public.pending_users.terminal_pin IS 'Plain text PIN for immediate terminal access (visible to pending user)';
COMMENT ON COLUMN public.pending_users.terminal_pin_hash IS 'Hashed PIN for secure storage when user is approved';
COMMENT ON COLUMN public.pending_users.initiated_by_user_id IS 'User ID of merchant admin who created this pending request';
COMMENT ON COLUMN public.pending_users.approval_status IS 'Current status of the pending request';
COMMENT ON FUNCTION approve_pending_user(uuid, uuid) IS 'Approves a pending user and creates actual user record';
COMMENT ON FUNCTION expire_old_pending_users() IS 'Marks old pending users as expired';
