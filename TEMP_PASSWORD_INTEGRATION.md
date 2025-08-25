# Temp Password Integration for Merchant Dashboard

## Current Flow Status ✅
1. **Invitation Email** → User receives temp password via email
2. **Accept Invitation** → Redirects to login with email pre-filled
3. **Login with Temp Password** → User enters temp password from email
4. **Dashboard Detection** → **NEEDS IMPLEMENTATION** 
5. **Force Password Change** → **NEEDS IMPLEMENTATION**

## Required Implementation in Merchant Dashboard

### 1. Temp Password Detection in Auth
When a user logs in with a temp password, the auth system needs to set metadata:

```javascript
// During login process - set temp password flag
await supabase.auth.updateUser({
  data: {
    temp_password: true,
    password_change_required: true,
    temp_password_created_at: new Date().toISOString()
  }
});
```

### 2. Route Protection Middleware
Add this to every protected route in the dashboard:

```javascript
// In AuthContext or route protection
const { data: { user } } = await supabase.auth.getUser();

if (user?.user_metadata?.temp_password === true) {
  // Force redirect to password change page
  router.push('/change-password?required=true');
  return;
}
```

### 3. Password Change Page (/change-password)
Create a mandatory password change page:

```tsx
// pages/change-password.tsx
export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate password
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // Update password and clear temp flags
      await supabase.auth.updateUser({
        password: newPassword,
        data: {
          temp_password: false,
          password_change_required: false,
          password_changed_at: new Date().toISOString()
        }
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      setError('Failed to update password');
    }
  };
  
  return (
    <form onSubmit={handlePasswordChange}>
      <h1>Create Your Permanent Password</h1>
      <input 
        type="password" 
        placeholder="New Password (min 8 characters)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required 
      />
      <input 
        type="password" 
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required 
      />
      <button type="submit">Update Password</button>
    </form>
  );
}
```

## Integration Points

### A. Login Page Updates
The login page should handle the temp password flag from URL params:

```javascript
// Check URL params for temp password indication
const urlParams = new URLSearchParams(window.location.search);
const hasTempPassword = urlParams.get('temp_password') === 'true';
const email = urlParams.get('email');

if (hasTempPassword) {
  // Show message: "Please use your temporary password from the email"
  // Pre-fill email field
}
```

### B. Auth State Management
Update your auth context to track temp password status:

```javascript
const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

useEffect(() => {
  const checkTempPassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.temp_password === true) {
      setNeedsPasswordChange(true);
    }
  };
  
  checkTempPassword();
}, []);
```

## Testing the Flow

1. **Send invitation** → User gets email with temp password
2. **Click accept invitation** → Redirects to login page
3. **Login with temp password** → Should detect temp password flag
4. **Force password change** → Block all routes except /change-password
5. **Create new password** → Clear temp flags and allow dashboard access

## Security Notes

- Temp passwords should expire after 24 hours
- Block all dashboard routes until password is changed
- Log password change events for audit
- Invalidate old sessions after password change
