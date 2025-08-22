-- Fix Missing Columns in pending_users Table
-- This migration adds the essential columns needed for enhanced staff management

-- Add missing columns to pending_users table
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS terminal_pin VARCHAR(6);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{}';
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS initiated_by_name VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS initiated_by_email VARCHAR(255);
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'denied', 'expired'));
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Convert merchant_id from text to UUID if needed (for foreign key compatibility)
-- First, add a new UUID column
ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS merchant_id_uuid UUID;

-- Update the UUID column from the text column (only where it's valid UUID format)
UPDATE pending_users 
SET merchant_id_uuid = merchant_id::UUID 
WHERE merchant_id_uuid IS NULL 
  AND merchant_id IS NOT NULL 
  AND merchant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Add foreign key constraint (if merchants table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants') THEN
        ALTER TABLE pending_users 
        ADD CONSTRAINT fk_pending_users_merchant 
        FOREIGN KEY (merchant_id_uuid) REFERENCES merchants(merchant_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pending_users_merchant_id ON pending_users(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_merchant_id_uuid ON pending_users(merchant_id_uuid);
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_approval_status ON pending_users(approval_status);

-- Update existing records to have default values
UPDATE pending_users 
SET 
    approval_status = 'pending',
    expires_at = created_at + INTERVAL '7 days'
WHERE approval_status IS NULL OR expires_at IS NULL;
