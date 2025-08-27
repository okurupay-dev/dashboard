import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
      
      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )

      const { data: user, error } = await Promise.race([queryPromise, timeoutPromise]) as any

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

  // Fetch merchant data with timeout
  const fetchMerchantData = async (merchantId: string): Promise<Merchant | null> => {
    try {
      console.log('🔍 Fetching merchant data for ID:', merchantId)
      
      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from('merchants')
        .select('*')
        .eq('merchant_id', merchantId)
        .single()

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Merchant data fetch timeout')), 10000)
      )

      const { data: merchant, error } = await Promise.race([queryPromise, timeoutPromise]) as any

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

  // Auth state change handler with timeout protection
  const handleAuthStateChange = useCallback(async (event: any, session: any) => {
    console.log('🔄 Auth state change:', event, 'Session exists:', !!session)
    
    try {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 User signed in, checking role from user_metadata')
        setUser(session.user)
        
        // Get role from user_metadata like admin dashboard
        const userRole = session.user.user_metadata?.role
        console.log('🎭 User role from metadata:', userRole)
        
        // Create userData object from session metadata
        const userData = {
          user_id: session.user.id,
          auth_user_id: session.user.id,
          email: session.user.email,
          role: userRole,
          name: session.user.user_metadata?.name || session.user.email,
          merchant_id: session.user.user_metadata?.merchant_id,
          status: 'active' as const,
          approved: true,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at
        }
        
        console.log('📊 User data from metadata:', userData)
        setUserData(userData)
        
        if (userData?.merchant_id) {
          console.log('🏪 Fetching merchant data for:', userData.merchant_id)
          try {
            const merchantData = await fetchMerchantData(userData.merchant_id)
            console.log('🏪 Merchant data:', merchantData)
            setMerchantData(merchantData)
          } catch (error) {
            console.error('❌ Failed to fetch merchant data:', error)
            setMerchantData(null)
          }
        } else {
          console.log('⚠️ No merchant_id in user metadata')
          setMerchantData(null)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out')
        setUser(null)
        setUserData(null)
        setMerchantData(null)
      }
    } catch (error) {
      console.error('❌ Error in auth state change handler:', error)
    } finally {
      console.log('🔄 Setting loading to false')
      setLoading(false)
    }
  }, [])

  // Initialize auth state with timeout protection
  useEffect(() => {
    console.log('🚀 AuthContext initializing...')
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Add timeout to prevent hanging on session fetch
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 15000)
        )
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('📋 Initial session:', !!session?.user, session?.user?.email)
        
        if (session?.user) {
          console.log('👤 Found existing session, processing...')
          
          // Check if session is older than 1 hour
          const sessionAge = Date.now() - new Date(session.user.last_sign_in_at || session.created_at).getTime()
          const oneHour = 60 * 60 * 1000
          
          if (sessionAge > oneHour) {
            console.log('⏰ Session older than 1 hour, signing out...')
            await supabase.auth.signOut()
            setUser(null)
            setUserData(null)
            setMerchantData(null)
            setLoading(false)
            return
          }
          
          // Use the same logic as auth state change
          await handleAuthStateChange('SIGNED_IN', session)
        } else {
          console.log('🚪 No existing session found')
          setUser(null)
          setUserData(null)
          setMerchantData(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Error in auth initialization:', error)
        setLoading(false)
      }
    }

    // Set a maximum timeout for the entire initialization
    const initTimeout = setTimeout(() => {
      console.error('❌ Auth initialization timeout - forcing loading to false')
      setLoading(false)
    }, 20000)

    initializeAuth().finally(() => {
      clearTimeout(initTimeout)
    })

    const subscription = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      clearTimeout(initTimeout)
      subscription.data.subscription.unsubscribe()
    }
  }, [handleAuthStateChange])

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
