import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Test if environment variables are available
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceKey
      })
    }

    // Test Supabase connection
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    
    const { data, error } = await supabaseAdmin
      .from('pending_users')
      .select('count')
      .limit(1)

    if (error) {
      return res.status(500).json({
        error: 'Supabase connection failed',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Connection successful',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    })
  }
}
