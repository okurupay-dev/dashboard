// Invitation service for handling merchant user invitations
import { supabase } from './client';

export interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  merchant_id: string;
  employee_id?: string;
  role_permissions?: any;
  pin_hash?: string;
  expires_at: string;
  approval_status: string;
  invitation_token: string;
}

export const invitationService = {
  // Validate invitation token and get pending user data
  async validateInvitation(token: string): Promise<{ data: InvitationData | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pending_users')
        .select('*')
        .eq('invitation_token', token)
        .eq('approval_status', 'approved')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: 'Invalid or expired invitation link.' };
        }
        return { data: null, error: `Error loading invitation: ${error.message}` };
      }

      if (!data) {
        return { data: null, error: 'Invitation not found or has expired.' };
      }

      // Check if invitation has expired
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        return { data: null, error: 'This invitation has expired. Please contact your administrator for a new invitation.' };
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        return { data: null, error: 'An account with this email already exists. Please sign in instead.' };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error validating invitation:', error);
      return { data: null, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  // Create user account from invitation
  async acceptInvitation(invitationData: InvitationData, password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: password,
        options: {
          data: {
            name: invitationData.name,
            role: invitationData.role,
            merchant_id: invitationData.merchant_id
          }
        }
      });

      if (authError) {
        return { success: false, error: `Failed to create account: ${authError.message}` };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account. Please try again.' };
      }

      // Create user record in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          merchant_id: invitationData.merchant_id,
          name: invitationData.name,
          email: invitationData.email,
          role: invitationData.role,
          employee_id: invitationData.employee_id,
          pin_hash: invitationData.pin_hash,
          status: 'active',
          approved: true
        });

      if (userError) {
        return { success: false, error: `Failed to create user profile: ${userError.message}` };
      }

      // Mark pending user as accepted
      const { error: updateError } = await supabase
        .from('pending_users')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationData.id);

      if (updateError) {
        console.warn('Warning: Could not update pending user status:', updateError);
        // Don't fail the process for this
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error during account creation:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  // Generate invitation URL
  generateInvitationUrl(token: string): string {
    const dashboardUrl = process.env.REACT_APP_MERCHANT_DASHBOARD_URL || 'https://dashboard.okurupay.com';
    return `${dashboardUrl}/accept-invitation?token=${token}`;
  }
};
