/**
 * @fileoverview TypeScript interfaces for AWS Cognito dual-pool authentication service
 * 
 * This module defines the core interfaces for the dual Cognito User Pool architecture,
 * supporting separate authentication domains for customers and staff with independent
 * security policies and role-based access control.
 * 
 * Key Features:
 * - Dual authentication domains (Customer and Staff User Pools)
 * - Role-based access control with Cognito Groups
 * - Enhanced security for staff authentication
 * - Backward compatibility with existing admin interface
 * - Environment-aware configuration (LocalStack vs AWS)
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { AdminPermission } from '../types/common';

/**
 * Base token set interface for JWT tokens
 */
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn?: number;
}

/**
 * Customer authentication result interface
 * Used for Individual, Dealer, and Premium customer authentication
 */
export interface CustomerAuthResult {
  success: boolean;
  tokens?: TokenSet;
  customer?: {
    id: string;
    email: string;
    name: string;
    customerType: CustomerTier;
    emailVerified: boolean;
    phoneVerified?: boolean;
  };
  requiresMFA?: boolean;
  mfaToken?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Staff authentication result interface
 * Used for admin interface authentication with enhanced security
 */
export interface StaffAuthResult {
  success: boolean;
  tokens?: TokenSet;
  staff?: {
    id: string;
    email: string;
    name: string;
    role: string; // Changed from StaffRole to string to match frontend UserRole enum format
    permissions: AdminPermission[];
    team?: string;
    mfaEnabled: boolean;
  };
  requiresMFA?: boolean;
  mfaToken?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Customer tier enumeration for role-based access
 * Maps to Cognito Groups in Customer User Pool
 */
export enum CustomerTier {
  INDIVIDUAL = 'individual',
  DEALER = 'dealer', 
  PREMIUM = 'premium'
}

/**
 * Staff role enumeration for admin interface
 * Maps to Cognito Groups in Staff User Pool
 */
export enum StaffRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  TEAM_MEMBER = 'team_member'
}

/**
 * Customer JWT claims interface
 * Extracted from Customer User Pool tokens
 */
export interface CustomerClaims {
  sub: string; // Cognito User ID
  email: string;
  email_verified: boolean;
  name: string;
  'custom:customer_type': CustomerTier;
  'cognito:groups'?: string[];
  permissions: string[];
  iss: string; // Cognito issuer
  aud: string; // App client ID
  token_use: 'access' | 'id';
  iat: number;
  exp: number;
}

/**
 * Staff JWT claims interface  
 * Extracted from Staff User Pool tokens
 */
export interface StaffClaims {
  sub: string; // Cognito User ID
  email: string;
  email_verified: boolean;
  name: string;
  'custom:permissions': string; // JSON string of AdminPermission[]
  'custom:team'?: string;
  'cognito:groups'?: string[];
  permissions: AdminPermission[];
  role: StaffRole;
  iss: string; // Cognito issuer
  aud: string; // App client ID
  token_use: 'access' | 'id';
  iat: number;
  exp: number;
}

/**
 * Customer registration data interface
 */
export interface CustomerRegistration {
  email: string;
  password: string;
  name: string;
  phone?: string;
  customerType: CustomerTier;
  agreeToTerms: boolean;
  marketingOptIn?: boolean;
}

/**
 * Staff registration data interface (for admin-created accounts)
 */
export interface StaffRegistration {
  email: string;
  temporaryPassword: string;
  name: string;
  role: StaffRole;
  permissions: AdminPermission[];
  team?: string;
  requireMFA?: boolean;
}

/**
 * MFA challenge response interface
 */
export interface MFAChallenge {
  challengeName: 'SMS_MFA' | 'SOFTWARE_TOKEN_MFA' | 'NEW_PASSWORD_REQUIRED';
  challengeParameters: Record<string, string>;
  session: string;
}

/**
 * Password reset request interface
 */
export interface PasswordResetRequest {
  email: string;
  userType: 'customer' | 'staff';
}

/**
 * Password reset confirmation interface
 */
export interface PasswordResetConfirmation {
  email: string;
  confirmationCode: string;
  newPassword: string;
  userType: 'customer' | 'staff';
}

/**
 * Core authentication service interface
 * Defines methods for both customer and staff authentication
 */
export interface AuthService {
  // Customer authentication methods
  customerLogin(email: string, password: string, deviceId?: string): Promise<CustomerAuthResult>;
  customerRegister(userData: CustomerRegistration): Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  customerRefreshToken(refreshToken: string): Promise<TokenSet>;
  customerForgotPassword(email: string): Promise<{ success: boolean; message: string }>;
  customerConfirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<{ success: boolean; message: string }>;
  customerResendConfirmation(email: string): Promise<{ success: boolean; message: string }>;
  customerConfirmSignUp(email: string, confirmationCode: string): Promise<{ success: boolean; message: string }>;
  
  // Staff authentication methods
  staffLogin(email: string, password: string, deviceId?: string): Promise<StaffAuthResult>;
  staffRefreshToken(refreshToken: string): Promise<TokenSet>;
  staffForgotPassword(email: string): Promise<{ success: boolean; message: string }>;
  staffConfirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<{ success: boolean; message: string }>;
  
  // Token validation methods
  validateCustomerToken(token: string): Promise<CustomerClaims>;
  validateStaffToken(token: string): Promise<StaffClaims>;
  
