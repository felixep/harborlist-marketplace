/**
 * Team-Based Staff Roles System
 * 
 * Backend copy of team definitions and types.
 * This mirrors packages/shared-types/src/teams.ts
 */

export {
  TeamId,
  TeamRole,
  TeamAccessLevel,
  type TeamDefinition,
  type TeamAssignment,
  type TeamStats,
  type TeamMemberSummary,
  TEAM_DEFINITIONS,
  PERMISSION_CATEGORIES,
  getTeamDefinition,
  getAllTeamIds,
  getTeamName,
  hasManagerRoleInTeam,
  isMemberOfTeam,
  getUserTeamIds,
  getManagerTeams,
  getMemberTeams,
  isValidTeamAssignment,
  getDefaultPermissionsForAssignment,
  calculateTeamPermissions,
  getTeamAccessLevel
} from '@harborlist/shared-types';
