import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';
import Analytics from './components/analytics/Analytics';
import Settings from './components/settings/Settings';
import Terminals from './components/terminals/Terminals';
import Staff from './components/staff/Staff';
import Automations from './components/automations/Automations';
import Wallets from './components/wallets/Wallets';
import CustomSignIn from './components/auth/ClerkSignIn';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Component to check if user is authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();
  
  // In development mode, bypass all authentication
  if (isDevelopment) {
    return <>{children}</>;
  }
  
  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  
  // If user is not signed in, redirect to sign-in page
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  // User is authenticated - show protected content
  // (No approval check needed since invitations are only sent to pre-approved users)
  return <>{children}</>;
};

function App() {
  // In development mode, still use ClerkProvider but bypass authentication logic
  if (isDevelopment) {
    return (
      <Router>
        <ClerkProvider 
          publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || "pk_test_Z3VpZGluZy13ZXJld29sZi03Mi5jbGVyay5hY2NvdW50cy5kZXYk"}
          appearance={{
            variables: { colorPrimary: '#6366f1' },
            elements: {
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
              card: 'bg-white',
            },
          }}
        >
          <Routes>
            {/* Development mode - direct access to all routes */}
            <Route path="/" element={<DashboardLayout children={<Outlet />} />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="terminals" element={<Terminals />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="staff" element={<Staff />} />
              <Route path="automations" element={<Automations />} />
              <Route path="wallets" element={<Wallets />} />
            </Route>
            
            {/* Redirect any other paths to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClerkProvider>
      </Router>
    );
  }

  // Production mode - use Clerk authentication
  return (
    <Router>
      <ClerkProvider 
        publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsuZGFzaGJvYXJkLm9rdXJ1cGF5LmNvbSQ'}
        appearance={{
          variables: { colorPrimary: '#6366f1' },
          elements: {
            formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
            card: 'bg-white',
          },
        }}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/signin" element={
            <div>
              <CustomSignIn />
            </div>
          } />
          

          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout children={<Outlet />} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="staff" element={<Staff />} />
            <Route path="automations" element={<Automations />} />
            <Route path="wallets" element={<Wallets />} />
          </Route>
          
          {/* Redirect unauthenticated users */}
          <Route path="*" element={
            <Navigate to="/signin" replace />
          } />
        </Routes>
      </ClerkProvider>
    </Router>
  );
}

export default App;
