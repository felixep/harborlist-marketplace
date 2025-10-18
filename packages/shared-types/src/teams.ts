/**
 * Team-Based Staff Roles System
 * 
 * Defines the 8 specialized teams within the HarborList organization,
 * their roles, permissions, and responsibilities.
 */

/**
 * Team identifiers for the 8 specialized teams
 */
export enum TeamId {
  SALES = 'sales',
  CUSTOMER_SUPPORT = 'customer_support',
  CONTENT_MODERATION = 'content_moderation',
  TECHNICAL_OPERATIONS = 'technical_operations',
  MARKETING = 'marketing',
  FINANCE = 'finance',
  PRODUCT = 'product',
  EXECUTIVE = 'executive'
}

/**
 * Roles within a team
 */
export enum TeamRole {
  MANAGER = 'manager',
  MEMBER = 'member'
}

/**
 * Team definition with metadata and default permissions
 */
export interface TeamDefinition {
  id: TeamId;
  name: string;
  description: string;
  responsibilities: string[];
  defaultPermissions: string[];
  managerPermissions: string[];
}

/**
 * Assignment of a user to a team
 */
export interface TeamAssignment {
  teamId: TeamId;
  role: TeamRole;
  assignedAt: string; // ISO 8601 timestamp
  assignedBy: string; // User ID who made the assignment
}

/**
 * Complete team definitions with permissions
 */
