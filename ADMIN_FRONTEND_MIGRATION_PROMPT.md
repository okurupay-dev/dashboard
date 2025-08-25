# Admin Frontend Migration Prompt

**Copy and paste this prompt to your admin frontend team:**

---

## Migration Request: Update Admin Dashboard to Match Merchant Dashboard Changes

We've migrated the merchant dashboard from Clerk to Supabase Auth and need the admin dashboard updated to match. Here's what we changed and what you need to update:

### **Database Schema Changes Made**

1. **Removed** `clerk_user_id` column from `users` table
2. **Added** `auth_user_id uuid REFERENCES auth.users(id)` column
3. **Applied comprehensive RLS policies** for merchant data isolation
4. **All existing data preserved** - no merchant/user relationships lost

### **Frontend Changes Made on Merchant Side**

#### **Dependencies Updated**
```json
// REMOVED
"@clerk/clerk-react": "^5.41.1"
"@clerk/clerk-sdk-node": "^5.0.0"

// ADDED  
"@supabase/auth-helpers-react": "^0.5.0"
```

#### **Authentication System Replaced**
- **Removed**: `ClerkProvider`, `useUser`, `SignedIn/SignedOut` components
- **Added**: Custom `AuthProvider` context with `useAuth` hook
- **New Components**: `SupabaseSignIn`, `ProtectedRoute`

#### **App.tsx Structure**
```tsx
// OLD: ClerkProvider wrapper with complex auth logic
<ClerkProvider publishableKey={...}>
  <SignedIn>...</SignedIn>
  <SignedOut>...</SignedOut>
</ClerkProvider>

// NEW: Simple AuthProvider with role-based access
<AuthProvider>
  <ProtectedRoute>
    <DashboardLayout>...</DashboardLayout>
  </ProtectedRoute>
</AuthProvider>
```

#### **Data Fetching Hooks**
- **Replaced**: Clerk-based user context with Supabase RLS
- **New Hooks**: `useDashboardStats`, `useUserTransactions`, etc.
- **Automatic Security**: RLS policies handle merchant isolation

### **What You Need to Update in Admin Dashboard**

#### **1. Replace Clerk Components**
```tsx
// OLD: Clerk admin components
import { ClerkProvider, useUser } from '@clerk/clerk-react'

// NEW: Supabase equivalents
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
```

#### **2. Update User Management**
```tsx
// OLD: Clerk user creation
const clerkUser = await clerkClient.users.createUser({
  emailAddress: email,
  password: password
})

// NEW: Supabase user creation
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true
})

// Then create user record
await supabase.from('users').insert({
  auth_user_id: data.user.id,
  merchant_id,
  name,
  email,
  role,
  approved: true
})
```

#### **3. Update Database Queries**
```sql
-- OLD: All user lookups
WHERE clerk_user_id = ?

-- NEW: All user lookups  
WHERE auth_user_id = ?
```

#### **4. Environment Variables**
```bash
# REMOVE these from admin dashboard
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...

# ADD these to admin dashboard
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
```

#### **5. Authentication Middleware**
```javascript
// OLD: Clerk JWT verification
const { userId } = getAuth(req)

// NEW: Supabase JWT verification
const { data: { user } } = await supabase.auth.getUser(token)
```

### **Key Benefits of This Migration**

1. **Simplified RLS**: No more complex JWT parsing - `auth.uid()` works natively
2. **Better Security**: Built-in merchant isolation via database policies
3. **Cleaner Code**: No more Clerk-specific authentication logic
4. **Native Integration**: Supabase Auth works seamlessly with database

### **Testing Checklist**

After your updates, verify:
- [ ] Admin can create new merchants
- [ ] Admin can invite users to specific merchants
- [ ] Users only see their merchant's data (RLS working)
- [ ] Role-based permissions function correctly
- [ ] Invitation emails are sent properly
- [ ] User approval process works

### **Files to Focus On**

Update these types of files in your admin dashboard:
- User management components
- Authentication middleware
- API endpoints that create/manage users
- Environment configuration
- Package.json dependencies

The merchant dashboard is ready and waiting for these admin updates to complete the migration!

---

**Need help? Check the `ADMIN_MIGRATION_GUIDE.md` file for detailed technical specifications.**
