import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  merchant_id: string;
  expires_at: string;
  status: string;
  approval_status: string;
  merchant_name: string;
  merchants?: { name: string };
}

const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation(token as string);
    } else {
      setError('No invitation token provided');
      setLoading(false);
    }
  }, [token]);

  const validateInvitation = async (invitationToken: string) => {
    try {
      console.log('🔍 Validating invitation token:', invitationToken);
      
      // First, let's check what invitation exists with this token (any status)
      const { data: allData, error: debugError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('invitation_token', invitationToken);
      
      console.log('🔍 All pending users with this token:', allData);
      
      // First, get the pending user data - include both merchant ID fields
      const { data, error } = await supabase
        .from('pending_users')
        .select(`
          id,
          email,
          name,
          role,
          merchant_id,
          merchant_id_uuid,
          expires_at,
          status,
          approval_status
        `)
        .eq('invitation_token', invitationToken)
        .single();

      console.log('🔍 Pending user data:', { data, error });
      console.log('🔍 merchant_id_uuid value:', data?.merchant_id_uuid);
      console.log('🔍 merchant_id value:', data?.merchant_id);
      console.log('🔍 Full data object:', JSON.stringify(data, null, 2));

      // Check both possible merchant ID fields
      const merchantId = data?.merchant_id_uuid || data?.merchant_id;
      console.log('🔍 Using merchant ID:', merchantId);

      if (merchantId) {
        // Separately fetch merchant data
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('name, id')
          .eq('id', merchantId)
          .single();
        
        console.log('🏪 Merchant query result:', { merchantData, merchantError });
        
        // Add merchant data to the result
        if (merchantData) {
          (data as any).merchants = merchantData;
        } else if (merchantError) {
          console.error('❌ Merchant query failed:', merchantError);
          // Set a fallback merchant name with the ID for debugging
          (data as any).merchants = { name: `Merchant (${merchantId.slice(0, 8)}...)` };
        }
      } else {
        console.log('❌ No merchant ID found in pending user data');
      }

      if (error) {
        console.error('❌ Database error:', error);
        setError(`Database error: ${error.message}`);
        return;
      }

      if (!data) {
        setError('Invalid or expired invitation link');
        return;
      }

      // Check status - allow approved invitations that haven't been used yet
      const isValidStatus = data.approval_status === 'approved' && 
                           (data.status === 'pending_invite' || data.status === 'invited') &&
                           data.approval_status !== 'completed'; // Prevent reuse

      if (!isValidStatus) {
        console.log('❌ Invalid status:', { status: data.status, approval_status: data.approval_status });
        if (data.approval_status === 'completed') {
          setError('This invitation has already been used.');
        } else {
          setError(`Invitation not ready. Status: ${data.status}, Approval: ${data.approval_status}`);
        }
        return;
      }

      // Check if invitation has expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      console.log('✅ Invitation validated successfully');
      console.log('🏪 Merchant data:', (data as any).merchants);
      
      // Use merchant name from the separate query if available
      let merchantName = 'Unknown Merchant';
      if ((data as any).merchants?.name) {
        merchantName = (data as any).merchants.name;
      }
      
      const invitationData: InvitationData = {
        ...data,
        merchant_id: merchantId || data.merchant_id_uuid || data.merchant_id, // Use whichever merchant ID was found
        merchant_name: merchantName,
        merchants: (data as any).merchants
      };
      
      console.log('🏪 Final invitation data:', invitationData);
      setInvitation(invitationData);
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError(`Failed to validate invitation: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    const handleAcceptInvitation = async (password: string) => {
      if (!invitation) {
        setError('No invitation data available');
        return;
      }

      setCreating(true);
      setError('');

      try {
        console.log('🔍 Starting invitation acceptance for:', invitation.email);

        // Call the server-side API endpoint that uses service role key
        const response = await fetch('/api/accept-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: invitation.email,
            password: password,
            invitationToken: invitation.id
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to accept invitation');
        }

        console.log('✅ Invitation acceptance completed successfully');
        console.log('🚀 Redirecting to merchant dashboard...');

        // Redirect to merchant dashboard
        window.location.href = 'https://dashboard.okurupay.com';
      } catch (err: any) {
        console.error('❌ Invitation acceptance failed:', err);
        setError(err.message || 'Failed to accept invitation. Please try again.');
        setCreating(false);
      }
    };

    handleAcceptInvitation(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/signin')}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Accept Invitation</h2>
          <p className="text-gray-600 mt-2">
            You've been invited to join <strong>{invitation?.merchant_name}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900">Invitation Details</h3>
          <div className="mt-2 text-sm text-blue-800">
            <p><strong>Name:</strong> {invitation?.name}</p>
            <p><strong>Email:</strong> {invitation?.email}</p>
            <p><strong>Role:</strong> {invitation?.role === 'merchant_admin' ? 'Merchant Admin' : 'Staff Member'}</p>
            <p><strong>Merchant:</strong> {invitation?.merchant_name}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Create Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                minLength={8}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              minLength={8}
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              'Accept Invitation & Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By accepting this invitation, you agree to the terms of service
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
