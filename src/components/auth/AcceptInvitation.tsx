import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  merchant_id: string;
  merchant_name: string;
  expires_at: string;
  merchant?: {
    name: string;
  };
}

const AcceptInvitation: React.FC = () => {
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
    const initializeInvitation = async () => {
      // Clear URL hash parameters that might interfere
      console.log('🧹 Clearing URL hash parameters');
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      // Check if user is already authenticated and sign them out immediately
      // This prevents any session from being counted as a "login" before password creation
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('⚠️ User was auto-authenticated by Supabase invitation, signing out immediately');
        console.log('🔒 This prevents counting as login before password creation');
        await supabase.auth.signOut();
        console.log('🚪 Signed out - user must create password to actually login');
      }

      if (token) {
        console.log('🔍 Fetching invitation with token:', token);
        console.log('🔍 Token length:', token.length);
        validateInvitation(token as string);
      }
    };

    initializeInvitation();
  }, [token]);

  const validateInvitation = async (invitationToken: string) => {
    try {
      console.log('🔍 Validating invitation token:', invitationToken);
      
      const { data, error } = await supabase
        .from('pending_users')
        .select(`
          id,
          email,
          name,
          role,
          merchant_id,
          expires_at,
          status,
          approval_status,
          merchant:merchants(name)
        `)
        .eq('invitation_token', invitationToken)
        .in('status', ['pending', 'invited', 'pending_invite'])
        .single();

      console.log('📋 Database query result:', data);
      console.log('❌ Database error:', error);

      if (error || !data) {
        setError('Invalid or expired invitation link');
        return;
      }

      // Check if invitation has expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitation({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        merchant_id: data.merchant_id,
        expires_at: data.expires_at,
        merchant_name: (data.merchant as any)?.name || 'Unknown Merchant'
      });
    } catch (err) {
      setError('Failed to validate invitation');
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

    setCreating(true);
    setError(null);

    try {
      console.log('🔍 Starting invitation acceptance for:', invitation.email);
      console.log('🔑 Password length:', password.length);

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

      console.log('📡 API response status:', response.status);
      const result = await response.json();
      console.log('📋 API response body:', result);

      if (!response.ok) {
        console.error('❌ API request failed:', result);
        throw new Error(result.error || 'Failed to accept invitation');
      }

      console.log('✅ Invitation acceptance completed successfully');
      
      // Check if user was created successfully
      if (result.user) {
        console.log('👤 User created:', result.user.email);
        console.log('🔐 Auth user ID:', result.user.id);
      }
      
      if (result.session) {
        console.log('🎫 Session created:', !!result.session.access_token);
      }

      console.log('🚀 Redirecting to merchant dashboard...');

      // Redirect to merchant dashboard
      window.location.href = 'https://dashboard.okurupay.com';
    } catch (err: any) {
      console.error('❌ Invitation acceptance failed:', err);
      console.error('❌ Error details:', err.stack);
      setError(err.message || 'Failed to accept invitation. Please try again.');
      setCreating(false);
    }
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
              onClick={() => window.location.href = '/sign-in'}
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
