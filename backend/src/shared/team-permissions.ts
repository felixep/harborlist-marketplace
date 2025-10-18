/**
 * Team Permission Calculation System (Phase 3.3)
 * 
 * Handles calculation of effective permissions based on team assignments,
 * permission checking, and team access validation.
 */

import {
  TeamAssignment,
  TeamId,
  TeamRole,
  TEAM_DEFINITIONS,
  getDefaultPermissionsForAssignment,
  calculateTeamPermissions as getTeamPerms,
  hasManagerRoleInTeam,
  isMemberOfTeam
} from '../types/teams';
import { AdminPermission } from '../types/common';

/**
 * Calculate effective permissions from team assignments and base permissions
 * 
 * This combines:
 * 1. Base admin permissions (if any)
 * 2. Team-based permissions from all team assignments
 * 3. Deduplicates and returns unique permission set
 * 
 * @param teams - Array of team assignments
 * @param basePermissions - Base admin permissions (optional)
 * @returns Array of unique permission strings
 */
export function calculateEffectivePermissions(
  teams: TeamAssignment[],
  basePermissions: AdminPermission[] = []
): string[] {
  const allPermissions = new Set<string>();
  
  // Add base admin permissions
  basePermissions.forEach(p => allPermissions.add(p));
  
  // Add team-based permissions
  const teamPermissions = getTeamPerms(teams);
  teamPermissions.forEach(p => allPermissions.add(p));
  
  return Array.from(allPermissions);
}

/**
 * Check if a user has a specific permission
 * 
 * Checks against both effective permissions and base admin permissions
 * 
 * @param effectivePermissions - User's effective permissions
 * @param permission - Permission to check
 * @returns True if user has the permission
 */
export function hasPermission(
  effectivePermissions: string[],
  permission: string
): boolean {
  return effectivePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 * 
 * Useful for "OR" logic - user needs at least one of the permissions
 * 
 * @param effectivePermissions - User's effective permissions
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 */
export function hasAnyPermission(
  effectivePermissions: string[],
  permissions: string[]
): boolean {
  return permissions.some(p => effectivePermissions.includes(p));
}

/**
 * Check if a user has all of the specified permissions
 * 
 * Useful for "AND" logic - user needs all permissions
 * 
 * @param effectivePermissions - User's effective permissions
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export function hasAllPermissions(
  effectivePermissions: string[],
  permissions: string[]
): boolean {
  return permissions.every(p => effectivePermissions.includes(p));
}

/**
 * Check if a user has access to a specific team
 * 
 * @param teams - User's team assignments
 * @param teamId - Team to check access for
 * @returns True if user is a member of the team
 */
export function hasTeamAccess(
  teams: TeamAssignment[],
  teamId: TeamId
): boolean {
  return isMemberOfTeam(teams, teamId);
}

/**
 * Check if a user is a manager of a specific team
 * 
 * @param teams - User's team assignments
 * @param teamId - Team to check manager status for
 * @returns True if user is a manager of the team
 */
export function isTeamManager(
  teams: TeamAssignment[],
  teamId: TeamId
): boolean {
  return hasManagerRoleInTeam(teams, teamId);
}

/**
 * Get all permissions for a specific team assignment
 * 
 * @param teamId - The team ID
 * @param role - The role within the team
 * @returns Array of permission strings for that role
 */
export function getPermissionsForTeamRole(
  teamId: TeamId,
  role: TeamRole
): string[] {
  const assignment: TeamAssignment = {
    teamId,
    role,
    assignedAt: new Date().toISOString(),
    assignedBy: 'system'
  };
  
  return getDefaultPermissionsForAssignment(assignment);
}

/**
 * Check if a user can perform an action based on permission requirements
 * 
 * This is a high-level helper that combines multiple checks:
 * - Checks if user has required permissions
 * - Optionally checks team access
 * - Optionally checks manager status
 * 
 * @param options - Configuration object
 * @returns True if user can perform the action
 */
export interface CanPerformActionOptions {
  effectivePermissions: string[];
  teams?: TeamAssignment[];
  requiredPermissions?: string[];
  requireAny?: boolean; // If true, user needs ANY permission; if false, needs ALL
  requireTeamAccess?: TeamId;
  requireManagerRole?: TeamId;
}

export function canPerformAction(options: CanPerformActionOptions): boolean {
  const {
    effectivePermissions,
    teams = [],
    requiredPermissions = [],
    requireAny = false,
    requireTeamAccess,
    requireManagerRole
  } = options;
  
  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasRequiredPerms = requireAny
      ? hasAnyPermission(effectivePermissions, requiredPermissions)
      : hasAllPermissions(effectivePermissions, requiredPermissions);
    
    if (!hasRequiredPerms) {
      return false;
    }
  }
  
  // Check team access if required
  if (requireTeamAccess && !hasTeamAccess(teams, requireTeamAccess)) {
    return false;
  }
  
  // Check manager role if required
  if (requireManagerRole && !isTeamManager(teams, requireManagerRole)) {
    return false;
  }
  
  return true;
}

