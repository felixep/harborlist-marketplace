/**
 * Team Management Service (Phase 3.5)
 * 
 * Provides API endpoints for managing teams and team member assignments.
 * This service handles:
 * - Listing all teams
 * - Getting team details and members
 * - Assigning users to teams
 * - Removing users from teams
 * - Updating team member roles
 * - Calculating and updating effective permissions
 * 
 * @author HarborList Development Team
 */

import { DynamoDB } from 'aws-sdk';
import {
  TeamId,
  TeamRole,
  TeamAssignment,
  TEAM_DEFINITIONS,
  getTeamDefinition,
  getAllTeamIds,
  TeamMemberSummary,
  TeamStats
} from '../types/teams';
import {
  calculateEffectivePermissions,
  validateTeamAssignment,
  addTeamAssignment,
  removeTeamAssignment,
  updateTeamRole,
  comparePermissions
} from '../shared/team-permissions';
import { AdminPermission } from '../types/common';

const dynamoDB = new DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE_NAME || 'harborlist-users';

// ============================================================================
// Core Team Management Functions
// ============================================================================

/**
 * Get all available teams with their definitions
 * 
 * @returns Array of team definitions
 */
export async function listAllTeams() {
  const teamIds = getAllTeamIds();
  
  return teamIds.map(teamId => {
    const definition = TEAM_DEFINITIONS[teamId];
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      responsibilities: definition.responsibilities,
      memberPermissions: definition.defaultPermissions,
      managerPermissions: definition.managerPermissions
    };
  });
}

/**
 * Get detailed information about a specific team
 * 
 * @param teamId - Team to get details for
 * @returns Team definition and member count
 */
export async function getTeamDetails(teamId: TeamId) {
  const definition = getTeamDefinition(teamId);
  
  // Query for all users who are members of this team
  const members = await getTeamMembers(teamId);
  
  const managers = members.filter(m => m.role === TeamRole.MANAGER);
  const regularMembers = members.filter(m => m.role === TeamRole.MEMBER);
  
  return {
    ...definition,
    stats: {
      totalMembers: members.length,
      managers: managers.length,
      members: regularMembers.length
    },
    members
  };
}

/**
 * Get all members of a specific team
 * 
 * @param teamId - Team to get members for
 * @returns Array of team member summaries
 */
export async function getTeamMembers(teamId: TeamId): Promise<TeamMemberSummary[]> {
  try {
    // Scan users table for staff members
    // In production, consider adding a GSI for team queries
    const result = await dynamoDB.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userType = :userType',
      ExpressionAttributeValues: {
        ':userType': 'staff'
      }
    }).promise();
    
    if (!result.Items) {
      return [];
    }
    
    // Filter for users who are members of this team
    const teamMembers: TeamMemberSummary[] = [];
    
    for (const user of result.Items) {
      if (!user.teams || !Array.isArray(user.teams)) {
        continue;
      }
      
      const teamAssignment = user.teams.find((t: TeamAssignment) => t.teamId === teamId);
      
      if (teamAssignment) {
        teamMembers.push({
          userId: user.id,
          email: user.email,
          name: user.name || user.email,
          role: teamAssignment.role,
          assignedAt: teamAssignment.assignedAt,
          assignedBy: teamAssignment.assignedBy
        });
      }
    }
    
    return teamMembers;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw new Error('Failed to fetch team members');
  }
}

/**
 * Get all teams statistics
 * 
 * @returns Array of team stats
 */
export async function getAllTeamStats(): Promise<TeamStats[]> {
  const teamIds = getAllTeamIds();
  const stats: TeamStats[] = [];
  
  for (const teamId of teamIds) {
    const members = await getTeamMembers(teamId);
    const definition = getTeamDefinition(teamId);
    
    const managerCount = members.filter(m => m.role === TeamRole.MANAGER).length;
    const memberCount = members.filter(m => m.role === TeamRole.MEMBER).length;
    
    stats.push({
      teamId,
      name: definition.name,
      totalMembers: members.length,
      managerCount,
      memberCount
    });
  }
  
  return stats;
}

// ============================================================================
// Team Member Assignment Functions
// ============================================================================

/**
 * Assign a user to a team
 * 
 * @param userId - User to assign
 * @param teamId - Team to assign to
 * @param role - Role in the team
 * @param assignedBy - User ID who is making the assignment
 * @returns Updated user record with new team assignment
 */
