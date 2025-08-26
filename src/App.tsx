import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';
import Analytics from './components/analytics/Analytics';
import Settings from './components/settings/Settings';
import Terminals from './components/terminals/Terminals';
import VirtualTerminals from './components/terminals/VirtualTerminals';
import Staff from './components/staff/Staff';
import Wallets from './components/wallets/Wallets';
import SupabaseSignIn from './components/auth/SupabaseSignIn';
import AcceptInvitation from './components/auth/AcceptInvitation';
import ProtectedRoute from './components/auth/ProtectedRoute';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in" element={<SupabaseSignIn />} />
          <Route path="/signin" element={<SupabaseSignIn />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout children={<Outlet />} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="terminals/virtual" element={<VirtualTerminals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="staff" element={<Staff />} />
            <Route path="wallets" element={<Wallets />} />
          </Route>
          
          {/* Redirect unauthenticated users */}
          <Route path="*" element={
            <Navigate to="/sign-in" replace />
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
