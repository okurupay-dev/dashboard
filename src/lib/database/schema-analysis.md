# Schema Analysis for User Invitations & Role-Based Access

## Current Schema Review

### ✅ **User Invitation System (Already Good)**
```sql
-- pending_users table handles invitations perfectly
CREATE TABLE public.pending_users (
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  merchant_id_uuid uuid REFERENCES merchants(merchant_id),
  approval_status character varying DEFAULT 'pending',
  initiated_by uuid REFERENCES users(user_id),
  approved_by uuid REFERENCES users(user_id),
  expires_at timestamp DEFAULT (now() + '7 days'::interval)
);
```

### ✅ **Role-Based System (Well Designed)**
```sql
-- users table with proper role constraints
CREATE TABLE public.users (
  role character varying CHECK (role IN ('admin', 'merchant', 'staff', 'okuru_admin')),
  approved boolean DEFAULT false,
  merchant_id uuid REFERENCES merchants(merchant_id)
);

-- staff_permissions for granular control
CREATE TABLE public.staff_permissions (
  role_name character varying NOT NULL,
  permissions jsonb DEFAULT '{}',
  merchant_id uuid REFERENCES merchants(merchant_id)
);
```

## Recommended Changes for Supabase Auth

### 1. Update Users Table
```sql
-- Replace clerk_user_id with auth_user_id
ALTER TABLE public.users 
DROP COLUMN clerk_user_id,
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) UNIQUE;
```

### 2. Update Pending Users Table
```sql
-- Add auth integration for pending users
ALTER TABLE public.pending_users
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
```

## Role-Based RLS Policies

### **Admin Role** - Full merchant access
```sql
CREATE POLICY "Admins see all merchant data" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = transactions.merchant_id
    AND role = 'admin'
    AND approved = true
  )
);
```

### **Merchant Role** - Full merchant access
```sql
CREATE POLICY "Merchants see their data" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND merchant_id = transactions.merchant_id
    AND role = 'merchant'
    AND approved = true
  )
);
```

### **Staff Role** - Limited access based on permissions
```sql
CREATE POLICY "Staff see permitted data" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.staff_permissions sp ON u.merchant_id = sp.merchant_id
    WHERE u.auth_user_id = auth.uid()
    AND u.merchant_id = transactions.merchant_id
    AND u.role = 'staff'
    AND u.approved = true
    AND sp.permissions->>'view_transactions' = 'true'
  )
);
```

## User Invitation Flow

1. **Admin invites user** → Creates record in `pending_users`
2. **User accepts invitation** → Creates Supabase Auth account
3. **System moves user** → From `pending_users` to `users` table
4. **RLS activates** → User gets role-based access automatically

## Summary

Your current schema is **excellent** for invitation-based, role-based access! The main changes needed:

1. Replace `clerk_user_id` with `auth_user_id`
2. Apply role-based RLS policies
3. Update frontend to use Supabase Auth

The invitation system and role structure are already perfectly designed.
