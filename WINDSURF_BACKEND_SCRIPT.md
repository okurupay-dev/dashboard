# Windsurf Backend Implementation Script
# Virtual Terminal Management Dashboard - Backend Integration

## Context for Windsurf AI

I need to implement backend API endpoints for a Virtual Terminal Management dashboard that I've already built the frontend for. The dashboard has three main tabs: Password, Accepted Tokens, and Terminal Settings with advanced features.

## Database Schema (Already Complete)

The following tables already exist in my database:

```sql
-- Merchants table with virtual terminal toggle
CREATE TABLE public.merchants (
  merchant_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  virtual_terminal_enabled boolean DEFAULT true,
  -- ... other fields
);

-- Merchant wallets for validation
CREATE TABLE public.merchant_wallets (
  wallet_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL UNIQUE,
  -- ... other fields
);

-- Virtual terminal passwords
CREATE TABLE public.virtual_terminal_passwords (
  password_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  salt character varying NOT NULL,
  -- ... other fields
);

-- Terminals table with pairing codes
CREATE TABLE public.terminals (
  terminal_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL,
  pairing_code character varying UNIQUE,
  device_type character varying DEFAULT 'physical' CHECK (device_type IN ('physical', 'virtual')),
  -- ... other fields
);

-- Audit table for virtual terminal settings changes
CREATE TABLE public.virtual_terminal_settings_audit (
  audit_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL,
  changed_by uuid,
  old_enabled boolean,
  new_enabled boolean,
  change_reason text,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
```

## Frontend Features Already Built

I have a complete Virtual Terminal Management dashboard with:

1. **Virtual Terminal Password Tab**: Password setup/change with validation
2. **Accepted Tokens Tab**: Token selection (up to 3 tokens) with no defaults
3. **Terminal Settings Tab**: 
   - Master on/off toggle for virtual terminals
   - Wallet validation (can't enable without wallet)
   - Pairing key display when enabled
   - Terminal name, session timeout, currency settings

## Required Backend API Endpoints

Please implement these specific API endpoints:

### 1. Get Virtual Terminal Settings
```
GET /api/merchants/:merchantId/virtual-terminal-settings
```

**Required Response:**
```json
{
  "virtualTerminalEnabled": true,
  "hasWallet": true,
  "walletCount": 1,
  "terminalName": "Main Terminal",
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD",
  "pairingKey": "VT-ABC123",
  "pairingKeyActive": true,
  "pairingKeyLastUsed": "2024-01-20T14:30:00Z"
}
```

**SQL Query Needed:**
```sql
SELECT 
  m.virtual_terminal_enabled,
  m.name as terminal_name,
  CASE WHEN mw.wallet_id IS NOT NULL THEN true ELSE false END as has_wallet,
  COUNT(mw.wallet_id) as wallet_count,
  t.pairing_code as pairing_key,
  CASE WHEN t.status = 'active' THEN true ELSE false END as pairing_key_active,
  t.last_heartbeat as pairing_key_last_used
FROM merchants m
LEFT JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
LEFT JOIN terminals t ON m.merchant_id = t.merchant_id AND t.device_type = 'virtual'
WHERE m.merchant_id = $1
GROUP BY m.merchant_id, m.virtual_terminal_enabled, m.name, mw.wallet_id, t.pairing_code, t.status, t.last_heartbeat;
```

### 2. Update Virtual Terminal Settings
```
PUT /api/merchants/:merchantId/virtual-terminal-settings
```

**Request Body:**
```json
{
  "virtualTerminalEnabled": false,
  "terminalName": "Updated Terminal",
  "sessionTimeout": "60",
  "autoLogout": true,
  "defaultCurrency": "EUR"
}
```

**Critical Validation:**
- Cannot enable virtual terminals if no wallet exists
- Must create audit log entry for enable/disable changes
- Return error if trying to enable without wallet

**SQL Queries Needed:**
```sql
-- Validate wallet exists before enabling
UPDATE merchants 
SET 
  virtual_terminal_enabled = CASE 
    WHEN $2 = true AND NOT EXISTS (
      SELECT 1 FROM merchant_wallets WHERE merchant_id = $1
    ) THEN false  -- Cannot enable without wallet
    ELSE $2
  END,
  name = $3,
  updated_at = NOW()
WHERE merchant_id = $1
RETURNING virtual_terminal_enabled;

-- Create audit log entry
INSERT INTO virtual_terminal_settings_audit 
(merchant_id, changed_by, old_enabled, new_enabled, change_reason, ip_address, user_agent)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

### 3. Regenerate Pairing Key
```
PUT /api/merchants/:merchantId/virtual-terminal-pairing-key
```

**Request Body:**
```json
{
  "reason": "Security regeneration requested by merchant"
}
```

**SQL Query:**
```sql
-- Update or create virtual terminal with new pairing key
INSERT INTO terminals (merchant_id, pairing_code, device_type, status, created_at)
VALUES ($1, $2, 'virtual', 'active', NOW())
ON CONFLICT (merchant_id, device_type) 
DO UPDATE SET 
  pairing_code = $2,
  status = 'active',
  updated_at = NOW()
RETURNING pairing_code;
```

### 4. CRITICAL: Virtual Terminal Login Security Check
```
POST /api/virtual-terminal/login
```

**Before processing any login, add this security check:**
```sql
-- Check if virtual terminals are enabled AND wallet exists
SELECT m.virtual_terminal_enabled 
FROM merchants m
INNER JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
WHERE m.merchant_id = $1 
AND m.virtual_terminal_enabled = true;
```

**If no rows returned, block login with:**
```json
{
  "success": false,
  "error": "VIRTUAL_TERMINALS_DISABLED",
  "message": "Virtual terminals are currently disabled for this merchant. Please contact your administrator."
}
```

## Security Requirements

1. **Wallet Validation**: Virtual terminals cannot be enabled without a connected wallet
2. **Audit Logging**: All enable/disable changes must be logged with user, IP, timestamp
3. **Pairing Key Security**: Only show pairing keys to authenticated merchant users
4. **Login Blocking**: All virtual terminal operations must check the enabled flag

## Error Handling

Please implement proper error responses for:
- `VIRTUAL_TERMINALS_DISABLED`: When trying to use disabled virtual terminals
- `WALLET_REQUIRED`: When trying to enable without wallet
- `INVALID_MERCHANT_ID`: When merchant doesn't exist
- `PAIRING_KEY_GENERATION_FAILED`: When pairing key creation fails

## Testing Requirements

Please test:
1. Normal settings retrieval and updates
2. Wallet validation (can't enable without wallet)
3. Pairing key generation and regeneration
4. Virtual terminal login blocking when disabled
5. Audit logging for all changes

## Frontend Integration

The frontend is already built and ready to integrate with these exact API endpoints. It expects the response formats shown above and handles all the UI logic for wallet validation, pairing key display, and toggle functionality.

Can you implement these backend endpoints with the specified SQL queries, validation logic, and security requirements?
