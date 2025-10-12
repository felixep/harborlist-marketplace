import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useAdminOperations } from '../../hooks/useAdminOperations';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { EnhancedUser, UserRole, UserStatus, UserTier, UserCapability } from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';

interface UserFilters {
  search: string;
  userType: string;
  status: string;
  role: string;
  premiumStatus: string;
}

interface UserGroup {
  groupId: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
}

const UserManagement: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { isLoading, updateUserStatus, executeCustomOperation } = useAdminOperations();
  
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnhancedUser[]>([]);
  const [userTiers, setUserTiers] = useState<UserTier[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    userType: '',
    status: '',
    role: '',
    premiumStatus: ''
  });

  useEffect(() => {
    loadUsers();
    loadUserTiers();
    loadUserGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      showError('Error', 'Failed to load users');
    }
  };

  const loadUserTiers = async () => {
    try {
      const response = await adminApi.get('/user-tiers');
      setUserTiers(response.data || []);
    } catch (error) {
      showError('Error', 'Failed to load user tiers');
    }
  };

  const loadUserGroups = async () => {
    try {
      const response = await adminApi.get('/user-groups');
      setUserGroups(response.data || []);
    } catch (error) {
      showError('Error', 'Failed to load user groups');
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.userType) {
      filtered = filtered.filter(user => user.userType === filters.userType);
    }

    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.premiumStatus) {
      if (filters.premiumStatus === 'active') {
        filtered = filtered.filter(user => user.premiumActive);
      } else if (filters.premiumStatus === 'inactive') {
        filtered = filtered.filter(user => !user.premiumActive);
      }
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const currentPageUsers = getCurrentPageUsers();
    const allSelected = currentPageUsers.every(user => selectedUsers.includes(user.id));
    
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !currentPageUsers.find(user => user.id === id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...currentPageUsers.map(user => user.id)])]);
    }
  };

  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  };

  const handleUserTypeChange = async (userId: string, newUserType: string) => {
    try {
      await adminApi.post(`/users/${userId}/user-type`, { userType: newUserType });
      await loadUsers();
      showSuccess('Success', 'User type updated successfully');
    } catch (error) {
      showError('Error', 'Failed to update user type');
    }
  };

  const handleTierAssignment = async (userId: string, tierId: string) => {
    try {
      await adminApi.post(`/users/${userId}/tier`, { tierId });
      await loadUsers();
      showSuccess('Success', 'User tier assigned successfully');
    } catch (error) {
      showError('Error', 'Failed to assign user tier');
    }
  };

  const handleCapabilityToggle = async (userId: string, capability: string, enabled: boolean) => {
    try {
      await adminApi.post(`/users/${userId}/capabilities`, { 
        capability, 
        enabled,
        expiresAt: enabled ? Date.now() + (365 * 24 * 60 * 60 * 1000) : undefined // 1 year
      });
      await loadUsers();
      showSuccess('Success', `Capability ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      showError('Error', 'Failed to update capability');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      showWarning('Warning', 'Please select users first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await adminApi.post('/users/bulk/activate', { userIds: selectedUsers });
          showSuccess('Success', `Activated ${selectedUsers.length} users`);
          break;
        case 'suspend':
          await adminApi.post('/users/bulk/suspend', { userIds: selectedUsers });
          showSuccess('Success', `Suspended ${selectedUsers.length} users`);
          break;
        case 'delete':
          if (confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
            await adminApi.post('/users/bulk/delete', { userIds: selectedUsers });
            showSuccess('Success', `Deleted ${selectedUsers.length} users`);
          }
          break;
      }
      setSelectedUsers([]);
      await loadUsers();
    } catch (error) {
      showError('Error', `Failed to perform bulk action: ${action}`);
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'premium_individual': return 'bg-purple-100 text-purple-800';
      case 'premium_dealer': return 'bg-indigo-100 text-indigo-800';
      case 'dealer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentPageUsers = getCurrentPageUsers();

  return (
    <div className="p-6">
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Processing request..." 
        backdrop="blur"
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGroupModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Manage Groups
          </button>
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            disabled={selectedUsers.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bulk Actions ({selectedUsers.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters(prev => ({ ...prev, userType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="individual">Individual</option>
                <option value="dealer">Dealer</option>
                <option value="premium_individual">Premium Individual</option>
                <option value="premium_dealer">Premium Dealer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="moderator">Moderator</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Premium Status</label>
              <select
                value={filters.premiumStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, premiumStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="active">Premium Active</option>
                <option value="inactive">Premium Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Users ({filteredUsers.length})
            </h2>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentPageUsers.length > 0 && currentPageUsers.every(user => selectedUsers.includes(user.id))}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-500">Select All</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Premium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserTypeColor(user.userType)}`}>
                      {user.userType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.premiumActive ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'suspended' : 'active', 'Admin action')}
                      className={`${user.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit User: {selectedUser.name}</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                  <select
                    value={selectedUser.userType}
                    onChange={(e) => handleUserTypeChange(selectedUser.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="dealer">Dealer</option>
                    <option value="premium_individual">Premium Individual</option>
                    <option value="premium_dealer">Premium Dealer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier Assignment</label>
                  <select
                    value={selectedUser.membershipDetails?.tierId || ''}
                    onChange={(e) => handleTierAssignment(selectedUser.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Tier</option>
                    {userTiers.map(tier => (
                      <option key={tier.tierId} value={tier.tierId}>{tier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capabilities</label>
                  <div className="space-y-2">
                    {['advanced_search', 'bulk_operations', 'priority_placement', 'analytics_access', 'premium_support'].map(capability => {
                      const hasCapability = selectedUser.capabilities?.some(c => c.feature === capability && c.enabled);
                      return (
                        <label key={capability} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hasCapability}
                            onChange={(e) => handleCapabilityToggle(selectedUser.id, capability, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {capability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    showSuccess('Success', 'User updated successfully');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;