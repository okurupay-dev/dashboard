import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, MoreHorizontal, Trash2, UserCheck, UserX, Mail, UserPlus, Edit, Key, X, Check, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate } from '../common/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';

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

// Default permission templates for different staff roles
const defaultPermissions = {
  cashier: {
    dashboard: { view: true },
    transactions: { view: true, process: true, refund: false },
    terminals: { access: true, manage: false },
    reports: { view: false, export: false },
    settings: { view: false, update: false },
    staff: { view: false, manage: false }
  },
  supervisor: {
    dashboard: { view: true },
    transactions: { view: true, process: true, refund: true },
    terminals: { access: true, manage: true },
    reports: { view: true, export: false },
    settings: { view: true, update: false },
    staff: { view: true, manage: false }
  },
  manager: {
    dashboard: { view: true },
    transactions: { view: true, process: true, refund: true },
    terminals: { access: true, manage: true },
    reports: { view: true, export: true },
    settings: { view: true, update: true },
    staff: { view: true, manage: true }
  }
};

const Staff: React.FC = () => {
  const { userData } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // Modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditPendingModal, setShowEditPendingModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedPendingStaff, setSelectedPendingStaff] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employee_id: '',
    role_template: 'cashier' as 'cashier' | 'supervisor' | 'manager',
    permissions: {
      dashboard: { view: true },
      transactions: { view: true, process: true, refund: false },
      terminals: { access: true, manage: false },
      reports: { view: false, export: false },
      settings: { view: false, update: false },
      staff: { view: false, manage: false }
    },
    generate_pin: true,
    activation_mode: 'pending' as 'pending' | 'immediate'
  });

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
      if (!['admin', 'merchant', 'merchant_admin', 'okuru_admin'].includes(currentUser.role)) {
        setError(`Access denied. Your role (${currentUser.role}) does not have permission to manage staff.`);
        return;
      }

      // Load active staff members for this merchant
      console.log('🔍 Loading active staff members for merchant:', currentUser.merchant_id);
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('*')
        .eq('merchant_id', currentUser.merchant_id)
        .in('role', ['staff', 'merchant'])
        .order('created_at', { ascending: false });

      if (staffError) {
        console.error('❌ Error loading active staff:', staffError);
        setError(`Failed to load active staff data: ${staffError.message}`);
        return;
      }

      console.log('✅ Active staff members loaded:', staff?.length || 0);
      setStaffMembers(staff || []);

      // Load pending staff members for this merchant
      console.log('🔍 Loading pending staff members for merchant:', currentUser.merchant_id);
      const { data: pending, error: pendingError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('merchant_id', currentUser.merchant_id)
        .eq('role', 'staff')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('❌ Error loading pending staff:', pendingError);
        // Don't fail completely if pending staff fails to load
        console.warn('Continuing without pending staff data');
        setPendingStaff([]);
      } else {
        console.log('✅ Pending staff members loaded:', pending?.length || 0);
        setPendingStaff(pending || []);
      }
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

  // Handle staff creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantId || !userData) {
      alert('Error: Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('🚀 Creating new staff member...');

      // Generate terminal PIN if requested
      const terminalPin = formData.generate_pin 
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : null;

      // Generate employee ID if not provided
      const employeeId = formData.employee_id || `EMP${Date.now()}`;

      console.log('📝 Staff data:', {
        name: formData.name,
        email: formData.email,
        employee_id: employeeId,
        role: formData.role_template,
        merchant_id: merchantId,
        activation_mode: formData.activation_mode,
        terminal_pin: terminalPin ? '******' : 'None'
      });

      if (formData.activation_mode === 'immediate') {
        // Add directly to users table (immediate activation)
        const { data: activeUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: formData.name,
            email: formData.email,
            employee_id: employeeId,
            role: 'staff',
            merchant_id: merchantId,
            pin_hash: terminalPin,
            status: 'active',
            approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating active staff:', insertError);
          throw insertError;
        }

        console.log('✅ Active staff member created:', activeUser);
        
        // Show success message for immediate activation
        alert(`Staff member ${formData.name} has been activated immediately and can access terminals.${terminalPin ? `\n\nTerminal PIN: ${terminalPin}` : ''}\n\nNote: They will not have dashboard access unless invited via Clerk.`);
      } else {
        // Add to pending_users table (requires Okuru Support invitation)
        const { data: pendingUser, error: insertError } = await supabase
          .from('pending_users')
          .insert({
            name: formData.name,
            email: formData.email,
            employee_id: employeeId,
            role: 'staff',
            role_permissions: formData.permissions,
            pin_hash: terminalPin,
            initiated_by_name: userData.name || 'Admin',
            initiated_by_email: userData.email || '',
            approval_status: 'pending',
            merchant_id: merchantId,
            status: 'pending_invite',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating pending staff:', insertError);
          throw insertError;
        }

        console.log('✅ Pending staff member created:', pendingUser);
        
        // Show success message for pending activation
        alert(`Staff member ${formData.name} has been added to pending list. They will be activated when they join via Okuru Support invitation.${terminalPin ? `\n\nTerminal PIN: ${terminalPin}` : ''}`);
      }

      // Success! Close modal and refresh data
      setShowAddStaffModal(false);
      setFormData({
        name: '',
        email: '',
        employee_id: '',
        role_template: 'cashier',
        permissions: defaultPermissions.cashier,
        generate_pin: true,
        activation_mode: 'pending'
      });
      
      // Refresh both active and pending staff data
      loadStaffData();
      
    } catch (error) {
      console.error('❌ Error adding staff:', error);
      alert('Failed to add staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing pending staff member
  const handleEditPendingStaff = (pendingStaff: any) => {
    setSelectedPendingStaff(pendingStaff);
    // Pre-populate form with existing data
    setFormData({
      name: pendingStaff.name,
      email: pendingStaff.email,
      employee_id: pendingStaff.employee_id,
      role_template: pendingStaff.role || 'cashier',
      permissions: pendingStaff.role_permissions || defaultPermissions.cashier,
      generate_pin: !!pendingStaff.pin_hash,
      activation_mode: 'pending'
    });
    setShowEditPendingModal(true);
  };

  // Handle deleting pending staff member
  const handleDeletePendingStaff = async (pendingStaff: any) => {
    if (!merchantId) {
      alert('Error: Merchant ID not found');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${pendingStaff.name} from pending staff? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setIsSubmitting(true);
      console.log('🗑️ Deleting pending staff member:', pendingStaff.id);

      // Delete from pending_users table with merchant verification
      const { error: deleteError } = await supabase
        .from('pending_users')
        .delete()
        .eq('id', pendingStaff.id)
        .eq('merchant_id', merchantId); // Ensure merchant-scoped deletion

      if (deleteError) {
        console.error('❌ Error deleting pending staff:', deleteError);
        throw deleteError;
      }

      console.log('✅ Pending staff member deleted successfully');
      
      // Refresh staff data
      loadStaffData();
      
      alert(`${pendingStaff.name} has been removed from pending staff.`);
    } catch (error) {
      console.error('❌ Error deleting pending staff:', error);
      alert('Failed to delete staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating pending staff member
  const handleUpdatePendingStaff = async () => {
    if (!selectedPendingStaff || !merchantId) {
      alert('Error: Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('✏️ Updating pending staff member:', selectedPendingStaff.id);

      // Generate new PIN if requested
      let pinHash = selectedPendingStaff.pin_hash;
      if (formData.generate_pin && !pinHash) {
        pinHash = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // Update pending_users record with merchant verification
      const { error: updateError } = await supabase
        .from('pending_users')
        .update({
          name: formData.name,
          email: formData.email,
          employee_id: formData.employee_id,
          role: formData.role_template,
          role_permissions: formData.permissions,
          pin_hash: pinHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPendingStaff.id)
        .eq('merchant_id', merchantId); // Ensure merchant-scoped update

      if (updateError) {
        console.error('❌ Error updating pending staff:', updateError);
        throw updateError;
      }

      console.log('✅ Pending staff member updated successfully');
      
      // Close modal and refresh data
      setShowEditPendingModal(false);
      setSelectedPendingStaff(null);
      setFormData({
        name: '',
        email: '',
        employee_id: '',
        role_template: 'cashier',
        permissions: defaultPermissions.cashier,
        generate_pin: true,
        activation_mode: 'pending'
      });
      
      // Refresh staff data
      loadStaffData();
      
      alert(`${formData.name} has been updated successfully.`);
    } catch (error) {
      console.error('❌ Error updating pending staff:', error);
      alert('Failed to update staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Active Staff Members */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-green-500 mr-2" />
          <h2 className="text-lg font-semibold">Active Staff Members ({staffMembers.length})</h2>
        </div>

        {staffMembers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">No active staff members yet</p>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Terminal PIN</th>
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
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {member.pin_hash ? (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Set
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Show PIN in alert for now - can be improved with modal
                              alert(`Terminal PIN for ${member.name}: ****`);
                            }}
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Not Set
                        </span>
                      )}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pending Staff Members */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-yellow-500 mr-2" />
          <h2 className="text-lg font-semibold">Pending Staff Members ({pendingStaff.length})</h2>
          <span className="ml-2 text-sm text-gray-500">Awaiting Okuru Support Invitation</span>
        </div>

        {pendingStaff.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">No pending staff members</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Terminal PIN</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Added By</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStaff.map((pending) => (
                  <tr key={pending.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{pending.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{pending.email}</td>
                    <td className="py-3 px-4 text-gray-600">{pending.employee_id}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {pending.role || 'Staff'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        pending.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        pending.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                        pending.approval_status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pending.approval_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {pending.pin_hash ? (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Generated
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Show actual PIN for pending users
                              alert(`Terminal PIN for ${pending.name}: ${pending.pin_hash}`);
                            }}
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          Not Generated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {pending.initiated_by_name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(pending.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPendingStaff(pending)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePendingStaff(pending)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-3 w-3" />
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

      {/* Empty State - Show only when both lists are empty */}
      {staffMembers.length === 0 && pendingStaff.length === 0 && (
        <Card className="p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-600 mb-4">Add your first team member to get started</p>
            <Button 
              onClick={() => setShowAddStaffModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Pending Staff Modal */}
      {showEditPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Pending Staff Member</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditPendingModal(false);
                  setSelectedPendingStaff(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Template
                  </label>
                  <select
                    value={formData.role_template}
                    onChange={(e) => {
                      const template = e.target.value as 'cashier' | 'supervisor' | 'manager';
                      setFormData({ 
                        ...formData, 
                        role_template: template,
                        permissions: defaultPermissions[template]
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Activation Mode */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Activation Mode
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="pending-activation"
                      name="activation_mode"
                      value="pending"
                      checked={formData.activation_mode === 'pending'}
                      onChange={(e) => setFormData({ ...formData, activation_mode: e.target.value as 'pending' | 'immediate' })}
                      className="rounded"
                    />
                    <label htmlFor="pending-activation" className="text-sm text-gray-700">
                      <span className="font-medium">Pending Activation</span> - Requires Okuru Support invitation for dashboard access
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="immediate-activation"
                      name="activation_mode"
                      value="immediate"
                      checked={formData.activation_mode === 'immediate'}
                      onChange={(e) => setFormData({ ...formData, activation_mode: e.target.value as 'pending' | 'immediate' })}
                      className="rounded"
                    />
                    <label htmlFor="immediate-activation" className="text-sm text-gray-700">
                      <span className="font-medium">Immediate Activation</span> - Terminal access only, no dashboard access
                    </label>
                  </div>
                </div>
              </div>

              {/* Terminal PIN */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="generate-pin"
                  checked={formData.generate_pin}
                  onChange={(e) => setFormData({ ...formData, generate_pin: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="generate-pin" className="text-sm text-gray-700">
                  Generate terminal PIN (staff can access terminals immediately)
                </label>
              </div>
              
              {formData.activation_mode === 'pending' && (
                <p className="text-xs text-gray-500">
                  Staff member will be added to pending list and require Okuru Support invitation for dashboard access.
                </p>
              )}
              
              {formData.activation_mode === 'immediate' && (
                <p className="text-xs text-gray-500">
                  Staff member will be activated immediately with terminal access only. No dashboard access unless invited separately via Clerk.
                </p>
              )}

              {selectedPendingStaff?.pin_hash && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    Current PIN: <span className="font-mono font-medium">{selectedPendingStaff.pin_hash}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditPendingModal(false);
                  setSelectedPendingStaff(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePendingStaff}
                disabled={isSubmitting || !formData.name || !formData.email || !formData.employee_id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Updating...' : 'Update Staff Member'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Add Staff Member</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddStaffModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form className="space-y-4" onSubmit={handleCreateStaff}>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated or custom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Template *
                  </label>
                  <select 
                    value={formData.role_template}
                    onChange={(e) => setFormData({...formData, role_template: e.target.value as 'cashier' | 'supervisor' | 'manager'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Dashboard Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Dashboard</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.dashboard.view}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            dashboard: { ...formData.permissions.dashboard, view: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">View Dashboard</span>
                    </label>
                  </div>

                  {/* Transaction Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Transactions</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.transactions.view}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            transactions: { ...formData.permissions.transactions, view: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">View Transactions</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.transactions.process}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            transactions: { ...formData.permissions.transactions, process: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Process Payments</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.transactions.refund}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            transactions: { ...formData.permissions.transactions, refund: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Process Refunds</span>
                    </label>
                  </div>

                  {/* Terminal Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Terminals</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.terminals.access}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            terminals: { ...formData.permissions.terminals, access: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Access Terminals</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.terminals.manage}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            terminals: { ...formData.permissions.terminals, manage: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Manage Terminals</span>
                    </label>
                  </div>

                  {/* Reports Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Reports</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.reports.view}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            reports: { ...formData.permissions.reports, view: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">View Reports</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.reports.export}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            reports: { ...formData.permissions.reports, export: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Export Reports</span>
                    </label>
                  </div>

                  {/* Settings Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Settings</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.settings.view}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            settings: { ...formData.permissions.settings, view: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">View Settings</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.settings.update}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            settings: { ...formData.permissions.settings, update: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Update Settings</span>
                    </label>
                  </div>

                  {/* Staff Permissions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Staff Management</h5>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.staff.view}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            staff: { ...formData.permissions.staff, view: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">View Staff</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={formData.permissions.staff.manage}
                        onChange={(e) => setFormData({
                          ...formData, 
                          permissions: {
                            ...formData.permissions,
                            staff: { ...formData.permissions.staff, manage: e.target.checked }
                          }
                        })}
                      />
                      <span className="text-sm">Manage Staff</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Activation Mode */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Activation Mode</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="pending-activation"
                      name="activation_mode"
                      value="pending"
                      checked={formData.activation_mode === 'pending'}
                      onChange={(e) => setFormData({ ...formData, activation_mode: e.target.value as 'pending' | 'immediate' })}
                      className="rounded"
                    />
                    <label htmlFor="pending-activation" className="text-sm text-gray-700">
                      <span className="font-medium">Pending Activation</span> - Requires Okuru Support invitation for dashboard access
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="immediate-activation"
                      name="activation_mode"
                      value="immediate"
                      checked={formData.activation_mode === 'immediate'}
                      onChange={(e) => setFormData({ ...formData, activation_mode: e.target.value as 'pending' | 'immediate' })}
                      className="rounded"
                    />
                    <label htmlFor="immediate-activation" className="text-sm text-gray-700">
                      <span className="font-medium">Immediate Activation</span> - Terminal access only, no dashboard access
                    </label>
                  </div>
                  
                  {formData.activation_mode === 'pending' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Staff member will be added to pending list and require Okuru Support invitation for dashboard access.
                    </p>
                  )}
                  
                  {formData.activation_mode === 'immediate' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Staff member will be activated immediately with terminal access only. No dashboard access unless invited separately via Clerk.
                    </p>
                  )}
                </div>
              </div>

              {/* Terminal PIN */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Terminal Access</h4>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={formData.generate_pin}
                    onChange={(e) => setFormData({...formData, generate_pin: e.target.checked})}
                  />
                  <span className="text-sm">Generate Terminal PIN (staff can access immediately)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Staff member will receive their PIN and be added to pending list for Okuru Support invitation
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddStaffModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Add to Pending'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Staff;
