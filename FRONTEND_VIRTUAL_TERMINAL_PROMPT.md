# Frontend Virtual Terminal Implementation: Handle Disabled State

## Task Overview
Update the virtual terminal frontend to handle when merchants have disabled virtual terminal access from their dashboard.

## What You Need to Implement

### 1. Update Login API Call
When making login requests, handle the new error response for disabled virtual terminals:

```javascript
// Virtual Terminal Login Function
const handleLogin = async (merchantId, password) => {
  try {
    const response = await fetch('/api/virtual-terminal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, password })
    });
    
    const data = await response.json();
    
    // Handle disabled virtual terminals
    if (!response.ok && data.error === 'VIRTUAL_TERMINALS_DISABLED') {
      // Show specific error message for disabled terminals
      showErrorMessage('Virtual terminals are currently disabled. Please contact your administrator.');
      return { success: false, disabled: true };
    }
    
    // Handle other errors (wrong password, etc.)
    if (!response.ok) {
      showErrorMessage(data.message || 'Login failed. Please check your credentials.');
      return { success: false };
    }
    
    // Success - proceed with normal login
    return { success: true, data };
    
  } catch (error) {
    console.error('Login error:', error);
    showErrorMessage('Connection error. Please try again.');
    return { success: false };
  }
};
```

### 2. Add Error Message Display
Create a clear error message component for when virtual terminals are disabled:

```javascript
// Error Message Component
const VirtualTerminalDisabledMessage = () => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center">
      <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <div>
        <h3 className="text-sm font-medium text-red-800">Virtual Terminals Disabled</h3>
        <p className="text-sm text-red-700 mt-1">
          Virtual terminal access has been disabled by the merchant administrator. 
          Please contact them to re-enable access.
        </p>
      </div>
    </div>
  </div>
);
```

### 3. Update Login Form State
Modify your login form to handle the disabled state:

```javascript
const [loginState, setLoginState] = useState({
  loading: false,
  error: null,
  disabled: false // New state for when terminals are disabled
});

// In your login handler
const onLogin = async (formData) => {
  setLoginState({ loading: true, error: null, disabled: false });
  
  const result = await handleLogin(formData.merchantId, formData.password);
  
  if (result.disabled) {
    // Virtual terminals are disabled
    setLoginState({ 
      loading: false, 
      error: null, 
      disabled: true 
    });
  } else if (!result.success) {
    // Other error (wrong password, etc.)
    setLoginState({ 
      loading: false, 
      error: 'Invalid credentials. Please try again.', 
      disabled: false 
    });
  } else {
    // Success - proceed with login
    handleSuccessfulLogin(result.data);
  }
};
```

### 4. Update Your Login Form JSX
```jsx
return (
  <div className="login-container">
    {/* Show disabled message if virtual terminals are disabled */}
    {loginState.disabled && <VirtualTerminalDisabledMessage />}
    
    {/* Show regular error message for other errors */}
    {loginState.error && !loginState.disabled && (
      <div className="error-message">
        {loginState.error}
      </div>
    )}
    
    {/* Login form */}
    <form onSubmit={onLogin}>
      <input 
        type="text" 
        placeholder="Merchant ID" 
        disabled={loginState.disabled} // Disable form if terminals are disabled
      />
      <input 
        type="password" 
        placeholder="Password" 
        disabled={loginState.disabled}
      />
      <button 
        type="submit" 
        disabled={loginState.loading || loginState.disabled}
      >
        {loginState.loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  </div>
);
```

## Key Points

1. **Check for specific error code**: `VIRTUAL_TERMINALS_DISABLED`
2. **Show clear message**: Explain that admin disabled access
3. **Disable form**: Don't allow login attempts when disabled
4. **Different from wrong password**: This is an admin setting, not user error

## Expected Behavior

- **Normal login**: Works as usual when virtual terminals are enabled
- **Disabled state**: Shows red warning, disables form, explains situation
- **Re-enabled**: User can refresh page or retry, form becomes active again

## Testing

1. Test normal login when virtual terminals are enabled
2. Have backend disable virtual terminals for test merchant
3. Verify login shows disabled message and blocks form
4. Have backend re-enable virtual terminals
5. Verify login works normally again
