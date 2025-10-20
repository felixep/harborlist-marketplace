import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { adminApi } from '../../services/adminApi';
import { TeamCard } from './TeamCard';
import { TeamDetailsModal } from './TeamDetailsModal';
import { AssignTeamModal } from './AssignTeamModal';

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

interface TeamStats {
  totalTeams: number;
  totalStaffMembers: number;
  totalAssignments: number;
  averageTeamSize: number;
  teams: Array<{
    teamId: string;
    name: string;
    totalMembers: number;
    managers: number;
    members: number;
  }>;
}

export const TeamManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTeams();
    loadTeamStats();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/teams');
      setTeams((response.data as any).teams || []);
    } catch (error) {
      showError('Error', 'Failed to load teams');
      console.error('Load teams error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamStats = async () => {
    try {
      const response = await adminApi.get('/teams/stats');
      setTeamStats((response.data as any).stats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const response = await adminApi.get(`/teams/${teamId}/members`);
      setTeamMembers((response.data as any).members || []);
    } catch (error) {
      showError('Error', 'Failed to load team members');
      console.error('Load members error:', error);
    }
  };

  const handleTeamClick = async (team: Team) => {
    setSelectedTeam(team);
    await loadTeamMembers(team.id);
    setShowDetailsModal(true);
  };

  const handleAssignUser = (team: Team) => {
    setSelectedTeam(team);
    setShowAssignModal(true);
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await adminApi.delete(`/teams/${teamId}/members/${userId}`);
      showSuccess('Success', 'User removed from team');
      await loadTeamMembers(teamId);
      await loadTeams();
      await loadTeamStats();
    } catch (error) {
      showError('Error', 'Failed to remove user from team');
      console.error('Remove member error:', error);
    }
  };

  const handleUpdateRole = async (teamId: string, userId: string, newRole: 'manager' | 'member') => {
    try {
      await adminApi.put(`/teams/${teamId}/members/${userId}/role`, { role: newRole });
      showSuccess('Success', 'User role updated');
      await loadTeamMembers(teamId);
      await loadTeams();
    } catch (error) {
      showError('Error', 'Failed to update user role');
      console.error('Update role error:', error);
    }
  };

  const handleAssignComplete = async () => {
    setShowAssignModal(false);
    await loadTeams();
    await loadTeamStats();
    if (selectedTeam) {
      await loadTeamMembers(selectedTeam.id);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage staff teams, assign members, and configure team permissions
        </p>
      </div>

      {/* Statistics */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Teams</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Staff Members</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalStaffMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalAssignments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Team Size</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.averageTeamSize.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onClick={() => handleTeamClick(team)}
            onAssignUser={() => handleAssignUser(team)}
          />
        ))}
      </div>

      {/* Team Details Modal */}
      {showDetailsModal && selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          members={teamMembers}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTeam(null);
          }}
          onRemoveMember={handleRemoveMember}
          onUpdateRole={handleUpdateRole}
          onAssignUser={() => {
            setShowDetailsModal(false);
            setShowAssignModal(true);
          }}
        />
      )}

      {/* Assign User Modal */}
      {showAssignModal && selectedTeam && (
        <AssignTeamModal
          team={selectedTeam}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTeam(null);
          }}
          onSuccess={handleAssignComplete}
        />
      )}
    </div>
  );
};
