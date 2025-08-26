import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

// Create a single instance to avoid multiple client warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

// Database types
export interface User {
  user_id: string
  auth_user_id: string
  merchant_id: string
  name: string
  email: string
  role: 'admin' | 'merchant' | 'merchant_admin' | 'staff' | 'okuru_admin'
  employee_id?: string
  pin_hash?: string
  status: 'active' | 'inactive'
  approved: boolean
  created_at: string
  updated_at: string
}

export interface Merchant {
  merchant_id: string
  name: string
  logo_url?: string
  business_address?: string
  website?: string
  industry?: string
  status: 'active' | 'inactive' | 'suspended'
  business_phone?: string
  business_email?: string
  virtual_terminal_enabled: boolean
  payout_address?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  transaction_id: string
  merchant_id: string
  location_id?: string
  terminal_id?: string
  staff_user_id?: string
  amount_fiat: number
  fiat_currency: string
  amount_crypto: number
  crypto_currency: string
  blockchain: string
  tx_hash?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  confirmations: number
  required_confirmations: number
  fee?: number
  tip?: number
  notes?: string
  automation_triggered: boolean
  automation_type?: string
  created_at: string
  updated_at: string
}
