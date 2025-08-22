# Backend API Endpoints for Virtual Terminal Toggle

## 1. Get Virtual Terminal Settings
**GET** `/api/merchants/:merchantId/virtual-terminal-settings`

```javascript
// Response
{
  "virtualTerminalEnabled": true,
  "terminalName": "Main Terminal",
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD"
}
```

## 2. Update Virtual Terminal Settings
**PUT** `/api/merchants/:merchantId/virtual-terminal-settings`

```javascript
// Request Body
{
  "virtualTerminalEnabled": false,
  "terminalName": "Main Terminal",
  "sessionTimeout": "30",
  "autoLogout": true,
  "defaultCurrency": "USD"
}

// Response
{
  "success": true,
  "message": "Virtual terminal settings updated successfully"
}
```

## 3. Virtual Terminal Login Check (CRITICAL)
**POST** `/api/virtual-terminal/login`

```javascript
// Before processing login, check if virtual terminals are enabled:

// SQL Query to check status
SELECT virtual_terminal_enabled 
FROM merchants 
WHERE merchant_id = $1;

// If virtual_terminal_enabled = false, return:
{
  "success": false,
  "error": "VIRTUAL_TERMINALS_DISABLED",
  "message": "Virtual terminals are currently disabled for this merchant"
}
```

## 4. Implementation Example (Node.js/Express)

```javascript
// Middleware to check virtual terminal status
const checkVirtualTerminalEnabled = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    
    const result = await db.query(
      'SELECT virtual_terminal_enabled FROM merchants WHERE merchant_id = $1',
      [merchantId]
    );
    
    if (!result.rows[0]?.virtual_terminal_enabled) {
      return res.status(403).json({
        success: false,
        error: 'VIRTUAL_TERMINALS_DISABLED',
        message: 'Virtual terminals are currently disabled for this merchant'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Apply middleware to virtual terminal routes
app.post('/api/virtual-terminal/login', checkVirtualTerminalEnabled, handleVirtualTerminalLogin);
app.post('/api/virtual-terminal/payment', checkVirtualTerminalEnabled, handlePayment);
```

## 5. Database Queries Needed

```sql
-- Get merchant virtual terminal settings
SELECT 
  virtual_terminal_enabled,
  name as terminal_name
FROM merchants 
WHERE merchant_id = $1;

-- Update virtual terminal settings
UPDATE merchants 
SET 
  virtual_terminal_enabled = $2,
  updated_at = NOW()
WHERE merchant_id = $1;

-- Check if virtual terminals are enabled before login
SELECT virtual_terminal_enabled 
FROM merchants 
WHERE merchant_id = $1 
AND virtual_terminal_enabled = true;
```
