import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { adminApi } from '../../services/adminApi';

interface Team {
  id: string;
  name: string;
  description: string;
}

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teams?: Array<{ teamId: string; role: string }>;
}

interface AssignTeamModalProps {
  team: Team;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignTeamModal: React.FC<AssignTeamModalProps> = ({
  team,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'member'>('member');

  useEffect(() => {
    loadStaffUsers();
  }, []);

  const loadStaffUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/users/staff');
      const staffData = (response.data as any).staff || [];
      setStaffUsers(staffData);
    } catch (error) {
      showError('Error', 'Failed to load staff users');
      console.error('Load staff error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      showError('Error', 'Please select a user');
      return;
    }

    try {
      setAssigning(true);
      await adminApi.post(`/teams/${team.id}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      
      showSuccess('Success', 'User assigned to team successfully');
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign user to team';
      showError('Error', errorMessage);
      console.error('Assign user error:', error);
    } finally {
      setAssigning(false);
    }
  };

  // Filter out users already in this team
  const availableUsers = staffUsers.filter(user => {
    const isInTeam = user.teams?.some(t => t.teamId === team.id);
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return !isInTeam && matchesSearch;
  });

  const selectedUser = staffUsers.find(u => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Assign User to {team.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{team.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Staff Members
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? 'No matching users found' : 'All staff members are already in this team'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer ${
                            selectedUserId === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-600">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                {user.role}
                              </span>
                              {selectedUserId === user.id && (
                                <svg className="ml-2 h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {user.teams && user.teams.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-xs text-gray-500">Other teams:</span>
                              {user.teams.slice(0, 3).map((t, index) => (
                                <span key={index} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  {t.teamId}
                                </span>
                              ))}
                              {user.teams.length > 3 && (
                                <span className="text-xs text-gray-500">+{user.teams.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Role Selection */}
              {selectedUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Role
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        selectedRole === 'member'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedRole('member')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Member</p>
                          <p className="text-sm text-gray-600 mt-1">Standard team access</p>
                        </div>
                        {selectedRole === 'member' && (
                          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        selectedRole === 'manager'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedRole('manager')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Manager</p>
                          <p className="text-sm text-gray-600 mt-1">Extended permissions</p>
                        </div>
                        {selectedRole === 'manager' && (
                          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Selected User Summary */}
              {selectedUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Assignment Summary</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><span className="font-medium">User:</span> {selectedUser.name} ({selectedUser.email})</p>
                    <p><span className="font-medium">Team:</span> {team.name}</p>
                    <p><span className="font-medium">Role:</span> {selectedRole === 'manager' ? '⭐ Manager' : 'Member'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning...' : 'Assign to Team'}
          </button>
        </div>
      </div>
    </div>
  );
};
