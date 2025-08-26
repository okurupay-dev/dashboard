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
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        return null
      }

      return user as User
    } catch (error) {
      console.error('Error in fetchUserData:', error)
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
    
    // Get initial session with timeout
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('getSession timeout after 5 seconds')), 5000)
    )
    
    Promise.race([sessionPromise, timeoutPromise])
      .then((result: any) => {
        const { data: { session } } = result
        console.log('📋 Initial session:', !!session?.user)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 User found, checking role...')
          // Check user role and redirect super_admin to admin dashboard
          const userRole = session.user.user_metadata?.role
          console.log('🎭 User role:', userRole)
          
          if (userRole === 'super_admin') {
            console.log('🔄 Redirecting super admin...')
            window.location.href = '/admin-dashboard'
            return
          }
          
          // Only allow merchant_admin and staff roles in merchant dashboard
          if (!['merchant_admin', 'staff'].includes(userRole)) {
            console.error('❌ Unauthorized role for merchant dashboard:', userRole)
            supabase.auth.signOut()
            return
          }

          console.log('📊 Fetching user data...')
          fetchUserData(session.user?.id).then(userData => {
            console.log('✅ User data fetched:', !!userData)
            setUserData(userData)
            if (userData?.merchant_id) {
              console.log('🏪 Fetching merchant data...')
              fetchMerchantData(userData.merchant_id).then(merchantData => {
                console.log('✅ Merchant data fetched:', !!merchantData)
                setMerchantData(merchantData)
              })
            }
          }).catch(error => {
            console.error('❌ Error fetching user data:', error)
          })
        }
        
        console.log('✅ AuthContext initialization complete')
        setLoading(false)
      })
      .catch(error => {
        console.error('❌ Error getting session:', error)
        console.log('⚠️ Setting loading to false due to error')
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Check user role on auth state change
          const userRole = session.user.user_metadata?.role
          if (userRole === 'super_admin') {
            window.location.href = '/admin-dashboard'
            return
          }
          
          if (!['merchant_admin', 'staff'].includes(userRole)) {
            console.error('Unauthorized role for merchant dashboard:', userRole)
            supabase.auth.signOut()
            return
          }

          const userData = await fetchUserData(session.user?.id)
          setUserData(userData)
          if (userData?.merchant_id) {
            const merchantData = await fetchMerchantData(userData.merchant_id)
            setMerchantData(merchantData)
          }
        } else {
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
      console.log('🔑 Supabase Anon Key exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY)
      
      // Skip connection test and try auth directly
      console.log('🧪 Skipping connection test, trying auth directly...')
      
      console.log('⏳ Starting sign in request...')
      
      // Try sign-in with detailed logging
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('📡 Sign in response received')
      
      if (error) {
        console.error('❌ Sign in error:', error)
        console.error('❌ Error code:', error.status)
        console.error('❌ Error message:', error.message)
        return { error }
      }
      
      console.log('✅ Sign in successful:', data.user?.email)
      console.log('✅ User data:', data.user)
      return { error: null }
    } catch (error) {
      console.error('❌ Sign in failed with exception:', error)
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
    isAuthenticated: !!user,
    isApproved: userData?.approved ?? false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
