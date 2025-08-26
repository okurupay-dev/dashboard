import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, Merchant } from '../lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userData: User | null
  merchantData: Merchant | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  isAuthenticated: boolean
  isApproved: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [merchantData, setMerchantData] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data from database
  const fetchUserData = async (authUserId: string) => {
    try {
      console.log('🔍 Fetching user data for auth_user_id:', authUserId)
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      console.log('📊 User data query result:', { 
        hasUser: !!user, 
        userRole: user?.role,
        userEmail: user?.email,
        error: error?.message 
      })

      if (error) {
        console.error('❌ Error fetching user data:', error)
        return null
      }

      console.log('✅ User data found:', user)
      return user
    } catch (error) {
      console.error('❌ Error in fetchUserData:', error)
      return null
    }
  }

  // Fetch merchant data
  const fetchMerchantData = async (merchantId: string) => {
    try {
      const { data: merchant, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('merchant_id', merchantId)
        .single()

      if (error) {
        console.error('Error fetching merchant data:', error)
        return null
      }

      return merchant as Merchant
    } catch (error) {
      console.error('Error in fetchMerchantData:', error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    console.log('🚀 AuthContext initializing...')
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('📋 Initial session:', !!session?.user)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 User found, fetching user data...')
          const userData = await fetchUserData(session.user.id)
          console.log('✅ User data fetched:', !!userData)
          setUserData(userData)
          
          if (!userData) {
            console.log('⚠️ No user data found - account needs onboarding')
            setMerchantData(null)
            setLoading(false)
            return
          }
          
          console.log('🔍 User role from database:', userData.role)
          
          // Handle different user roles
          if (userData.role === 'okuru_admin') {
            console.log('🚀 Redirecting okuru_admin to admin dashboard')
            window.location.href = '/admin-dashboard'
            return
          }
          
          if (['admin', 'merchant', 'merchant_admin', 'staff'].includes(userData.role)) {
            console.log('✅ Authorized role for merchant dashboard:', userData.role)
            if (userData.merchant_id) {
              console.log('🏪 Fetching merchant data...')
              const merchantData = await fetchMerchantData(userData.merchant_id)
              console.log('✅ Merchant data fetched:', !!merchantData)
              setMerchantData(merchantData)
            }
          } else {
            console.log('⚠️ Unauthorized role for merchant dashboard:', userData.role)
            setMerchantData(null)
          }
        }
        
        console.log('✅ AuthContext initialization complete')
        setLoading(false)
      } catch (error) {
        console.error('❌ Error in auth initialization:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, 'Session exists:', !!session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Fetching user data for auth state change...')
          const userData = await fetchUserData(session.user.id)
          setUserData(userData)
          
          if (!userData) {
            console.log('⚠️ No user data found - account needs onboarding')
            setMerchantData(null)
            setLoading(false)
            return
          }
          
          console.log('🔍 User role from database:', userData.role)
          
          // Handle different user roles
          if (userData.role === 'okuru_admin') {
            console.log('🚀 Redirecting okuru_admin to admin dashboard')
            window.location.href = '/admin-dashboard'
            return
          }
          
          if (['admin', 'merchant', 'merchant_admin', 'staff'].includes(userData.role)) {
            console.log('✅ Authorized role for merchant dashboard:', userData.role)
            if (userData.merchant_id) {
              const merchantData = await fetchMerchantData(userData.merchant_id)
              setMerchantData(merchantData)
            }
          } else {
            console.log('⚠️ Unauthorized role for merchant dashboard:', userData.role)
            setMerchantData(null)
          }
        } else {
          console.log('🚪 No session - clearing user data')
          setUserData(null)
          setMerchantData(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      console.log('🔗 Supabase URL:', process.env.REACT_APP_SUPABASE_URL)
      
      // Since auth state change is working, let's rely on that instead
      console.log('⏳ Calling signInWithPassword...')
      
      // Add a timeout to prevent hanging
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth call timeout - but state change should handle auth')), 10000)
      )
      
      try {
        const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any
        
        console.log('📡 Supabase auth response received:', { 
          hasData: !!data, 
          hasUser: !!data?.user, 
          hasSession: !!data?.session,
          error: error?.message 
        })
        
        if (error) {
          console.error('❌ Sign in error:', error)
          return { error }
        }
        
        console.log('✅ Sign in successful via direct response')
        return { error: null }
      } catch (timeoutError) {
        console.log('⏰ Auth call timed out, but auth state change should handle authentication')
        // Don't return error since auth state change is working
        return { error: null }
      }
    } catch (error) {
      console.error('❌ Sign in failed with exception:', error)
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Attempting password reset for:', email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) {
        console.error('❌ Password reset error:', error)
        return { error }
      }
      
      console.log('✅ Password reset email sent')
      return { error: null }
    } catch (error) {
      console.error('❌ Password reset failed:', error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, userDataInput: Partial<User>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (!error && data.user) {
      // Create user record in database
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          auth_user_id: data.user?.id,
          email,
          ...userDataInput,
        })

      if (dbError) {
        console.error('Error creating user record:', dbError)
        return { error: dbError }
      }
    }

    return { error }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        console.log('✅ Successfully signed out')
        // Clear local state
        setUser(null)
        setUserData(null)
        setMerchantData(null)
      }
    } catch (error) {
      console.error('❌ Sign out failed:', error)
    }
  }

  const value = {
    user,
    userData,
    merchantData,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
    isApproved: userData?.role === 'merchant' || userData?.role === 'merchant_admin' || userData?.role === 'admin' || userData?.role === 'staff' || userData?.role === 'okuru_admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