export const TEAM_DEFINITIONS: Record<TeamId, TeamDefinition> = {
  [TeamId.SALES]: {
    id: TeamId.SALES,
    name: 'Sales Team',
    description: 'Handles sales activities, lead management, and customer acquisition',
    responsibilities: [
      'Manage sales leads and opportunities',
      'Contact potential customers',
      'Close deals and manage sales pipeline',
      'Track sales metrics and performance',
      'Coordinate with dealers and premium customers'
    ],
    defaultPermissions: [
      'view_leads',
      'respond_to_leads',
      'view_customer_info',
      'view_analytics',
      'view_sales_reports',
      'create_notes',
      'manage_own_leads'
    ],
    managerPermissions: [
      'view_leads',
      'respond_to_leads',
      'assign_leads',
      'view_customer_info',
      'view_all_leads',
      'view_analytics',
      'view_sales_reports',
      'manage_sales_pipeline',
      'create_notes',
      'manage_own_leads',
      'manage_team_leads',
      'view_team_performance'
    ]
  },

  [TeamId.CUSTOMER_SUPPORT]: {
    id: TeamId.CUSTOMER_SUPPORT,
    name: 'Customer Support Team',
    description: 'Provides customer assistance, handles inquiries, and resolves issues',
    responsibilities: [
      'Respond to customer inquiries',
      'Resolve customer issues and complaints',
      'Manage support tickets',
      'Provide technical assistance',
      'Escalate complex issues to appropriate teams'
    ],
    defaultPermissions: [
      'view_support_tickets',
      'respond_to_tickets',
      'view_customer_info',
      'view_user_profiles',
      'view_listings',
      'create_notes',
      'manage_own_tickets',
      'view_knowledge_base'
    ],
    managerPermissions: [
      'view_support_tickets',
      'respond_to_tickets',
      'assign_tickets',
      'view_customer_info',
      'view_user_profiles',
      'view_listings',
      'view_all_tickets',
      'manage_ticket_queue',
      'create_notes',
      'manage_own_tickets',
      'manage_team_tickets',
      'view_support_metrics',
      'edit_knowledge_base'
    ]
  },

  [TeamId.CONTENT_MODERATION]: {
    id: TeamId.CONTENT_MODERATION,
    name: 'Content Moderation Team',
    description: 'Reviews and moderates user-generated content, enforces community standards',
    responsibilities: [
      'Review flagged listings',
      'Moderate user-generated content',
      'Enforce community guidelines',
      'Handle abuse reports',
      'Approve or reject listings',
      'Suspend or ban violating accounts'
    ],
    defaultPermissions: [
      'view_flagged_content',
      'review_listings',
      'approve_listings',
      'reject_listings',
      'view_reports',
      'create_moderation_notes',
      'view_user_profiles',
      'view_moderation_queue'
    ],
    managerPermissions: [
      'view_flagged_content',
      'review_listings',
      'approve_listings',
      'reject_listings',
      'delete_listings',
      'suspend_users',
      'ban_users',
      'view_reports',
      'assign_moderation_tasks',
      'create_moderation_notes',
      'view_user_profiles',
      'view_moderation_queue',
      'manage_moderation_queue',
      'view_moderation_metrics',
      'update_content_policies'
    ]
  },

  [TeamId.TECHNICAL_OPERATIONS]: {
    id: TeamId.TECHNICAL_OPERATIONS,
    name: 'Technical Operations Team',
    description: 'Manages technical infrastructure, deployments, and system health',
    responsibilities: [
      'Monitor system health and performance',
      'Manage deployments and releases',
      'Handle technical incidents',
      'Maintain infrastructure',
      'Perform database operations',
      'Manage API integrations'
    ],
    defaultPermissions: [
      'view_system_metrics',
      'view_logs',
      'view_error_reports',
      'view_api_usage',
      'create_technical_notes',
      'view_infrastructure_status'
    ],
    managerPermissions: [
      'view_system_metrics',
      'view_logs',
      'view_error_reports',
      'view_api_usage',
      'manage_deployments',
      'manage_infrastructure',
      'perform_database_operations',
      'manage_api_keys',
      'create_technical_notes',
      'view_infrastructure_status',
      'manage_system_configuration',
      'access_production_console',
      'manage_backups'
    ]
  },

  [TeamId.MARKETING]: {
    id: TeamId.MARKETING,
    name: 'Marketing Team',
    description: 'Manages marketing campaigns, content, and customer engagement',
    responsibilities: [
      'Create and manage marketing campaigns',
      'Manage email marketing',
      'Analyze marketing metrics',
      'Create promotional content',
      'Manage social media presence',
      'Coordinate with sales team'
    ],
    defaultPermissions: [
      'view_marketing_metrics',
      'view_customer_analytics',
      'create_campaigns',
      'view_email_campaigns',
      'view_promotional_content',
      'create_marketing_notes'
    ],
    managerPermissions: [
      'view_marketing_metrics',
      'view_customer_analytics',
      'create_campaigns',
      'manage_campaigns',
      'send_email_campaigns',
      'view_email_campaigns',
      'view_promotional_content',
      'create_promotional_content',
      'manage_promotional_content',
      'create_marketing_notes',
      'manage_marketing_budget',
      'view_roi_metrics',
      'manage_social_media'
    ]
  },

  [TeamId.FINANCE]: {
    id: TeamId.FINANCE,
    name: 'Finance Team',
    description: 'Manages financial operations, billing, and revenue tracking',
    responsibilities: [
      'Process payments and refunds',
      'Manage subscriptions and billing',
      'Track revenue and financial metrics',
      'Handle invoicing',
      'Manage payment disputes',
      'Generate financial reports'
    ],
    defaultPermissions: [
      'view_transactions',
      'view_payment_info',
      'view_subscription_info',
      'view_financial_reports',
      'create_finance_notes',
      'view_invoices'
    ],
    managerPermissions: [
      'view_transactions',
      'view_payment_info',
      'view_subscription_info',
      'view_financial_reports',
      'process_refunds',
      'manage_subscriptions',
      'manage_billing',
      'create_invoices',
      'manage_payment_disputes',
      'create_finance_notes',
      'view_invoices',
      'manage_pricing',
      'view_revenue_metrics',
      'export_financial_data'
    ]
  },

  [TeamId.PRODUCT]: {
    id: TeamId.PRODUCT,
    name: 'Product Team',
    description: 'Manages product development, features, and user experience',
    responsibilities: [
      'Define product roadmap',
      'Manage feature development',
      'Analyze user feedback',
      'Conduct user research',
      'Prioritize product backlog',
      'Coordinate with technical team'
    ],
    defaultPermissions: [
      'view_product_metrics',
      'view_user_feedback',
      'view_feature_requests',
      'create_product_notes',
      'view_usage_analytics',
      'view_user_behavior'
    ],
    managerPermissions: [
      'view_product_metrics',
      'view_user_feedback',
      'view_feature_requests',
      'manage_feature_requests',
      'create_product_notes',
      'view_usage_analytics',
      'view_user_behavior',
      'manage_product_roadmap',
      'prioritize_features',
      'manage_product_releases',
      'conduct_user_research',
      'view_all_analytics'
    ]
  },

  [TeamId.EXECUTIVE]: {
    id: TeamId.EXECUTIVE,
    name: 'Executive Team',
    description: 'Leadership team with full system access and strategic oversight',
    responsibilities: [
      'Strategic planning and decision making',
      'Cross-functional oversight',
      'Company-wide policy setting',
      'Performance review and evaluation',
      'Budget and resource allocation',
      'Final escalation point'
    ],
    defaultPermissions: [
      'view_all_metrics',
      'view_all_reports',
      'view_all_analytics',
      'view_all_teams',
      'view_all_users',
      'view_financial_overview',
      'view_strategic_metrics',
      'create_executive_notes'
    ],
    managerPermissions: [
      'view_all_metrics',
      'view_all_reports',
      'view_all_analytics',
      'view_all_teams',
      'view_all_users',
      'view_financial_overview',
      'view_strategic_metrics',
      'manage_company_settings',
      'manage_all_teams',
      'manage_staff_roles',
      'access_all_systems',
      'override_policies',
      'create_executive_notes',
      'manage_budgets',
      'strategic_planning'
    ]
  }
};

/**
 * Helper function to get team definition by ID
 */
