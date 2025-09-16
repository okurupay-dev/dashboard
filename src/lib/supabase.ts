import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://sjrnpnajbrxqlgttdiiu.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcm5wbmFqYnJ4cWxndHRkaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDE4OTcsImV4cCI6MjA3MDcxNzg5N30.oLMXQTyzQNa2ccg8-A9pr1KGn-DMgUec7_8vRG6kbrg'

// Create a single instance to avoid multiple client warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
  business_street?: string
  business_city?: string
  business_state?: string
  business_country?: string
  business_postal_code?: string
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

export interface TaxSettings {
  tax_id: string
  merchant_id: string
  tax_name: string
  tax_rate: number
  is_enabled: boolean
  auto_calculate: boolean
  applies_to_products: boolean
  applies_to_services: boolean
  tax_jurisdiction?: string
  tax_registration_number?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TaxCalculation {
  calculation_id: string
  transaction_id?: string
  invoice_id?: string
  merchant_id: string
  tax_setting_id: string
  base_amount: number
  tax_amount: number
  tax_rate: number
  calculation_method: 'percentage' | 'fixed' | 'compound'
  created_at: string
}
