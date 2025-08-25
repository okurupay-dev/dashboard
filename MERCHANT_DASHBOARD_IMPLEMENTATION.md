# Merchant Dashboard Implementation Requirements

## Overview
The merchant dashboard needs to handle temporary password users and force password changes before allowing dashboard access.

## 1. Authentication Flow Changes

### Detection Logic
```javascript
// In AuthContext or login handler
const user = await supabase.auth.getUser();
const hasTempPassword = user?.user_metadata?.temp_password === true;
const passwordChangeRequired = user?.user_metadata?.password_change_required === true;

if (hasTempPassword || passwordChangeRequired) {
  // Force redirect to password change
  router.push('/change-password?required=true');
  return;
}
```

### Login Flow Updates
- Check `user_metadata.temp_password` flag on successful login
- Block dashboard access until password is changed
- Redirect to `/change-password` before any dashboard routes

## 2. New Password Change Page

### Route: `/change-password`

```tsx
// components/auth/ChangePassword.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const isRequired = router.query.required === 'true';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Update Supabase Auth password
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
        data: {
          temp_password: false,
          password_change_required: false,
          password_changed_at: new Date().toISOString()
        }
      });

      if (authError) throw authError;

      // Update user database record
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: dbError } = await supabase
          .from('users')
          .update({
            password_change_required: false,
            temp_password_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('auth_user_id', user.id);

        if (dbError) throw dbError;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Password change error:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRequired ? 'Create Your Password' : 'Change Password'}
          </h2>
          {isRequired && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Please create a permanent password to continue
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handlePasswordChange}>
          <div>
            <label htmlFor="password" className="sr-only">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="New Password (min 8 characters)"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Confirm New Password"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 3. Route Protection Middleware

### Higher-Order Component for Route Protection
```tsx
// components/auth/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export function withAuthProtection<T extends {}>(Component: React.ComponentType<T>) {
  return function ProtectedComponent(props: T) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && user) {
        // Check for temp password or password change required
        const needsPasswordChange = 
          user.user_metadata?.temp_password === true ||
          user.user_metadata?.password_change_required === true;

        if (needsPasswordChange && router.pathname !== '/change-password') {
          router.push('/change-password?required=true');
          return;
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      router.push('/login');
      return null;
    }

    // Check temp password on every render
    const needsPasswordChange = 
      user.user_metadata?.temp_password === true ||
      user.user_metadata?.password_change_required === true;

    if (needsPasswordChange && router.pathname !== '/change-password') {
      return null; // Will redirect via useEffect
    }

    return <Component {...props} />;
  };
}
```

### Usage in Pages
```tsx
// pages/dashboard.tsx
import { withAuthProtection } from '@/components/auth/ProtectedRoute';

function Dashboard() {
  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}

export default withAuthProtection(Dashboard);
```

## 4. Database Integration

### User Table Updates Required
```sql
-- Add columns if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_change_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamp with time zone;

-- Update existing temp password users
UPDATE public.users 
SET password_change_required = true,
    temp_password_expires_at = NOW() + INTERVAL '24 hours'
WHERE auth_user_id IN (
  SELECT id FROM auth.users 
  WHERE raw_user_meta_data->>'temp_password' = 'true'
);
```

### Database Query Helper
```typescript
// lib/database/userQueries.ts
export async function getUserPasswordStatus(authUserId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('password_change_required, temp_password_expires_at')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw error;
  return data;
}

export async function clearTempPasswordFlags(authUserId: string) {
  const { error } = await supabase
    .from('users')
    .update({
      password_change_required: false,
      temp_password_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('auth_user_id', authUserId);

  if (error) throw error;
}
```

## 5. AuthContext Updates

```tsx
// contexts/AuthContext.tsx - Add to existing context
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  needsPasswordChange: boolean;
  // ... other existing properties
}>({
  user: null,
  loading: true,
  needsPasswordChange: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const needsPasswordChange = useMemo(() => {
    if (!user) return false;
    return user.user_metadata?.temp_password === true ||
           user.user_metadata?.password_change_required === true;
  }, [user]);

  // ... rest of existing AuthProvider logic

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      needsPasswordChange,
      // ... other existing values
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## 6. Implementation Checklist

### Phase 1: Core Password Change
- [ ] Create `/change-password` page component
- [ ] Add password validation logic
- [ ] Implement Supabase Auth password update
- [ ] Update user database record after password change

### Phase 2: Route Protection
- [ ] Create `withAuthProtection` HOC
- [ ] Add temp password detection logic
- [ ] Implement automatic redirects
- [ ] Protect all dashboard routes

### Phase 3: Database Updates
- [ ] Add required columns to users table
- [ ] Create helper functions for password status
- [ ] Update existing temp password users
- [ ] Add audit logging for password changes

### Phase 4: User Experience
- [ ] Add loading states during password update
- [ ] Implement proper error handling
- [ ] Add success messaging
- [ ] Test complete flow end-to-end

## 7. Security Considerations

- **HTTPS Only**: Ensure all password operations use HTTPS
- **Rate Limiting**: Implement rate limiting on password change attempts
- **Audit Logging**: Log all password change events
- **Session Management**: Invalidate old sessions after password change
- **Temp Password Expiry**: Enforce 24-hour expiration on temp passwords

## 8. Testing Strategy

### Unit Tests
- Password validation logic
- Database update functions
- Route protection middleware

### Integration Tests
- Complete password change flow
- Redirect behavior
- Database state changes

### E2E Tests
- User receives invitation → creates password → accesses dashboard
- Temp password expiry handling
- Error scenarios (network failures, validation errors)
