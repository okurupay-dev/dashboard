# Migration Plan: Clerk → Supabase Auth

## Benefits of Switching

### ✅ **Much Easier RLS**
- Native `auth.uid()` function works automatically
- No JWT token parsing needed
- Clean, simple policy syntax

### ✅ **Better Integration**
- Built-in user management
- Native role-based access
- Seamless database integration

### ✅ **Simplified Code**
- Remove Clerk dependencies
- No custom JWT handling
- Direct Supabase client usage

## Database Schema Changes Needed

```sql
-- Update users table to use Supabase Auth
ALTER TABLE public.users 
DROP COLUMN clerk_user_id,
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
```

## Frontend Changes Required

### 1. Replace Clerk Components
```tsx
// OLD: Clerk
import { useUser } from '@clerk/clerk-react';

// NEW: Supabase Auth
import { useUser } from '@supabase/auth-helpers-react';
```

### 2. Update Authentication Logic
```tsx
// OLD: Complex Clerk integration
const { user } = useUser();
const token = await user.getToken();

// NEW: Simple Supabase auth
const { user } = useUser();
// RLS works automatically!
```

### 3. Simplified Services
```tsx
// OLD: Manual merchant validation
validateMerchantAccess(userContext.merchantId, userContext.merchantId);

// NEW: RLS handles everything
const { data } = await supabase.from('transactions').select('*');
```

## Migration Steps

1. **Setup Supabase Auth** in project
2. **Update database schema** (add auth_user_id column)
3. **Apply RLS policies** (much simpler syntax)
4. **Replace Clerk components** with Supabase Auth
5. **Remove Clerk dependencies**
6. **Test transaction page** (should work immediately)

## Estimated Time: 2-3 hours vs weeks of Clerk JWT debugging

Would you like to proceed with this migration?