export async function assignUserToTeam(
  userId: string,
  teamId: TeamId,
  role: TeamRole,
  assignedBy: string
) {
  try {
    // Fetch current user record
    const userResult = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!userResult.Item) {
      throw new Error('User not found');
    }
    
    const user = userResult.Item;
    
    // Verify user is a staff member
    if (user.userType !== 'staff') {
      throw new Error('Can only assign teams to staff members');
    }
    
    // Get current team assignments
    const currentTeams: TeamAssignment[] = user.teams || [];
    
    // Validate the new assignment
    const validation = validateTeamAssignment(currentTeams, { teamId, role });
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Add new team assignment
    const updatedTeams = addTeamAssignment(currentTeams, teamId, role, assignedBy);
    
    // Recalculate effective permissions
    const basePermissions: AdminPermission[] = user.permissions || [];
    const effectivePermissions = calculateEffectivePermissions(updatedTeams, basePermissions);
    
    // Calculate permission changes for audit logging
    const oldPermissions = user.effectivePermissions || [];
    const permissionDiff = comparePermissions(oldPermissions, effectivePermissions);
    
    // Update user record
    const updateResult = await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET teams = :teams, effectivePermissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':teams': updatedTeams,
        ':permissions': effectivePermissions,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    // Log the assignment
    console.log('Team assignment completed', {
      userId,
      email: user.email,
      teamId,
      role,
      assignedBy,
      permissionsAdded: permissionDiff.added.length,
      newPermissionCount: effectivePermissions.length,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      user: updateResult.Attributes,
      permissionChanges: {
        added: permissionDiff.added,
        totalPermissions: effectivePermissions.length
      }
    };
  } catch (error) {
    console.error('Error assigning user to team:', error);
    throw error;
  }
}

/**
 * Remove a user from a team
 * 
 * @param userId - User to remove
 * @param teamId - Team to remove from
 * @param removedBy - User ID who is making the removal
 * @returns Updated user record
 */
export async function removeUserFromTeam(
  userId: string,
  teamId: TeamId,
  removedBy: string
) {
  try {
    // Fetch current user record
    const userResult = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!userResult.Item) {
      throw new Error('User not found');
    }
    
    const user = userResult.Item;
    
    // Get current team assignments
    const currentTeams: TeamAssignment[] = user.teams || [];
    
    // Check if user is actually on this team
    const isOnTeam = currentTeams.some(t => t.teamId === teamId);
    if (!isOnTeam) {
      throw new Error('User is not a member of this team');
    }
    
    // Remove team assignment
    const updatedTeams = removeTeamAssignment(currentTeams, teamId);
    
    // Recalculate effective permissions
    const basePermissions: AdminPermission[] = user.permissions || [];
    const effectivePermissions = calculateEffectivePermissions(updatedTeams, basePermissions);
    
    // Calculate permission changes for audit logging
    const oldPermissions = user.effectivePermissions || [];
    const permissionDiff = comparePermissions(oldPermissions, effectivePermissions);
    
    // Update user record
    const updateResult = await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET teams = :teams, effectivePermissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':teams': updatedTeams,
        ':permissions': effectivePermissions,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    // Log the removal
    console.log('Team removal completed', {
      userId,
      email: user.email,
      teamId,
      removedBy,
      permissionsRemoved: permissionDiff.removed.length,
      newPermissionCount: effectivePermissions.length,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      user: updateResult.Attributes,
      permissionChanges: {
        removed: permissionDiff.removed,
        totalPermissions: effectivePermissions.length
      }
    };
  } catch (error) {
    console.error('Error removing user from team:', error);
    throw error;
  }
}

/**
 * Update a user's role within a team
 * 
 * @param userId - User to update
 * @param teamId - Team to update role in
 * @param newRole - New role for the user
 * @param updatedBy - User ID who is making the update
 * @returns Updated user record
 */
export async function updateUserTeamRole(
  userId: string,
  teamId: TeamId,
  newRole: TeamRole,
  updatedBy: string
) {
  try {
    // Fetch current user record
    const userResult = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!userResult.Item) {
      throw new Error('User not found');
    }
    
    const user = userResult.Item;
    
    // Get current team assignments
    const currentTeams: TeamAssignment[] = user.teams || [];
    
    // Check if user is on this team
    const currentAssignment = currentTeams.find(t => t.teamId === teamId);
    if (!currentAssignment) {
      throw new Error('User is not a member of this team');
    }
    
    // Check if role is actually changing
    if (currentAssignment.role === newRole) {
      throw new Error('User already has this role in the team');
    }
    
    // Update team role
    const updatedTeams = updateTeamRole(currentTeams, teamId, newRole, updatedBy);
    
    if (!updatedTeams) {
      throw new Error('Failed to update team role');
    }
    
    // Recalculate effective permissions
    const basePermissions: AdminPermission[] = user.permissions || [];
    const effectivePermissions = calculateEffectivePermissions(updatedTeams, basePermissions);
    
    // Calculate permission changes for audit logging
    const oldPermissions = user.effectivePermissions || [];
    const permissionDiff = comparePermissions(oldPermissions, effectivePermissions);
    
    // Update user record
    const updateResult = await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET teams = :teams, effectivePermissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':teams': updatedTeams,
        ':permissions': effectivePermissions,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    // Log the role update
    console.log('Team role update completed', {
      userId,
      email: user.email,
      teamId,
      oldRole: currentAssignment.role,
      newRole,
      updatedBy,
      permissionsChanged: permissionDiff.added.length + permissionDiff.removed.length,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      user: updateResult.Attributes,
      permissionChanges: {
        added: permissionDiff.added,
        removed: permissionDiff.removed,
        totalPermissions: effectivePermissions.length
      }
    };
  } catch (error) {
    console.error('Error updating user team role:', error);
    throw error;
  }
}

