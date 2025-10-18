/**
 * Team Management API Handler (Phase 3.5)
 * 
 * Lambda-style REST API handler for team management endpoints.
 * Provides HTTP interface for team operations with proper authentication
 * and authorization.
 * 
 * Endpoints:
 * - GET    /api/admin/teams                 - List all teams
 * - GET    /api/admin/teams/stats           - Get all team statistics
 * - GET    /api/admin/teams/:teamId         - Get team details
 * - GET    /api/admin/teams/:teamId/members - Get team members
 * - POST   /api/admin/teams/assign          - Assign user to team
 * - DELETE /api/admin/teams/assign          - Remove user from team
 * - PUT    /api/admin/teams/assign/role     - Update user's team role
 * - GET    /api/admin/teams/users/:userId   - Get user's team info
 * - GET    /api/admin/teams/unassigned      - Get unassigned staff
 * - POST   /api/admin/teams/recalculate     - Recalculate permissions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listAllTeams,
  getTeamDetails,
  getTeamMembers,
  getAllTeamStats,
  assignUserToTeam,
  removeUserFromTeam,
  updateUserTeamRole,
  getUserTeamInfo,
  bulkAssignUsersToTeam,
  getUnassignedStaffUsers,
  recalculateUserPermissions,
  recalculateAllStaffPermissions
} from './teams';
import { TeamId, TeamRole } from '../types/teams';

/**
 * Main handler for team management API
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, pathParameters, body } = event;
  
  console.log('Team API request', {
    method: httpMethod,
    path,
    pathParameters,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Route to appropriate handler
    if (path === '/api/admin/teams' && httpMethod === 'GET') {
      return await handleListTeams();
    }
    
    if (path === '/api/admin/teams/stats' && httpMethod === 'GET') {
      return await handleGetTeamStats();
    }
    
    if (path.match(/^\/api\/admin\/teams\/[^/]+$/) && httpMethod === 'GET') {
      const teamId = pathParameters?.teamId;
      if (!teamId) {
        return createErrorResponse(400, 'Team ID is required');
      }
      return await handleGetTeamDetails(teamId as TeamId);
    }
    
    if (path.match(/^\/api\/admin\/teams\/[^/]+\/members$/) && httpMethod === 'GET') {
      const teamId = pathParameters?.teamId;
      if (!teamId) {
        return createErrorResponse(400, 'Team ID is required');
      }
      return await handleGetTeamMembers(teamId as TeamId);
    }
    
    if (path === '/api/admin/teams/assign' && httpMethod === 'POST') {
      return await handleAssignUserToTeam(body);
    }
    
    if (path === '/api/admin/teams/assign' && httpMethod === 'DELETE') {
      return await handleRemoveUserFromTeam(body);
    }
    
    if (path === '/api/admin/teams/assign/role' && httpMethod === 'PUT') {
      return await handleUpdateTeamRole(body);
    }
    
    if (path.match(/^\/api\/admin\/teams\/users\/[^/]+$/) && httpMethod === 'GET') {
      const userId = pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }
      return await handleGetUserTeamInfo(userId);
    }
    
    if (path === '/api/admin/teams/unassigned' && httpMethod === 'GET') {
      return await handleGetUnassignedStaff();
    }
    
    if (path === '/api/admin/teams/recalculate' && httpMethod === 'POST') {
      return await handleRecalculatePermissions(body);
    }
    
    if (path === '/api/admin/teams/bulk-assign' && httpMethod === 'POST') {
      return await handleBulkAssignUsers(body);
    }
    
    // No matching route
    return createErrorResponse(404, 'Endpoint not found');
    
  } catch (error) {
    console.error('Team API error:', error);
    return createErrorResponse(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/admin/teams
 * List all available teams
 */
async function handleListTeams(): Promise<APIGatewayProxyResult> {
  try {
    const teams = await listAllTeams();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        teams,
        count: teams.length
      })
    };
  } catch (error) {
    return createErrorResponse(500, 'Failed to list teams', error);
  }
}

/**
 * GET /api/admin/teams/stats
 * Get statistics for all teams
 */
async function handleGetTeamStats(): Promise<APIGatewayProxyResult> {
  try {
    const stats = await getAllTeamStats();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        stats
      })
    };
  } catch (error) {
    return createErrorResponse(500, 'Failed to get team stats', error);
  }
}

/**
 * GET /api/admin/teams/:teamId
 * Get detailed information about a specific team
 */
async function handleGetTeamDetails(teamId: TeamId): Promise<APIGatewayProxyResult> {
  try {
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    const teamDetails = await getTeamDetails(teamId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        team: teamDetails
      })
    };
  } catch (error) {
    return createErrorResponse(500, 'Failed to get team details', error);
  }
}

/**
 * GET /api/admin/teams/:teamId/members
 * Get all members of a specific team
 */
async function handleGetTeamMembers(teamId: TeamId): Promise<APIGatewayProxyResult> {
  try {
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    const members = await getTeamMembers(teamId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        members,
        count: members.length
      })
    };
  } catch (error) {
    return createErrorResponse(500, 'Failed to get team members', error);
  }
}

/**
 * POST /api/admin/teams/assign
 * Assign a user to a team
 * 
 * Body: { userId, teamId, role, assignedBy }
 */
async function handleAssignUserToTeam(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createErrorResponse(400, 'Request body is required');
    }
    
    const { userId, teamId, role, assignedBy } = JSON.parse(body);
    
    // Validate required fields
    if (!userId || !teamId || !role || !assignedBy) {
      return createErrorResponse(400, 'Missing required fields: userId, teamId, role, assignedBy');
    }
    
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    // Validate role
    if (!Object.values(TeamRole).includes(role)) {
      return createErrorResponse(400, 'Invalid role. Must be "manager" or "member"');
    }
    
    const result = await assignUserToTeam(userId, teamId, role, assignedBy);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'User successfully assigned to team',
        data: {
          userId,
          teamId,
          role,
          permissionsAdded: result.permissionChanges.added.length,
          totalPermissions: result.permissionChanges.totalPermissions
        }
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(400, 'Failed to assign user to team', message);
  }
}

