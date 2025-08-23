import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isApproved, loading } = useAuth()

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In development mode, bypass all authentication
  if (isDevelopment) {
    return <>{children}</>
  }

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // If user is not authenticated, redirect to sign-in
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  // If user is authenticated but not approved, show pending message
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Account Pending Approval</h2>
            <p className="mt-4 text-gray-600">
              Your account is currently under review. You'll receive access once approved by your merchant administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated and approved
  return <>{children}</>
}

export default ProtectedRoute