export function getTeamDefinition(teamId: TeamId): TeamDefinition {
  return TEAM_DEFINITIONS[teamId];
}

/**
 * Helper function to get all team IDs
 */
export function getAllTeamIds(): TeamId[] {
  return Object.values(TeamId);
}

/**
 * Helper function to get team name by ID
 */
export function getTeamName(teamId: TeamId): string {
  return TEAM_DEFINITIONS[teamId].name;
}

/**
 * Helper function to check if a user has manager role in any team
 */
export function hasManagerRoleInTeam(teams: TeamAssignment[], teamId: TeamId): boolean {
  return teams.some(t => t.teamId === teamId && t.role === TeamRole.MANAGER);
}

/**
 * Helper function to check if a user is a member of a team
 */
export function isMemberOfTeam(teams: TeamAssignment[], teamId: TeamId): boolean {
  return teams.some(t => t.teamId === teamId);
}

/**
 * Helper function to get all team IDs a user is assigned to
 */
export function getUserTeamIds(teams: TeamAssignment[]): TeamId[] {
  return teams.map(t => t.teamId);
}

/**
 * Helper function to get user's manager teams
 */
export function getManagerTeams(teams: TeamAssignment[]): TeamId[] {
  return teams
    .filter(t => t.role === TeamRole.MANAGER)
    .map(t => t.teamId);
}

/**
 * Helper function to get user's member teams (non-manager)
 */
export function getMemberTeams(teams: TeamAssignment[]): TeamId[] {
  return teams
    .filter(t => t.role === TeamRole.MEMBER)
    .map(t => t.teamId);
}

/**
 * Validate team assignment
 */
export function isValidTeamAssignment(assignment: Partial<TeamAssignment>): boolean {
  if (!assignment.teamId || !assignment.role) {
    return false;
  }
  
  // Check if team ID is valid
  if (!Object.values(TeamId).includes(assignment.teamId as TeamId)) {
    return false;
  }
  
  // Check if role is valid
  if (!Object.values(TeamRole).includes(assignment.role as TeamRole)) {
    return false;
  }
  
  return true;
}

/**
 * Get default permissions for a team assignment
 */
export function getDefaultPermissionsForAssignment(assignment: TeamAssignment): string[] {
  const teamDef = TEAM_DEFINITIONS[assignment.teamId];
  
  if (assignment.role === TeamRole.MANAGER) {
    return teamDef.managerPermissions;
  } else {
    return teamDef.defaultPermissions;
  }
}

/**
 * Calculate total permissions from multiple team assignments
 */
export function calculateTeamPermissions(teams: TeamAssignment[]): string[] {
  const allPermissions = new Set<string>();
  
  for (const team of teams) {
    const permissions = getDefaultPermissionsForAssignment(team);
    permissions.forEach(p => allPermissions.add(p));
  }
  
  return Array.from(allPermissions);
}

/**
 * Permission categories for easier management
 */
export const PERMISSION_CATEGORIES = {
  VIEWING: [
    'view_leads', 'view_support_tickets', 'view_flagged_content',
    'view_system_metrics', 'view_marketing_metrics', 'view_transactions',
    'view_product_metrics', 'view_all_metrics'
  ],
  MANAGEMENT: [
    'manage_sales_pipeline', 'manage_ticket_queue', 'manage_moderation_queue',
    'manage_deployments', 'manage_campaigns', 'manage_subscriptions',
    'manage_product_roadmap', 'manage_company_settings'
  ],
  ACTIONS: [
    'respond_to_leads', 'respond_to_tickets', 'approve_listings',
    'reject_listings', 'send_email_campaigns', 'process_refunds'
  ],
  ADMIN: [
    'manage_all_teams', 'manage_staff_roles', 'access_all_systems',
    'override_policies', 'manage_budgets', 'strategic_planning'
  ]
} as const;

/**
 * Team access levels for UI display
 */
export enum TeamAccessLevel {
  NO_ACCESS = 'no_access',
  MEMBER = 'member',
  MANAGER = 'manager'
}

/**
 * Get team access level for a user
 */
export function getTeamAccessLevel(teams: TeamAssignment[], teamId: TeamId): TeamAccessLevel {
  const assignment = teams.find(t => t.teamId === teamId);
  
  if (!assignment) {
    return TeamAccessLevel.NO_ACCESS;
  }
  
  return assignment.role === TeamRole.MANAGER 
    ? TeamAccessLevel.MANAGER 
    : TeamAccessLevel.MEMBER;
}

/**
 * Team statistics interface
 */
export interface TeamStats {
  teamId: TeamId;
  name: string;
  totalMembers: number;
  managerCount: number;
  memberCount: number;
}

/**
 * Team member summary
 */
export interface TeamMemberSummary {
  userId: string;
  email: string;
  name: string;
  role: TeamRole;
  assignedAt: string;
  assignedBy: string;
}