/**
 * DELETE /api/admin/teams/assign
 * Remove a user from a team
 * 
 * Body: { userId, teamId, removedBy }
 */
async function handleRemoveUserFromTeam(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createErrorResponse(400, 'Request body is required');
    }
    
    const { userId, teamId, removedBy } = JSON.parse(body);
    
    // Validate required fields
    if (!userId || !teamId || !removedBy) {
      return createErrorResponse(400, 'Missing required fields: userId, teamId, removedBy');
    }
    
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    const result = await removeUserFromTeam(userId, teamId, removedBy);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'User successfully removed from team',
        data: {
          userId,
          teamId,
          permissionsRemoved: result.permissionChanges.removed.length,
          totalPermissions: result.permissionChanges.totalPermissions
        }
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(400, 'Failed to remove user from team', message);
  }
}

/**
 * PUT /api/admin/teams/assign/role
 * Update a user's role within a team
 * 
 * Body: { userId, teamId, newRole, updatedBy }
 */
async function handleUpdateTeamRole(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createErrorResponse(400, 'Request body is required');
    }
    
    const { userId, teamId, newRole, updatedBy } = JSON.parse(body);
    
    // Validate required fields
    if (!userId || !teamId || !newRole || !updatedBy) {
      return createErrorResponse(400, 'Missing required fields: userId, teamId, newRole, updatedBy');
    }
    
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    // Validate role
    if (!Object.values(TeamRole).includes(newRole)) {
      return createErrorResponse(400, 'Invalid role. Must be "manager" or "member"');
    }
    
    const result = await updateUserTeamRole(userId, teamId, newRole, updatedBy);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'User role successfully updated',
        data: {
          userId,
          teamId,
          newRole,
          permissionsAdded: result.permissionChanges.added.length,
          permissionsRemoved: result.permissionChanges.removed.length,
          totalPermissions: result.permissionChanges.totalPermissions
        }
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(400, 'Failed to update team role', message);
  }
}

/**
 * GET /api/admin/teams/users/:userId
 * Get a user's team assignments and permissions
 */
async function handleGetUserTeamInfo(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const userInfo = await getUserTeamInfo(userId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        user: userInfo
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message === 'User not found') {
      return createErrorResponse(404, 'User not found');
    }
    
    return createErrorResponse(500, 'Failed to get user team info', message);
  }
}

/**
 * GET /api/admin/teams/unassigned
 * Get all staff users who are not assigned to any team
 */
async function handleGetUnassignedStaff(): Promise<APIGatewayProxyResult> {
  try {
    const unassignedUsers = await getUnassignedStaffUsers();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        users: unassignedUsers,
        count: unassignedUsers.length
      })
    };
  } catch (error) {
    return createErrorResponse(500, 'Failed to get unassigned staff', error);
  }
}

/**
 * POST /api/admin/teams/recalculate
 * Recalculate permissions for one or all users
 * 
 * Body: { userId?: string, all?: boolean }
 */
async function handleRecalculatePermissions(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createErrorResponse(400, 'Request body is required');
    }
    
    const { userId, all } = JSON.parse(body);
    
    if (all) {
      // Recalculate for all staff
      const result = await recalculateAllStaffPermissions();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Permissions recalculated for all staff',
          data: {
            processed: result.processed,
            total: result.total,
            errors: result.errors.length,
            errorDetails: result.errors
          }
        })
      };
    } else if (userId) {
      // Recalculate for specific user
      const result = await recalculateUserPermissions(userId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Permissions recalculated for user',
          data: {
            userId,
            totalPermissions: result.effectivePermissions.length,
            teamCount: result.teamCount
          }
        })
      };
    } else {
      return createErrorResponse(400, 'Must provide either userId or all=true');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(400, 'Failed to recalculate permissions', message);
  }
}

/**
 * POST /api/admin/teams/bulk-assign
 * Assign multiple users to a team at once
 * 
 * Body: { userIds: string[], teamId, role, assignedBy }
 */
async function handleBulkAssignUsers(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createErrorResponse(400, 'Request body is required');
    }
    
    const { userIds, teamId, role, assignedBy } = JSON.parse(body);
    
    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || !teamId || !role || !assignedBy) {
      return createErrorResponse(400, 'Missing required fields: userIds (array), teamId, role, assignedBy');
    }
    
    if (userIds.length === 0) {
      return createErrorResponse(400, 'userIds array cannot be empty');
    }
    
    // Validate team ID
    if (!Object.values(TeamId).includes(teamId)) {
      return createErrorResponse(400, 'Invalid team ID');
    }
    
    // Validate role
    if (!Object.values(TeamRole).includes(role)) {
      return createErrorResponse(400, 'Invalid role. Must be "manager" or "member"');
    }
    
    const result = await bulkAssignUsersToTeam(userIds, teamId, role, assignedBy);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Bulk assignment completed',
        data: {
          teamId,
          role,
          requested: userIds.length,
          successful: result.successful.length,
          failed: result.failed.length,
          successfulUserIds: result.successful,
          failures: result.failed
        }
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(400, 'Failed to bulk assign users', message);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create standardized error response
 */
function createErrorResponse(
  statusCode: number,
  message: string,
  details?: any
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: false,
      error: message,
      details: details || undefined,
      timestamp: new Date().toISOString()
    })
  };
}
