# Admin Dashboard Migration Guide: Clerk → Supabase Auth

## 🚨 CRITICAL: Database Migration Required

Your merchant dashboard has been migrated from Clerk to Supabase Auth. **The admin dashboard must be updated to match.**

## Database Schema Changes

### ✅ **Completed Changes**
- Removed `clerk_user_id` column from `users` table
- Added `auth_user_id uuid REFERENCES auth.users(id)` 
- Applied comprehensive RLS policies for all 25+ tables
- Updated foreign key constraints

### 🔧 **Admin Dashboard Updates Needed**

#### 1. **User Management APIs**
```sql
-- OLD: Clerk-based user queries
SELECT * FROM users WHERE clerk_user_id = ?

-- NEW: Supabase Auth-based queries  
SELECT * FROM users WHERE auth_user_id = ?
```

#### 2. **User Creation Process**
```javascript
// OLD: Clerk user creation
const clerkUser = await clerkClient.users.createUser({...})
await db.users.create({ clerk_user_id: clerkUser.id, ... })

// NEW: Supabase Auth user creation
const { data, error } = await supabase.auth.admin.createUser({...})
await supabase.from('users').insert({ auth_user_id: data.user.id, ... })
```

#### 3. **Authentication Middleware**
```javascript
// OLD: Clerk JWT verification
const { userId } = getAuth(req)

// NEW: Supabase JWT verification  
const { data: { user } } = await supabase.auth.getUser(token)
```

## Required Admin Dashboard Changes

### **Backend APIs**
- [ ] Update all user lookup queries to use `auth_user_id`
- [ ] Replace Clerk SDK with Supabase Admin SDK
- [ ] Update user creation/invitation endpoints
- [ ] Modify authentication middleware

### **Frontend Components**
- [ ] Replace Clerk admin components with Supabase equivalents
- [ ] Update user management interfaces
- [ ] Modify invitation flow UI

### **Environment Variables**
```bash
# Remove Clerk variables
# CLERK_SECRET_KEY=...
# CLERK_WEBHOOK_SECRET=...

# Add Supabase admin variables
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
```

## Migration Steps for Admin Dashboard

### **Phase 1: Database Compatibility**
1. Run the `complete-migration-updated.sql` script
2. Verify all RLS policies are active
3. Test merchant data isolation

### **Phase 2: Backend Updates**
1. Install Supabase SDK: `npm install @supabase/supabase-js`
2. Replace Clerk imports with Supabase
3. Update all user-related queries
4. Test API endpoints

### **Phase 3: Frontend Updates**
1. Replace Clerk admin components
2. Update user management flows
3. Test invitation system

## Critical Considerations

### **Data Migration**
- **No user data loss** - all merchant/user relationships preserved
- **Invitation system intact** - `pending_users` table unchanged
- **Role-based access working** - RLS policies enforce merchant isolation

### **Security**
- **RLS policies active** - Users can only see their merchant data
- **Role-based permissions** - Admin/merchant/staff roles enforced
- **Invitation-only access** - No public registration

### **Testing Checklist**
- [ ] Admin can create new merchants
- [ ] Admin can invite users to merchants  
- [ ] Users can only see their merchant data
- [ ] Role permissions work correctly
- [ ] Invitation emails work
- [ ] User approval process functions

## Support

If you encounter issues:
1. Check RLS policies are applied correctly
2. Verify environment variables are set
3. Test with a single merchant first
4. Monitor Supabase logs for errors

**The merchant dashboard is ready and waiting for admin dashboard updates!**