/**
 * Get summary of user's team-based access
 * 
 * Useful for debugging, logging, and UI display
 * 
 * @param teams - User's team assignments
 * @param effectivePermissions - User's calculated permissions
 * @returns Summary object
 */
export interface TeamAccessSummary {
  totalTeams: number;
  managerTeams: string[];
  memberTeams: string[];
  totalPermissions: number;
  uniquePermissions: string[];
}

export function getTeamAccessSummary(
  teams: TeamAssignment[],
  effectivePermissions: string[]
): TeamAccessSummary {
  const managerTeams: string[] = [];
  const memberTeams: string[] = [];
  
  teams.forEach(t => {
    const teamDef = TEAM_DEFINITIONS[t.teamId];
    if (t.role === TeamRole.MANAGER) {
      managerTeams.push(teamDef.name);
    } else {
      memberTeams.push(teamDef.name);
    }
  });
  
  return {
    totalTeams: teams.length,
    managerTeams,
    memberTeams,
    totalPermissions: effectivePermissions.length,
    uniquePermissions: effectivePermissions
  };
}

/**
 * Validate team assignment before adding to user
 * 
 * Checks:
 * - Team ID is valid
 * - Role is valid
 * - No duplicate assignment (user not already on team)
 * 
 * @param existingTeams - User's current team assignments
 * @param newAssignment - New team assignment to validate
 * @returns Validation result with error message if invalid
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTeamAssignment(
  existingTeams: TeamAssignment[],
  newAssignment: Partial<TeamAssignment>
): ValidationResult {
  // Check required fields
  if (!newAssignment.teamId) {
    return { valid: false, error: 'Team ID is required' };
  }
  
  if (!newAssignment.role) {
    return { valid: false, error: 'Role is required' };
  }
  
  // Check if team ID is valid
  if (!Object.values(TeamId).includes(newAssignment.teamId as TeamId)) {
    return { valid: false, error: 'Invalid team ID' };
  }
  
  // Check if role is valid
  if (!Object.values(TeamRole).includes(newAssignment.role as TeamRole)) {
    return { valid: false, error: 'Invalid role' };
  }
  
  // Check for duplicate assignment
  const alreadyAssigned = existingTeams.some(
    t => t.teamId === newAssignment.teamId
  );
  
  if (alreadyAssigned) {
    const teamName = TEAM_DEFINITIONS[newAssignment.teamId as TeamId].name;
    return {
      valid: false,
      error: `User is already assigned to ${teamName}`
    };
  }
  
  return { valid: true };
}

/**
 * Update team assignment role
 * 
 * Changes a user's role within a team and recalculates permissions
 * 
 * @param teams - Current team assignments
 * @param teamId - Team to update
 * @param newRole - New role for the user
 * @param updatedBy - User ID who made the update
 * @returns Updated team assignments or null if team not found
 */
