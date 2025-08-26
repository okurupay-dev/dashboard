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
      console.log('🔍 Fetching user data for auth_user_id:', authUserId)
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      console.log('📊 User data query result:', { user, error })

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
    
    const getSessionWithTimeout = async (timeoutMs = 10000) => {
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`getSession timeout after ${timeoutMs / 1000} seconds`))
        }, timeoutMs)

        try {
          const { data, error } = await supabase.auth.getSession()
          clearTimeout(timeout)
          resolve({ data, error })
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
    }

    getSessionWithTimeout()
      .then((result: any) => {
        const { data: { session } } = result
        console.log('📋 Initial session:', !!session?.user)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 User found, fetching user data...')
          console.log('📊 Fetching user data...')
          fetchUserData(session.user?.id).then(userData => {
            console.log('✅ User data fetched:', !!userData)
            setUserData(userData)
            
            if (userData) {
              console.log('🎭 User role from database:', userData.role)
              
              // Check role from database, not user_metadata
              if (userData.role === 'okuru_admin') {
                console.log('🔄 Redirecting okuru admin...')
                window.location.href = '/admin-dashboard'
                return
              }
            }
            
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
      
      // Add timeout to prevent hanging
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign in timeout')), 10000)
      )
      
      console.log('⏳ Waiting for Supabase auth response...')
      const { data, error } = await Promise.race([authPromise, timeoutPromise])
      
      console.log('📡 Supabase auth response received')
      
      if (error) {
        console.error('❌ Sign in error:', error)
        return { error }
      }
      
      console.log('✅ Sign in successful:', data.user?.email)
      console.log('👤 User ID:', data.user?.id)
      
      // Force update user state
      setUser(data.user)
      
      // Fetch user data from database
      if (data.user?.id) {
        console.log('🔍 About to fetch user data...')
        const userData = await fetchUserData(data.user.id)
        console.log('✅ User data loaded:', userData)
        setUserData(userData)
        
        if (userData?.merchant_id) {
          console.log('🏪 About to fetch merchant data...')
          const merchantData = await fetchMerchantData(userData.merchant_id)
          console.log('✅ Merchant data loaded:', merchantData)
          setMerchantData(merchantData)
        }
      }
      
      console.log('🎉 Sign in process completed successfully')
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
    isApproved: userData?.approved === true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
