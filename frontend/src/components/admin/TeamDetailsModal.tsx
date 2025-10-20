import React, { useState } from 'react';

interface Team {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  memberCount: number;
  managerCount: number;
  defaultPermissions: string[];
  managerPermissions: string[];
}

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: 'manager' | 'member';
  assignedAt: string;
  assignedBy: string;
}

interface TeamDetailsModalProps {
  team: Team;
  members: TeamMember[];
  onClose: () => void;
  onRemoveMember: (teamId: string, userId: string) => Promise<void>;
  onUpdateRole: (teamId: string, userId: string, newRole: 'manager' | 'member') => Promise<void>;
  onAssignUser: () => void;
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  members,
  onClose,
  onRemoveMember,
  onUpdateRole,
  onAssignUser,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user from the team?')) {
      setRemovingUserId(userId);
      try {
        await onRemoveMember(team.id, userId);
      } finally {
        setRemovingUserId(null);
      }
    }
  };

  const handleRoleChange = async (userId: string, currentRole: 'manager' | 'member') => {
    const newRole = currentRole === 'manager' ? 'member' : 'manager';
    const action = newRole === 'manager' ? 'promote to manager' : 'demote to member';
    
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      setUpdatingUserId(userId);
      try {
        await onUpdateRole(team.id, userId, newRole);
      } finally {
        setUpdatingUserId(null);
      }
    }
  };

  const managers = members.filter(m => m.role === 'manager');
  const regularMembers = members.filter(m => m.role === 'member');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{team.name}</h3>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{members.length}</p>
            <p className="text-sm text-gray-600">Total Members</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{managers.length}</p>
            <p className="text-sm text-gray-600">Managers</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{regularMembers.length}</p>
            <p className="text-sm text-gray-600">Members</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mt-4">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Team Members ({members.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'permissions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-96 overflow-y-auto">
          {activeTab === 'members' ? (
            <div className="space-y-4">
              {/* Add Member Button */}
              <button
                onClick={onAssignUser}
                className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg border-2 border-dashed border-blue-300 hover:bg-blue-100 hover:border-blue-400 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">Add Team Member</span>
              </button>

              {members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-2">No team members yet</p>
                  <p className="text-sm">Click "Add Team Member" to assign users to this team</p>
                </div>
              ) : (
                <>
                  {/* Managers Section */}
                  {managers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg className="h-4 w-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Managers
                      </h4>
                      <div className="space-y-2">
                        {managers.map((member) => (
                          <MemberRow
                            key={member.userId}
                            member={member}
                            onRemove={handleRemove}
                            onRoleChange={handleRoleChange}
                            isRemoving={removingUserId === member.userId}
                            isUpdating={updatingUserId === member.userId}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Members Section */}
                  {regularMembers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members</h4>
                      <div className="space-y-2">
                        {regularMembers.map((member) => (
                          <MemberRow
                            key={member.userId}
                            member={member}
                            onRemove={handleRemove}
                            onRoleChange={handleRoleChange}
                            isRemoving={removingUserId === member.userId}
                            isUpdating={updatingUserId === member.userId}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Member Permissions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {team.defaultPermissions.map((permission) => (
                      <div key={permission} className="flex items-center text-sm">
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">{permission.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manager Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Manager Permissions (Additional)</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {team.managerPermissions
                      .filter(p => !team.defaultPermissions.includes(p))
                      .map((permission) => (
                        <div key={permission} className="flex items-center text-sm">
                          <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-gray-700">{permission.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Team Responsibilities</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {team.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for member rows
interface MemberRowProps {
  member: TeamMember;
  onRemove: (userId: string) => void;
  onRoleChange: (userId: string, currentRole: 'manager' | 'member') => void;
  isRemoving: boolean;
  isUpdating: boolean;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  onRemove,
  onRoleChange,
  isRemoving,
  isUpdating,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{member.name}</p>
          <p className="text-xs text-gray-600">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          member.role === 'manager'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {member.role === 'manager' ? '⭐ Manager' : 'Member'}
        </span>

        <button
          onClick={() => onRoleChange(member.userId, member.role)}
          disabled={isUpdating}
          className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title={member.role === 'manager' ? 'Demote to member' : 'Promote to manager'}
        >
          {isUpdating ? '...' : member.role === 'manager' ? '↓' : '↑'}
        </button>

        <button
          onClick={() => onRemove(member.userId)}
          disabled={isRemoving}
          className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  );
};
