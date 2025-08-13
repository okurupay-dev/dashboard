import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';
import Analytics from './components/analytics/Analytics';
import Settings from './components/settings/Settings';
import Terminals from './components/terminals/Terminals';
import Staff from './components/staff/Staff';
import Automations from './components/automations/Automations';
import CustomSignIn from './components/auth/ClerkSignIn';
import PendingReview from './components/auth/PendingReview';
import { useUserMetadata } from './lib/clerk/sessionUtils';

// Component to check if user is approved and route accordingly
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, metadata, isApproved } = useUserMetadata();
  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  
  if (!isApproved) {
    return <Navigate to="/pending-review" replace />;
  }
  
  return <>{children}</>;
};

function App() {
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
          
          <Route path="/pending-review" element={
            <div>
              <PendingReview />
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