  // MFA methods
  customerSetupMFA(accessToken: string, clientInfo: any): Promise<{ secretCode: string; qrCodeUrl: string }>;
  customerVerifyMFA(accessToken: string, mfaCode: string, clientInfo: any): Promise<{ success: boolean; message: string }>;
  staffSetupMFA(accessToken: string, clientInfo: any): Promise<{ secretCode: string; qrCodeUrl: string }>;
  staffVerifyMFA(accessToken: string, mfaCode: string, clientInfo: any): Promise<{ success: boolean; message: string }>;
  
  // Session management
  logout(accessToken: string, userType: 'customer' | 'staff', clientInfo: any, sessionId?: string): Promise<{ success: boolean; message: string }>;
  logoutAllDevices(accessToken: string, userType: 'customer' | 'staff', clientInfo: any): Promise<{ success: boolean; message: string }>;
  
  // Customer tier management
  assignCustomerTier(email: string, newTier: CustomerTier, adminUserId?: string): Promise<{ success: boolean; message: string }>;
  modifyCustomerTier(email: string, targetTier: CustomerTier, adminUserId: string): Promise<{ success: boolean; message: string; previousTier?: CustomerTier }>;
  validateCustomerTierAccess(email: string, requiredFeature: string): Promise<{ hasAccess: boolean; customerTier?: CustomerTier; message?: string }>;
  getCustomerTierInfo(email: string): Promise<{ success: boolean; customerTier?: CustomerTier; permissions?: string[]; groups?: string[]; message?: string }>;
  
  // Staff role management
  assignStaffRole(email: string, newRole: StaffRole, permissions: AdminPermission[], adminUserId: string, team?: string): Promise<{ success: boolean; message: string }>;
  modifyStaffPermissions(email: string, permissions: AdminPermission[], adminUserId: string): Promise<{ success: boolean; message: string; previousPermissions?: AdminPermission[] }>;
  assignStaffToTeam(email: string, team: string, adminUserId: string): Promise<{ success: boolean; message: string; previousTeam?: string }>;
  getStaffRoleInfo(email: string): Promise<{ success: boolean; role?: StaffRole; permissions?: AdminPermission[]; team?: string; groups?: string[]; message?: string }>;
  validateStaffPermission(email: string, requiredPermission: AdminPermission): Promise<{ hasPermission: boolean; role?: StaffRole; message?: string }>;
}

/**
 * User pool configuration interface
 */
export interface UserPoolConfig {
  poolId: string;
  clientId: string;
  region: string;
  endpoint?: string; // For LocalStack
}

/**
 * Authentication error interface
 */
export interface AuthError {
  code: string;
  message: string;
  userType: 'customer' | 'staff';
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
}

/**
 * Authentication event interface for audit logging
 */
export interface AuthEvent {
  eventType: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_RESET' | 'MFA_SETUP' | 'MFA_VERIFY' | 'TOKEN_REFRESH' | 'FAILED_LOGIN';
  userType: 'customer' | 'staff';
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  errorCode?: string;
  additionalData?: Record<string, any>;
}

/**
 * Customer tier permissions mapping
 * Defines what features each customer tier can access
 */
export const CUSTOMER_PERMISSIONS = {
  [CustomerTier.INDIVIDUAL]: [
    'view_listings',
    'create_inquiry',
    'manage_profile',
    'save_searches',
    'view_saved_listings'
  ],
  [CustomerTier.DEALER]: [
    'view_listings',
    'create_listing',
    'manage_inventory',
    'dealer_analytics',
    'bulk_operations',
    'manage_profile',
    'save_searches',
    'view_saved_listings'
  ],
  [CustomerTier.PREMIUM]: [
    'view_listings',
    'create_listing',
    'manage_inventory',
    'premium_analytics',
    'advanced_search',
    'premium_support',
    'priority_listing',
    'bulk_operations',
    'manage_profile',
    'save_searches',
    'view_saved_listings',
    'export_data'
  ]
} as const;

/**
 * Staff role permissions mapping
 * Maps staff roles to admin permissions for backward compatibility
 */
export const STAFF_PERMISSIONS = {
  [StaffRole.SUPER_ADMIN]: Object.values(AdminPermission),
  [StaffRole.ADMIN]: [
    AdminPermission.USER_MANAGEMENT,
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_LOG_VIEW,
    AdminPermission.TIER_MANAGEMENT,
    AdminPermission.BILLING_MANAGEMENT,
    AdminPermission.PLATFORM_SETTINGS
  ],
  [StaffRole.MANAGER]: [
    AdminPermission.USER_MANAGEMENT,
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_LOG_VIEW,
    AdminPermission.SALES_MANAGEMENT
  ],
  [StaffRole.TEAM_MEMBER]: [
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.SUPPORT_ACCESS
  ]
} as const;

/**
 * Type guard to check if claims are customer claims
 */
export function isCustomerClaims(claims: CustomerClaims | StaffClaims): claims is CustomerClaims {
  return 'custom:customer_type' in claims;
}

/**
 * Type guard to check if claims are staff claims
 */
export function isStaffClaims(claims: CustomerClaims | StaffClaims): claims is StaffClaims {
  return 'custom:permissions' in claims;
}

/**
 * Type guard to check if auth result is customer auth result
 */
export function isCustomerAuthResult(result: CustomerAuthResult | StaffAuthResult): result is CustomerAuthResult {
  return 'customer' in result;
}

/**
 * Type guard to check if auth result is staff auth result
 */
export function isStaffAuthResult(result: CustomerAuthResult | StaffAuthResult): result is StaffAuthResult {
  return 'staff' in result;
}