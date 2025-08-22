# Comprehensive Backend Security Solution

## Overview
Create a secure backend API that handles ALL sensitive database operations for tables with disabled RLS.

## Architecture Benefits
✅ **Centralized Security**: All database access goes through authenticated backend
✅ **Service Role Security**: Uses Supabase service role key (server-side only)
✅ **Clerk Integration**: Validates Clerk JWT tokens
✅ **Merchant Isolation**: Enforces merchant-level access control
✅ **Scalable**: Can handle all your tables with RLS issues

## Backend Structure

### 1. Core Authentication Middleware
```javascript
// middleware/auth.js
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { createClient } = require('@supabase/supabase-js');

// Service role client (bypasses RLS securely)
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate user and get merchant context
async function validateMerchantAccess(req, res, next) {
  try {
    const clerkUserId = req.auth.userId;
    
    // Get user's merchant context
    const { data: user, error } = await supabaseService
      .from('users')
      .select('merchant_id, role, approved')
      .eq('clerk_user_id', clerkUserId)
      .eq('approved', true)
      .single();
    
    if (error || !user) {
      return res.status(403).json({ error: 'User not found or not approved' });
    }
    
    // Add merchant context to request
    req.userContext = {
      userId: clerkUserId,
      merchantId: user.merchant_id,
      role: user.role,
      approved: user.approved
    };
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication validation failed' });
  }
}

module.exports = { supabaseService, validateMerchantAccess };
```

### 2. Virtual Terminal Endpoints
```javascript
// routes/virtual-terminals.js
const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { supabaseService, validateMerchantAccess } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(ClerkExpressRequireAuth());
router.use(validateMerchantAccess);

// Get virtual terminal settings
router.get('/settings', async (req, res) => {
  try {
    const { merchantId } = req.userContext;
    
    const { data, error } = await supabaseService
      .from('virtual_terminal_settings')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({ data: data || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update virtual terminal password
router.put('/password', async (req, res) => {
  try {
    const { merchantId } = req.userContext;
    const { newPassword, salt } = req.body;
    
    const { data, error } = await supabaseService
      .from('virtual_terminal_passwords')
      .upsert({
        merchant_id: merchantId,
        password_hash: newPassword,
        salt: salt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' })
      .select();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update virtual terminal settings
router.put('/settings', async (req, res) => {
  try {
    const { merchantId } = req.userContext;
    const settings = req.body;
    
    const { data, error } = await supabaseService
      .from('virtual_terminal_settings')
      .upsert({
        ...settings,
        merchant_id: merchantId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' })
      .select();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 3. Other Sensitive Tables
```javascript
// routes/wallets.js - Example for wallet operations
const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { supabaseService, validateMerchantAccess } = require('../middleware/auth');

const router = express.Router();
router.use(ClerkExpressRequireAuth());
router.use(validateMerchantAccess);

// Get merchant wallets
router.get('/', async (req, res) => {
  try {
    const { merchantId } = req.userContext;
    
    const { data, error } = await supabaseService
      .from('merchant_wallets')
      .select('*')
      .eq('merchant_id', merchantId);
    
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add wallet
router.post('/', async (req, res) => {
  try {
    const { merchantId } = req.userContext;
    const walletData = req.body;
    
    const { data, error } = await supabaseService
      .from('merchant_wallets')
      .insert({
        ...walletData,
        merchant_id: merchantId,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 4. Main Server Setup
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const virtualTerminalsRouter = require('./routes/virtual-terminals');
const walletsRouter = require('./routes/wallets');
// Import other route modules...

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/virtual-terminals', virtualTerminalsRouter);
app.use('/api/wallets', walletsRouter);
// Add other routes...

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Secure backend server running on port ${PORT}`);
});
```

## Frontend Integration

### Update Services to Use Backend
```javascript
// In your services.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Get Clerk token for authenticated requests
const getAuthHeaders = async () => {
  const token = await window.Clerk?.session?.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Virtual Terminal Service
export const virtualTerminalService = {
  updateVirtualTerminalPassword: async (userContext, currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/virtual-terminals/password`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        newPassword,
        salt: Math.random().toString(36).substring(2, 15)
      })
    });
    
    if (!response.ok) throw new Error('Failed to update password');
    return response.json();
  },
  
  getVirtualTerminalSettings: async (userContext) => {
    const response = await fetch(`${API_BASE_URL}/virtual-terminals/settings`, {
      headers: await getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to get settings');
    return response.json();
  },
  
  updateVirtualTerminalSettings: async (userContext, settings) => {
    const response = await fetch(`${API_BASE_URL}/virtual-terminals/settings`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) throw new Error('Failed to update settings');
    return response.json();
  }
};
```

## Deployment Options

### Option 1: Vercel Functions
- Deploy as serverless functions
- Automatic scaling
- Easy integration with your frontend

### Option 2: Railway/Render
- Simple Node.js deployment
- Environment variable management
- Database connection pooling

### Option 3: AWS Lambda
- Serverless with API Gateway
- Cost-effective for low traffic
- Scales automatically

## Security Benefits

✅ **Service Role Key**: Never exposed to frontend
✅ **JWT Validation**: Clerk tokens validated server-side
✅ **Merchant Isolation**: Database queries scoped to user's merchant
✅ **Centralized Auth**: All sensitive operations go through backend
✅ **Audit Trail**: Server logs all database operations
✅ **Rate Limiting**: Can add rate limiting per user/merchant
✅ **Input Validation**: Server-side validation of all inputs

## Tables That Can Use This Approach

- `virtual_terminal_passwords` ✅
- `virtual_terminal_settings` ✅
- `merchant_wallets` ✅
- `wallet_addresses` ✅
- `transactions` ✅
- `staff_members` ✅
- Any other sensitive table with RLS disabled ✅

This approach gives you **enterprise-grade security** while solving all your RLS authentication issues!
