import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // This bypasses RLS
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, invitationToken } = req.body

    // 1. Validate invitation token and get invitation data
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', invitationToken)
      .eq('status', 'invited')
      .eq('approval_status', 'approved')
      .single()

    if (inviteError || !invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation' })
    }

    // Use merchant_id_uuid if available, otherwise merchant_id
    const merchantId = invitation.merchant_id_uuid || invitation.merchant_id

    // 2. Create auth user with service role (bypasses RLS)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      user_metadata: {
        role: invitation.role,
        merchant_id: merchantId,
        invitation_accepted: true,
        first_time_password: true
      },
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // 3. Create user record in users table (bypasses RLS)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        merchant_id: merchantId,
        name: invitation.name,
        email: invitation.email,
        role: invitation.role === 'merchant_admin' ? 'merchant' : 'staff',
        status: 'active',
        approved: true
      })

    if (userError) {
      // If user creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: userError.message })
    }

    // 4. Update pending user status (bypasses RLS)
    await supabaseAdmin
      .from('pending_users')
      .update({ 
        status: 'accepted',
        approval_status: 'completed',
        accepted_at: new Date().toISOString(),
        auth_user_id: authData.user.id
      })
      .eq('id', invitation.id)

    // 5. Generate session for immediate login
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email
    })

    return res.status(200).json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      user: authData.user,
      redirectUrl: 'https://dashboard.okurupay.com'
    })

  } catch (error) {
    console.error('Invitation acceptance error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
