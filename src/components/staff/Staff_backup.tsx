import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { UserPlus, Key, Edit, Trash2, Shield, Users, X } from 'lucide-react';

interface StaffMember {
  user_id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  employee_id: string;
  role: 'staff' | 'merchant';
  status: 'active' | 'inactive';
  pin_hash?: string;
  has_pin: boolean;
  created_at: string;
  approved: boolean;
}

interface StaffPermissions {
  dashboard: { view: boolean };
  transactions: { view: boolean; process: boolean; refund?: boolean; void?: boolean };
  terminals: { access: boolean; process_payments: boolean; manage?: boolean; configure?: boolean };
  reports: { view: boolean; export?: boolean; analytics?: boolean };
  settings: { view: boolean; update?: boolean };
  staff: { view: boolean; manage?: boolean; add?: boolean };
  wallets: { view: boolean; manage?: boolean };
  automations: { view: boolean; manage?: boolean };
}

const Staff: React.FC = () => {
  const { userData } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // Modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Load staff data and user info
  useEffect(() => {
    loadStaffData();
  }, [userData]);

  const loadStaffData = async () => {
    if (!userData) {
      console.log('❌ No user found, skipping staff data load');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading staff data for user:', userData?.auth_user_id);
      
      // Get current user info
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('merchant_id, role')
        .eq('auth_user_id', userData?.auth_user_id)
        .single();

      if (userError) {
        console.error('❌ Error loading current user:', userError);
        // If user not found in database, show a more helpful error
        if (userError.code === 'PGRST116') {
          setError('User account not found. Please contact support or try logging in again.');
        } else {
          setError(`Database error: ${userError.message}`);
        }
        return;
      }

      if (!currentUser) {
        setError('User data not found. Please try refreshing the page.');
        return;
      }
      
      console.log('✅ Current user loaded:', currentUser);
      setCurrentUserRole(currentUser.role);
      setMerchantId(currentUser.merchant_id);

      // Only admins and merchants can manage staff
      if (!['admin', 'merchant', 'okuru_admin'].includes(currentUser.role)) {
        setError(`Access denied. Your role (${currentUser.role}) does not have permission to manage staff.`);
        return;
      }

      // Load staff members for this merchant
      console.log('🔍 Loading staff members for merchant:', currentUser.merchant_id);
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('*')
        .eq('merchant_id', currentUser.merchant_id)
        .in('role', ['staff', 'merchant'])
        .order('created_at', { ascending: false });

      if (staffError) {
        console.error('❌ Error loading staff:', staffError);
        setError(`Failed to load staff data: ${staffError.message}`);
        return;
      }

      console.log('✅ Staff members loaded:', staff?.length || 0);
      setStaffMembers(staff || []);
    } catch (error) {
      console.error('❌ Unexpected error loading staff data:', error);
      setError('An unexpected error occurred. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a secure 4-digit PIN
  const generatePin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md mx-auto text-center">
          <div className="text-red-500 mb-4">
            <Shield className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage your team members and their permissions</p>
        </div>
        <Button 
          onClick={() => setShowAddStaffModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Staff Members List */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Team Members ({staffMembers.length})</h2>
        </div>

        {staffMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
            <p className="text-gray-600 mb-4">Add your first team member to get started</p>
            <Button 
              onClick={() => setShowAddStaffModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">PIN</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((member) => (
                  <tr key={member.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{member.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{member.email}</td>
                    <td className="py-3 px-4 text-gray-600">{member.employee_id}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        member.role === 'merchant' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        member.has_pin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.has_pin ? 'Set' : 'Not Set'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedStaff(member);
                            // setShowEditModal(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedStaff(member);
                            // setShowPinModal(true);
                          }}
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Staff Modal Placeholder */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Staff Member</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddStaffModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600">Staff management functionality is being enhanced. Please check back soon.</p>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowAddStaffModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Staff;
