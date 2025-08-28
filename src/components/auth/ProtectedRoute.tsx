import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isApproved, loading, userData, user } = useAuth()

  console.log('🔒 ProtectedRoute check:', { 
    isAuthenticated, 
    isApproved, 
    loading, 
    hasUser: !!user,
    hasUserData: !!userData,
    userRole: userData?.role 
  })

  // Remove development mode bypass - always enforce authentication

  // Show loading while authentication is being checked OR if we don't have user data yet
  if (loading || (isAuthenticated && !userData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <img 
            src="/Loading.gif" 
            alt="Loading..." 
            className="w-42 h-42 mx-auto mb-4"
          />
          <div className="text-sm text-gray-600">Preparing your dashboard...</div>
        </div>
      </div>
    )
  }

  // If user is not authenticated, redirect to sign-in
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />
  }

  // If user is authenticated but not approved, show pending message
  if (isAuthenticated && !isApproved) {
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
