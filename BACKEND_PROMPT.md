# Backend Implementation: Virtual Terminal On/Off Toggle

## Task Overview
Implement a master on/off switch for virtual terminals that allows merchants to completely disable virtual terminal login access from their dashboard.

## Database Changes Required

### 1. Add Column to Merchants Table
```sql
-- Add virtual terminal enabled/disabled toggle to merchants table
ALTER TABLE public.merchants 
ADD COLUMN virtual_terminal_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.merchants.virtual_terminal_enabled IS 'Controls whether virtual terminals are enabled for this merchant. When false, all virtual terminal login attempts are blocked.';

-- Update existing merchants to have virtual terminals enabled by default
UPDATE public.merchants 
SET virtual_terminal_enabled = true 
WHERE virtual_terminal_enabled IS NULL;

-- Add index for performance when checking virtual terminal status
CREATE INDEX idx_merchants_virtual_terminal_enabled 
ON public.merchants(virtual_terminal_enabled) 
WHERE virtual_terminal_enabled = true;
```

## API Endpoints to Implement

### 1. Get Virtual Terminal Settings
```
GET /api/merchants/:merchantId/virtual-terminal-settings
```

**Response:**
```json
{
  "virtualTerminalEnabled": true,
  "terminalName": "Main Terminal",
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD"
}
```

### 2. Update Virtual Terminal Settings
```
PUT /api/merchants/:merchantId/virtual-terminal-settings
```

**Request Body:**
```json
{
  "virtualTerminalEnabled": false,
  "terminalName": "Main Terminal", 
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Virtual terminal settings updated successfully"
}
```

## CRITICAL: Security Implementation

### Add Virtual Terminal Check to ALL Virtual Terminal Endpoints

**Before processing ANY virtual terminal login or payment:**

```javascript
// Middleware to check virtual terminal status
const checkVirtualTerminalEnabled = async (req, res, next) => {
  try {
    const merchantId = req.body.merchantId || req.params.merchantId;
    
    const result = await db.query(
      'SELECT virtual_terminal_enabled FROM merchants WHERE merchant_id = $1',
      [merchantId]
    );
    
    if (!result.rows[0]?.virtual_terminal_enabled) {
      return res.status(403).json({
        success: false,
        error: 'VIRTUAL_TERMINALS_DISABLED',
        message: 'Virtual terminals are currently disabled for this merchant. Please contact your administrator.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking virtual terminal status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Apply to ALL virtual terminal routes
app.post('/api/virtual-terminal/login', checkVirtualTerminalEnabled, handleLogin);
app.post('/api/virtual-terminal/payment', checkVirtualTerminalEnabled, handlePayment);
app.post('/api/virtual-terminal/invoice', checkVirtualTerminalEnabled, handleInvoice);
// Add to ANY other virtual terminal endpoints
```

### Database Queries

```sql
-- Get merchant virtual terminal settings WITH wallet validation
SELECT 
  m.virtual_terminal_enabled,
  m.name as terminal_name,
  CASE WHEN mw.wallet_id IS NOT NULL THEN true ELSE false END as has_wallet,
  COUNT(mw.wallet_id) as wallet_count
FROM merchants m
LEFT JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
WHERE m.merchant_id = $1
GROUP BY m.merchant_id, m.virtual_terminal_enabled, m.name, mw.wallet_id;

-- Update virtual terminal enabled status (with wallet validation)
UPDATE merchants 
SET 
  virtual_terminal_enabled = CASE 
    WHEN $2 = true AND NOT EXISTS (
      SELECT 1 FROM merchant_wallets WHERE merchant_id = $1
    ) THEN false  -- Cannot enable without wallet
    ELSE $2
  END,
  updated_at = NOW()
WHERE merchant_id = $1;

-- Check if virtual terminals are enabled AND wallet exists (for login validation)
SELECT m.virtual_terminal_enabled 
FROM merchants m
INNER JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
WHERE m.merchant_id = $1 
AND m.virtual_terminal_enabled = true;
```

## Expected Behavior

- **When ON + Wallet Connected**: Normal virtual terminal login and payment processing
- **When ON + No Wallet**: Cannot enable virtual terminals, frontend shows wallet requirement message
- **When OFF**: All virtual terminal operations blocked with clear error message
- **No Wallet**: Virtual terminals cannot be enabled until admin adds a wallet
- **Error Response**: Return specific error code so frontend can show appropriate message

## Testing

1. Create merchant with virtual terminals enabled
2. Test normal login works
3. Disable virtual terminals via API
4. Verify login is blocked with proper error message
5. Re-enable and verify login works again

## Priority: HIGH
This is a critical security feature that must be implemented correctly to prevent unauthorized access when merchants disable virtual terminals.
