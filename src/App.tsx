import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';
import Invoices from './components/invoices/Invoices';
import InvoiceCreate from './components/invoices/InvoiceCreate';
import InvoiceCreateModern from './components/invoices/InvoiceCreateModern';
import InvoiceDetail from './components/invoices/InvoiceDetail';
import PublicInvoice from './components/invoices/PublicInvoice';
import InvoicePayment from './components/invoices/InvoicePayment';
import Analytics from './components/analytics/Analytics';
import Reports from './components/reports/Reports';
import Taxes from './components/taxes/Taxes';
import Settings from './components/settings/Settings';
import Terminals from './components/terminals/Terminals';
import VirtualTerminals from './components/terminals/VirtualTerminals';
import Staff from './components/staff/Staff';
import Wallets from './components/wallets/Wallets_clean';
import Products from './components/products/Products';
import Payroll from './components/payroll/Payroll';
import SupabaseSignIn from './components/auth/SupabaseSignIn';
import AcceptInvitation from './components/auth/AcceptInvitation';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in" element={<SupabaseSignIn />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/invoice/:publicId" element={<PublicInvoice />} />
          <Route path="/pay/:publicId" element={<InvoicePayment />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout children={<Outlet />} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="/invoices/create" element={<InvoiceCreateModern />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="terminals/virtual" element={<VirtualTerminals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="taxes" element={<Taxes />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
            <Route path="staff" element={<Staff />} />
            <Route path="wallets" element={<Wallets />} />
            <Route path="payroll" element={<Payroll />} />
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
