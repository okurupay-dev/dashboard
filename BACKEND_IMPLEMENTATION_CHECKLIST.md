# Backend Implementation Checklist for Virtual Terminal Toggle

## ✅ Database Schema Status
- [x] `merchants.virtual_terminal_enabled` column added
- [x] `merchant_wallets` table exists
- [x] `virtual_terminal_passwords` table exists
- **No additional SQL changes needed!**

## 🔧 Backend API Endpoints to Implement

### 1. Get Virtual Terminal Settings (NEW)
```
GET /api/merchants/:merchantId/virtual-terminal-settings
```

**SQL Query:**
```sql
SELECT 
  m.virtual_terminal_enabled,
  m.name as terminal_name,
  CASE WHEN mw.wallet_id IS NOT NULL THEN true ELSE false END as has_wallet,
  COUNT(mw.wallet_id) as wallet_count
FROM merchants m
LEFT JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
WHERE m.merchant_id = $1
GROUP BY m.merchant_id, m.virtual_terminal_enabled, m.name, mw.wallet_id;
```

**Response:**
```json
{
  "virtualTerminalEnabled": true,
  "terminalName": "Main Terminal",
  "hasWallet": true,
  "walletCount": 1,
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD"
}
```

### 2. Update Virtual Terminal Settings (NEW)
```
PUT /api/merchants/:merchantId/virtual-terminal-settings
```

**SQL Query with Wallet Validation:**
```sql
UPDATE merchants 
SET 
  virtual_terminal_enabled = CASE 
    WHEN $2 = true AND NOT EXISTS (
      SELECT 1 FROM merchant_wallets WHERE merchant_id = $1
    ) THEN false  -- Cannot enable without wallet
    ELSE $2
  END,
  updated_at = NOW()
WHERE merchant_id = $1
RETURNING virtual_terminal_enabled;
```

### 3. Update Existing Virtual Terminal Login (CRITICAL)
```
POST /api/virtual-terminal/login
```

**Add this security check BEFORE password validation:**
```sql
-- Check if virtual terminals are enabled AND wallet exists
SELECT m.virtual_terminal_enabled 
FROM merchants m
INNER JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
WHERE m.merchant_id = $1 
AND m.virtual_terminal_enabled = true;
```

**If query returns no rows, return:**
```json
{
  "success": false,
  "error": "VIRTUAL_TERMINALS_DISABLED",
  "message": "Virtual terminals are currently disabled for this merchant. Please contact your administrator."
}
```

## 🔒 Security Middleware to Add

```javascript
// Add this middleware to ALL virtual terminal endpoints
const checkVirtualTerminalEnabled = async (req, res, next) => {
  try {
    const merchantId = req.body.merchantId || req.params.merchantId;
    
    const result = await db.query(`
      SELECT m.virtual_terminal_enabled 
      FROM merchants m
      INNER JOIN merchant_wallets mw ON m.merchant_id = mw.merchant_id
      WHERE m.merchant_id = $1 
      AND m.virtual_terminal_enabled = true
    `, [merchantId]);
    
    if (result.rows.length === 0) {
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

## 📋 Implementation Priority

### HIGH PRIORITY (Security Critical)
1. **Add security middleware** to existing virtual terminal login endpoint
2. **Implement GET settings endpoint** for dashboard to load current state
3. **Implement PUT settings endpoint** for dashboard to save changes

### MEDIUM PRIORITY
4. Add virtual terminal settings to other terminal endpoints
5. Add logging for virtual terminal enable/disable events
6. Add rate limiting for settings changes

## 🧪 Testing Checklist

- [ ] Test normal login when virtual terminals enabled + wallet exists
- [ ] Test login blocked when virtual terminals disabled
- [ ] Test cannot enable virtual terminals without wallet
- [ ] Test can enable virtual terminals with wallet
- [ ] Test settings API endpoints return correct wallet status
- [ ] Test middleware blocks all virtual terminal operations when disabled

## 🚨 Critical Notes

1. **Security First**: The middleware check is CRITICAL - without it, users can bypass the toggle
2. **Wallet Validation**: Always check wallet exists before allowing virtual terminal enable
3. **Error Messages**: Use specific error codes so frontend can show appropriate messages
4. **All Endpoints**: Apply the middleware to EVERY virtual terminal endpoint, not just login
