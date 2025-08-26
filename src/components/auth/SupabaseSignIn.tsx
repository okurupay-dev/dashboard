import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import logo from '../../assets/images/logo.svg'

const SupabaseSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  
  const { signIn, resetPassword, isAuthenticated, isApproved } = useAuth()

  // Redirect if already authenticated and approved
  if (isAuthenticated && isApproved) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('🚀 SupabaseSignIn: Form submitted')
    console.log('📧 Email:', email)
    
    try {
      const { error } = await signIn(email, password)
      
      console.log('🔄 SupabaseSignIn: signIn completed')
      
      if (error) {
        console.error('❌ SupabaseSignIn: Sign in error:', error)
        setError(error.message || 'Sign in failed')
      } else {
        console.log('✅ Sign in successful - letting auth state change handle navigation')
        // Don't force reload - let the auth state change and redirect logic handle it
      }
    } catch (err) {
      console.error('❌ SupabaseSignIn: Exception during sign in:', err)
      setError('An unexpected error occurred')
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setResetLoading(true)
    setError(null)
    setResetMessage(null)

    try {
      const { error } = await resetPassword(email)
      
      if (error) {
        setError(error.message || 'Failed to send reset email')
      } else {
        setResetMessage('Password reset email sent! Check your inbox.')
        setShowForgotPassword(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
    
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-auto flex items-center justify-center">
            <img
              className="h-12 w-auto"
              src={logo}
              alt="Okuru"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your merchant dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {resetMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{resetMessage}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            {!showForgotPassword ? (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Sending...' : 'Send reset email'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SupabaseSignIn