export function updateTeamRole(
  teams: TeamAssignment[],
  teamId: TeamId,
  newRole: TeamRole,
  updatedBy: string
): TeamAssignment[] | null {
  const teamIndex = teams.findIndex(t => t.teamId === teamId);
  
  if (teamIndex === -1) {
    return null;
  }
  
  const updatedTeams = [...teams];
  updatedTeams[teamIndex] = {
    ...updatedTeams[teamIndex],
    role: newRole,
    assignedAt: new Date().toISOString(), // Update timestamp
    assignedBy: updatedBy
  };
  
  return updatedTeams;
}

/**
 * Remove team assignment
 * 
 * @param teams - Current team assignments
 * @param teamId - Team to remove
 * @returns Updated team assignments
 */
export function removeTeamAssignment(
  teams: TeamAssignment[],
  teamId: TeamId
): TeamAssignment[] {
  return teams.filter(t => t.teamId !== teamId);
}

/**
 * Add team assignment
 * 
 * @param teams - Current team assignments
 * @param teamId - Team to add
 * @param role - Role in the team
 * @param assignedBy - User ID who made the assignment
 * @returns Updated team assignments
 */
export function addTeamAssignment(
  teams: TeamAssignment[],
  teamId: TeamId,
  role: TeamRole,
  assignedBy: string
): TeamAssignment[] {
  const newAssignment: TeamAssignment = {
    teamId,
    role,
    assignedAt: new Date().toISOString(),
    assignedBy
  };
  
  return [...teams, newAssignment];
}

/**
 * Compare two permission sets for changes
 * 
 * Useful for audit logging and understanding permission changes
 * 
 * @param oldPermissions - Previous permissions
 * @param newPermissions - New permissions
 * @returns Object with added and removed permissions
 */
export interface PermissionDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export function comparePermissions(
  oldPermissions: string[],
  newPermissions: string[]
): PermissionDiff {
  const oldSet = new Set(oldPermissions);
  const newSet = new Set(newPermissions);
  
  const added = newPermissions.filter(p => !oldSet.has(p));
  const removed = oldPermissions.filter(p => !newSet.has(p));
  const unchanged = oldPermissions.filter(p => newSet.has(p));
  
  return { added, removed, unchanged };
}

/**
 * Get human-readable permission names
 * 
 * Converts permission strings to readable format for UI
 * 
 * @param permissions - Array of permission strings
 * @returns Array of readable permission names
 */
export function getReadablePermissionNames(permissions: string[]): string[] {
  return permissions.map(p => {
    // Convert snake_case to Title Case
    return p
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
}

/**
 * Check if a user has super admin permissions
 * 
 * Super admins bypass all team-based restrictions
 * 
 * @param basePermissions - User's base admin permissions
 * @returns True if user is super admin
 */
export function isSuperAdmin(basePermissions: AdminPermission[]): boolean {
  // Check for system-level permissions that indicate super admin
  return basePermissions.includes(AdminPermission.SYSTEM_CONFIG) &&
         basePermissions.includes(AdminPermission.USER_MANAGEMENT);
}

/**
 * Merge permissions from multiple sources
 * 
 * Combines and deduplicates permissions from:
 * - Base admin permissions
 * - Team assignments
 * - Custom granted permissions
 * 
 * @param sources - Object with different permission sources
 * @returns Unique array of all permissions
 */
export interface PermissionSources {
  basePermissions?: AdminPermission[];
  teams?: TeamAssignment[];
  customPermissions?: string[];
}

export function mergePermissions(sources: PermissionSources): string[] {
  const allPermissions = new Set<string>();
  
  // Add base permissions
  if (sources.basePermissions) {
    sources.basePermissions.forEach(p => allPermissions.add(p));
  }
  
  // Add team permissions
  if (sources.teams) {
    const teamPerms = getTeamPerms(sources.teams);
    teamPerms.forEach(p => allPermissions.add(p));
  }
  
  // Add custom permissions
  if (sources.customPermissions) {
    sources.customPermissions.forEach(p => allPermissions.add(p));
  }
  
  return Array.from(allPermissions);
}