/**
 * Get a user's team assignments and permissions
 * 
 * @param userId - User to get info for
 * @returns User's teams and permissions
 */
export async function getUserTeamInfo(userId: string) {
  try {
    const userResult = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!userResult.Item) {
      throw new Error('User not found');
    }
    
    const user = userResult.Item;
    
    const teams: TeamAssignment[] = user.teams || [];
    const effectivePermissions: string[] = user.effectivePermissions || [];
    
    // Enrich team data with team names
    const enrichedTeams = teams.map(t => ({
      ...t,
      teamName: TEAM_DEFINITIONS[t.teamId].name,
      teamDescription: TEAM_DEFINITIONS[t.teamId].description
    }));
    
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      teams: enrichedTeams,
      effectivePermissions,
      basePermissions: user.permissions || []
    };
  } catch (error) {
    console.error('Error fetching user team info:', error);
    throw error;
  }
}

/**
 * Assign multiple users to a team at once
 * 
 * Bulk operation for initial team setup
 * 
 * @param userIds - Array of user IDs to assign
 * @param teamId - Team to assign to
 * @param role - Role in the team
 * @param assignedBy - User ID who is making the assignment
 * @returns Results of bulk assignment
 */
export async function bulkAssignUsersToTeam(
  userIds: string[],
  teamId: TeamId,
  role: TeamRole,
  assignedBy: string
) {
  const results = {
    successful: [] as string[],
    failed: [] as { userId: string; error: string }[]
  };
  
  for (const userId of userIds) {
    try {
      await assignUserToTeam(userId, teamId, role, assignedBy);
      results.successful.push(userId);
    } catch (error) {
      results.failed.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Get users who are not assigned to any team
 * 
 * Useful for finding staff members who need team assignments
 * 
 * @returns Array of unassigned staff users
 */
export async function getUnassignedStaffUsers() {
  try {
    const result = await dynamoDB.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userType = :userType',
      ExpressionAttributeValues: {
        ':userType': 'staff'
      }
    }).promise();
    
    if (!result.Items) {
      return [];
    }
    
    // Filter for users with no teams or empty teams array
    const unassignedUsers = result.Items
      .filter(user => !user.teams || user.teams.length === 0)
      .map(user => ({
        userId: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
        createdAt: user.createdAt
      }));
    
    return unassignedUsers;
  } catch (error) {
    console.error('Error fetching unassigned staff users:', error);
    throw new Error('Failed to fetch unassigned staff users');
  }
}

/**
 * Recalculate and update effective permissions for a user
 * 
 * Use this after manual permission changes or team definition updates
 * 
 * @param userId - User to recalculate permissions for
 * @returns Updated permissions
 */
export async function recalculateUserPermissions(userId: string) {
  try {
    const userResult = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!userResult.Item) {
      throw new Error('User not found');
    }
    
    const user = userResult.Item;
    const teams: TeamAssignment[] = user.teams || [];
    const basePermissions: AdminPermission[] = user.permissions || [];
    
    // Recalculate effective permissions
    const effectivePermissions = calculateEffectivePermissions(teams, basePermissions);
    
    // Update user record
    await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET effectivePermissions = :permissions, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':permissions': effectivePermissions,
        ':updatedAt': new Date().toISOString()
      }
    }).promise();
    
    console.log('Recalculated permissions', {
      userId,
      email: user.email,
      teamCount: teams.length,
      permissionCount: effectivePermissions.length,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      effectivePermissions,
      teamCount: teams.length
    };
  } catch (error) {
    console.error('Error recalculating user permissions:', error);
    throw error;
  }
}

/**
 * Recalculate permissions for all staff users
 * 
 * Use this after team definition updates
 * 
 * @returns Summary of recalculation results
 */
export async function recalculateAllStaffPermissions() {
  try {
    const result = await dynamoDB.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userType = :userType',
      ExpressionAttributeValues: {
        ':userType': 'staff'
      }
    }).promise();
    
    if (!result.Items) {
      return { processed: 0, errors: [] };
    }
    
    const errors: { userId: string; error: string }[] = [];
    let processed = 0;
    
    for (const user of result.Items) {
      try {
        await recalculateUserPermissions(user.id);
        processed++;
      } catch (error) {
        errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      processed,
      total: result.Items.length,
      errors
    };
  } catch (error) {
    console.error('Error recalculating all staff permissions:', error);
    throw new Error('Failed to recalculate staff permissions');
  }
}
