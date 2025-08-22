# Secure RLS Solution: Backend Endpoint Approach

## Problem
- RLS policies reference missing `app.current_merchant_id` parameter
- Disabling RLS creates security risks
- Frontend can't properly authenticate with Supabase RLS

## Solution: Secure Backend Endpoint

### 1. Create Backend API Endpoint
Create a secure backend endpoint (Node.js/Express) that:
- Validates Clerk JWT tokens
- Uses Supabase service role key (bypasses RLS securely)
- Enforces merchant-level access control

### 2. Backend Code Example
```javascript
// backend/routes/virtual-terminal.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const router = express.Router();

// Service role client (bypasses RLS securely)
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only!
);

// Secure endpoint for virtual terminal password
router.put('/virtual-terminal-password', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { merchantId, newPassword, salt } = req.body;
    const clerkUserId = req.auth.userId;
    
    // Validate user has access to this merchant
    const { data: user } = await supabaseService
      .from('users')
      .select('merchant_id')
      .eq('clerk_user_id', clerkUserId)
      .eq('approved', true)
      .single();
    
    if (!user || user.merchant_id !== merchantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Securely update password using service role
    const { data, error } = await supabaseService
      .from('virtual_terminal_passwords')
      .upsert({
        merchant_id: merchantId,
        password_hash: newPassword,
        salt: salt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' });
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 3. Frontend Changes
Update your frontend service to call the backend endpoint instead of direct Supabase:

```javascript
// In services.ts
updateVirtualTerminalPassword: async (userContext, currentPassword, newPassword) => {
  const response = await fetch('/api/virtual-terminal-password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await clerk.session.getToken()}`
    },
    body: JSON.stringify({
      merchantId: userContext.merchantId,
      newPassword,
      salt: generateSalt()
    })
  });
  
  return response.json();
}
```

## Benefits
✅ **Secure**: Service role key never exposed to frontend
✅ **RLS Compatible**: Backend bypasses RLS with proper authorization
✅ **Validated**: Clerk JWT validation ensures authenticated requests
✅ **Merchant Isolation**: Server-side validation prevents cross-merchant access

## Security Model
- **Frontend**: Clerk authentication only
- **Backend**: Validates Clerk tokens + enforces merchant access
- **Database**: RLS enabled, but bypassed by authorized service role
