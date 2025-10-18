export interface Location {
  city: string;
  state: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface BoatDetails {
  type: string;
  manufacturer?: string;
  model?: string;
  year: number;
  length: number;
  beam?: number;
  draft?: number;
  engine?: string;
  hours?: number;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
}

export interface Listing {
  listingId: string;
  ownerId: string;
  title: string;
  description: string;
  price: number;
  location: Location;
  boatDetails: BoatDetails;
  features: string[];
  images: string[];
  videos?: string[];
  thumbnails: string[];
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'inactive' | 'sold';
  moderationStatus?: {
    reviewedBy?: string;
    reviewedAt?: number;
    rejectionReason?: string;
    moderatorNotes?: string;
  };
  views?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SearchFilters {
  query?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    state?: string;
    radius?: number;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  boatType?: string[];
  yearRange?: {
    min?: number;
    max?: number;
  };
  lengthRange?: {
    min?: number;
    max?: number;
  };
  features?: string[];
}

// User and Authentication Types
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum AdminPermission {
  USER_MANAGEMENT = 'user_management',
  CONTENT_MODERATION = 'content_moderation',
  FINANCIAL_ACCESS = 'financial_access',
  SYSTEM_CONFIG = 'system_config',
  ANALYTICS_VIEW = 'analytics_view',
  AUDIT_LOG_VIEW = 'audit_log_view',
  TIER_MANAGEMENT = 'tier_management',
  CAPABILITY_ASSIGNMENT = 'capability_assignment',
  BILLING_MANAGEMENT = 'billing_management',
  SALES_MANAGEMENT = 'sales_management',
  PLATFORM_SETTINGS = 'platform_settings',
  SUPPORT_ACCESS = 'support_access'
}

// Dealer Sub-Account Types
export enum DealerSubAccountRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff'
}

export interface DealerAccessScope {
  listings: string[] | 'all';
  leads: boolean;
  analytics: boolean;
  inventory: boolean;
  pricing: boolean;
  financial: boolean;
}

export interface DealerSubAccount {
  id: string;
  email: string;
  name: string;
  parentDealerId: string;
  parentDealerName?: string;
  dealerAccountRole: DealerSubAccountRole;
  delegatedPermissions: string[];
  accessScope: DealerAccessScope;
  status: UserStatus;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  emailVerified: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  userType?: 'customer' | 'staff';
  role: UserRole;
  status: UserStatus;
  permissions?: AdminPermission[];
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  password?: string;
  lastLogin?: string;
  loginAttempts: number;
  lockedUntil?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: string;
  createdAt: string;
  updatedAt: string;
  
  // Dealer Sub-Account fields
  isDealerSubAccount?: boolean;
  parentDealerId?: string;
  dealerAccountRole?: DealerSubAccountRole;
  delegatedPermissions?: string[];
  accessScope?: DealerAccessScope;
}

export interface AdminUser extends User {
  role: UserRole.ADMIN | UserRole.SUPER_ADMIN | UserRole.MODERATOR | UserRole.SUPPORT;
  permissions: AdminPermission[];
  ipWhitelist?: string[];
  sessionTimeout: number; // in minutes
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  issuedAt: string;
  expiresAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: string;
  failureReason?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sessionId: string;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any[];
    requestId: string;
  };
}

// Export Phase 3 types from shared-types
export type { StaffUserRecord, TeamAssignment } from '@harborlist/shared-types';
