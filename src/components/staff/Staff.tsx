import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface StaffMember {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
  pin?: string;
  hasPin: boolean;
}

const Staff: React.FC = () => {
  // Sample data for staff members
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: 'staff-001',
      name: 'Jane Smith',
      employeeId: 'EMP001',
      role: 'Manager',
      status: 'active',
      lastActive: 'Today, 2:30 PM',
      pin: '1234',
      hasPin: true
    },
    {
      id: 'staff-002',
      name: 'Robert Johnson',
      employeeId: 'EMP002',
      role: 'Cashier',
      status: 'active',
      lastActive: 'Today, 1:15 PM',
      pin: '5678',
      hasPin: true
    },
    {
      id: 'staff-003',
      name: 'Emily Davis',
      employeeId: 'EMP003',
      role: 'Cashier',
      status: 'inactive',
      lastActive: 'Aug 10, 2025',
      hasPin: false
    },
    {
      id: 'staff-004',
      name: 'Michael Wilson',
      employeeId: 'EMP004',
      role: 'Support',
      status: 'active',
      lastActive: 'Today, 3:45 PM',
      hasPin: false
    }
  ]);

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showAssignPinModal, setShowAssignPinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    employeeId: '',
    role: ''
  });
  
  // Add staff form state
  const [addStaffForm, setAddStaffForm] = useState({
    name: '',
    employeeId: '',
    role: 'Cashier'
  });
  
  // Handler for viewing PIN
  const handleViewPin = (staffId: string) => {
    setSelectedStaffId(staffId);
    setShowPinModal(true);
  };
  
  // Handler for assigning PIN
  const handleAssignPin = (staffId: string) => {
    setSelectedStaffId(staffId);
    setNewPin('');
    setShowAssignPinModal(true);
  };
  
  // Handler for saving PIN
  const handleSavePin = () => {
    if (selectedStaffId && newPin.length === 4) {
      setStaffMembers(staffMembers.map(staff => 
        staff.id === selectedStaffId 
          ? { ...staff, pin: newPin, hasPin: true } 
          : staff
      ));
      setShowAssignPinModal(false);
      setNewPin('');
    }
  };
  
  // Handler for editing staff
  const handleEdit = (staffId: string) => {
    const staffToEdit = staffMembers.find(staff => staff.id === staffId);
    if (staffToEdit) {
      setEditForm({
        name: staffToEdit.name,
        employeeId: staffToEdit.employeeId,
        role: staffToEdit.role
      });
      setSelectedStaffId(staffId);
      setShowEditModal(true);
    }
  };
  
  // Handler for saving edited staff
  const handleSaveEdit = () => {
    if (selectedStaffId) {
      setStaffMembers(staffMembers.map(staff => 
        staff.id === selectedStaffId 
          ? { 
              ...staff, 
              name: editForm.name,
              employeeId: editForm.employeeId,
              role: editForm.role 
            } 
          : staff
      ));
      setShowEditModal(false);
      setSelectedStaffId(null);
    }
  };
  
  // Handler for adding new staff
  const handleAddStaff = () => {
    // Validate form
    if (!addStaffForm.name || !addStaffForm.employeeId) {
      return; // Don't add if required fields are empty
    }
    
    // Generate a unique ID
    const newId = `staff-${String(staffMembers.length + 1).padStart(3, '0')}`;
    
    // Create new staff member
    const newStaff: StaffMember = {
      id: newId,
      name: addStaffForm.name,
      employeeId: addStaffForm.employeeId,
      role: addStaffForm.role,
      status: 'active',
      lastActive: 'Just now',
      hasPin: false
    };
    
    // Add to staff list
    setStaffMembers([...staffMembers, newStaff]);
    
    // Reset form and close modal
    setAddStaffForm({
      name: '',
      employeeId: '',
      role: 'Cashier'
    });
    setShowAddStaffModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Button 
          onClick={() => setShowAddStaffModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Staff Member
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terminal PIN
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{staff.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{staff.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{staff.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      staff.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {staff.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staff.hasPin ? (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2">••••</span>
                        <button 
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                          onClick={() => handleViewPin(staff.id)}
                        >
                          View
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                        onClick={() => handleAssignPin(staff.id)}
                      >
                        Assign PIN
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(staff.id)} 
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <a href="#" className="text-red-600 hover:text-red-900">Remove</a>
                  </td>
                </tr>
              ))}
            
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Staff Member</h2>
              <button 
                onClick={() => setShowAddStaffModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={addStaffForm.name}
                  onChange={(e) => setAddStaffForm({...addStaffForm, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  value={addStaffForm.employeeId}
                  onChange={(e) => setAddStaffForm({...addStaffForm, employeeId: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="EMP000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={addStaffForm.role}
                  onChange={(e) => setAddStaffForm({...addStaffForm, role: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  onClick={() => setShowAddStaffModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddStaff}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  type="button"
                  disabled={!addStaffForm.name || !addStaffForm.employeeId}
                >
                  Add Staff
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      
      {/* View PIN Modal */}
      {showPinModal && selectedStaffId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Terminal PIN</h2>
              <button 
                onClick={() => setShowPinModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Staff Member:</p>
              <p className="font-medium">
                {staffMembers.find(staff => staff.id === selectedStaffId)?.name}
              </p>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">PIN Code:</p>
              <div className="bg-gray-100 p-4 rounded-lg flex justify-center">
                <p className="text-2xl font-mono tracking-widest">
                  {staffMembers.find(staff => staff.id === selectedStaffId)?.pin}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">This PIN is used for terminal access</p>
            </div>
            
            <div className="flex justify-between items-center">
              <Button 
                onClick={() => handleAssignPin(selectedStaffId)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Change PIN
              </Button>
              <Button 
                onClick={() => setShowPinModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Assign PIN Modal */}
      {showAssignPinModal && selectedStaffId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{staffMembers.find(staff => staff.id === selectedStaffId)?.hasPin ? 'Change PIN' : 'Assign PIN'}</h2>
              <button 
                onClick={() => setShowAssignPinModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Staff Member:</p>
              <p className="font-medium">
                {staffMembers.find(staff => staff.id === selectedStaffId)?.name}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter 4-digit PIN</label>
              <input
                type="text"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">PIN must be exactly 4 digits</p>
            </div>
            
            <div className="flex justify-between items-center">
              <Button 
                onClick={() => setShowAssignPinModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSavePin}
                disabled={newPin.length !== 4}
                className={`${newPin.length === 4 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'} text-white`}
              >
                Save PIN
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Edit Staff Modal */}
      {showEditModal && selectedStaffId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Staff Member</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  value={editForm.employeeId}
                  onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  type="button"
                >
                  Save Changes
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
