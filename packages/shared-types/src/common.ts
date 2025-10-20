// Import team types for Phase 3
import type { TeamAssignment } from './teams';

export interface Location {
  city: string;
  state: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

// Engine interface for multi-engine boat support
export interface Engine {
  engineId: string;
  type: 'outboard' | 'inboard' | 'sterndrive' | 'jet' | 'electric' | 'hybrid';
  manufacturer?: string;
  model?: string;
  horsepower: number;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  hours?: number;
  year?: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_work';
  specifications?: Record<string, any>;
  position: number; // 1, 2, 3 for multiple engines
}

export interface BoatDetails {
  type: string;
  manufacturer?: string;
  model?: string;
  year: number;
  length: number;
  beam?: number;
  draft?: number;
  engine?: string; // Legacy field - kept for backward compatibility
  hours?: number; // Legacy field - kept for backward compatibility
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
  // New multi-engine support
  engines?: Engine[];
  totalHorsepower?: number;
  engineConfiguration?: 'single' | 'twin' | 'triple' | 'quad';
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
  status: 'active' | 'inactive' | 'sold' | 'pending_moderation' | 'flagged' | 'rejected';
  views?: number;
  rating?: ListingRating;
  createdAt: number;
  updatedAt: number;
  moderationStatus?: 'approved' | 'pending' | 'flagged' | 'rejected';
  flagCount?: number;
  lastModerated?: number;
}

// Enhanced listing interface with multi-engine support and SEO features
export interface EnhancedListing extends Listing {
  slug: string; // SEO-friendly URL slug
  engines: Engine[]; // Multi-engine support
  totalHorsepower: number; // Calculated total horsepower
  engineConfiguration: 'single' | 'twin' | 'triple' | 'quad';
  moderationWorkflow?: {
    status: 'pending_review' | 'approved' | 'rejected' | 'changes_requested';
    reviewedBy?: string;
    reviewedAt?: number;
    rejectionReason?: string;
    moderatorNotes?: string;
    requiredChanges?: string[];
  };
}

export interface Review {
  reviewId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  comment?: string;
  createdAt: number;
  verified?: boolean; // if the user actually contacted/viewed the boat
}

export interface ListingRating {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: Review[];
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
  sort?: {
    field: string;
    order: string;
  };
}

export interface SearchResult {
  results: Listing[];
  total: number;
  facets?: {
    boatTypes: Array<{ value: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    locations: Array<{ state: string; count: number }>;
  };
}

// User and Authentication Types
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  SALES = 'sales'
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
  ADMIN = 'admin',      // Full access to parent dealer account
  MANAGER = 'manager',  // Manage listings and leads
  STAFF = 'staff'       // Limited access based on delegated permissions
}

export interface DealerAccessScope {
  listings: string[] | 'all';  // Specific listing IDs or 'all'
  leads: boolean;               // Can access customer inquiries
  analytics: boolean;           // Can view analytics
  inventory: boolean;           // Can manage inventory
  pricing: boolean;             // Can modify prices
  financial: boolean;           // Can view financial reports
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
  userType?: 'customer' | 'staff'; // NEW: Differentiate between customer and staff users
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
  
  // Premium membership fields
  premiumActive?: boolean;
  premiumExpiresAt?: number;
  premiumTier?: string;
  
  // Dealer Sub-Account fields (for customer users who are dealer sub-accounts)
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
  
  // NEW: Team-based role assignments (Phase 3)
  teams?: TeamAssignment[]; // User's team assignments with roles
  effectivePermissions?: string[]; // Calculated permissions from all teams
}

/**
 * Staff User Record (Phase 3)
 * Staff members with team-based permissions
 */
export interface StaffUserRecord extends AdminUser {
  userType: 'staff'; // Always 'staff' for staff members
  teams: TeamAssignment[]; // Required for staff members
  effectivePermissions: string[]; // Calculated from team assignments and base permissions
}

// User tier and membership management types
export interface UserLimits {
  maxListings: number;
  maxImages: number;
  priorityPlacement: boolean;
  featuredListings: number;
  analyticsAccess: boolean;
  bulkOperations: boolean;
  advancedSearch: boolean;
  premiumSupport: boolean;
}

export interface UserCapability {
  feature: string;
  enabled: boolean;
  expiresAt?: number;
  grantedBy: string;
  grantedAt: number;
  metadata?: Record<string, any>;
}

export interface UserTier {
  tierId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  features: TierFeature[];
  limits: UserLimits;
  pricing: {
    monthly?: number;
    yearly?: number;
    currency: string;
  };
  active: boolean;
  description?: string;
  displayOrder: number;
}

export interface TierFeature {
  featureId: string;
  name: string;
  description: string;
  enabled: boolean;
  limits?: Record<string, number>;
}

export interface EnhancedUser extends User {
  customerTier: 'individual' | 'dealer' | 'premium_individual' | 'premium_dealer'; // Renamed from userType to avoid conflict
  membershipDetails: {
    plan?: string;
    tierId?: string;
    features: string[];
    limits: UserLimits;
    expiresAt?: number;
    autoRenew: boolean;
    billingCycle?: 'monthly' | 'yearly';
  };
  salesRepId?: string;
  capabilities: UserCapability[];
  billingInfo?: {
    customerId?: string;
    subscriptionId?: string;
    paymentMethodId?: string;
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  premiumActive: boolean;
  premiumPlan?: string;
  premiumExpiresAt?: number;
}

export interface SalesUser extends EnhancedUser {
  role: UserRole.ADMIN | UserRole.SUPER_ADMIN;
  permissions: AdminPermission[];
  assignedCustomers: string[];
  salesTargets?: {
    monthly: number;
    quarterly: number;
    yearly: number;
    achieved: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
  };
  commissionRate?: number;
  territory?: string;
  managerUserId?: string;
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
  data?: T;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any[];
    requestId: string;
  };
}

// Admin and Analytics Types
export interface PlatformMetrics {
  totalUsers: number;
  activeListings: number;
  pendingModeration: number;
  systemHealth: HealthStatus;
  revenueToday: number;
  newUsersToday: number;
  newListingsToday: number;
  activeUsersToday: number;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}

export interface DashboardChartData {
  userGrowth: ChartData;
  listingActivity: ChartData;
  systemPerformance: ChartData;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface ContentFlag {
  id: string;
  flagId?: string; // Alternative ID for consistency
  type: 'inappropriate' | 'spam' | 'fraud' | 'duplicate' | 'misleading' | 'copyright' | 'other';
  reason: string;
  reportedBy: string;
  reportedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

// Content moderation workflow types
export interface ModerationWorkflow {
  queueId: string;
  listingId: string;
  submittedBy: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  flags: ContentFlag[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
  moderationNotes?: ModerationNotes;
  submittedAt: number;
  reviewedAt?: number;
  dueDate?: number;
  escalated: boolean;
  escalatedAt?: number;
  escalatedBy?: string;
  escalationReason?: string;
}

export interface ModerationNotes {
  reviewerId: string;
  reviewerName: string;
  decision: 'approve' | 'reject' | 'request_changes';
  reason: string;
  publicNotes?: string; // Notes visible to listing owner
  internalNotes?: string; // Notes only visible to moderators
  requiredChanges?: string[];
  reviewDuration?: number; // Time spent reviewing in minutes
  confidence: 'low' | 'medium' | 'high'; // Moderator confidence in decision
}

export interface ModerationQueue {
  queueId: string;
  name: string;
  description?: string;
  filters: {
    priority?: string[];
    listingTypes?: string[];
    flagTypes?: string[];
    assignedModerators?: string[];
  };
  autoAssignment: boolean;
  maxItemsPerModerator: number;
  slaHours: number; // Service level agreement in hours
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ModerationStats {
  totalFlagged: number;
  pendingReview: number;
  approvedToday: number;
  rejectedToday: number;
  averageReviewTime: number;
  queueBacklog: number;
  moderatorWorkload: Array<{
    moderatorId: string;
    moderatorName: string;
    assignedItems: number;
    completedToday: number;
    averageReviewTime: number;
  }>;
  flagTypeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  slaCompliance: number; // Percentage of items reviewed within SLA
}

export interface FlaggedListing {
  listingId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  price: number;
  location: {
    city: string;
    state: string;
  };
  images: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  flags: ContentFlag[];
  flaggedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  moderationNotes?: string;
}

export interface ModerationDecision {
  action: 'approve' | 'reject' | 'request_changes';
  reason: string;
  notes?: string; // Internal notes for moderators
  publicNotes?: string; // Notes visible to listing owner
  notifyUser: boolean;
  changeRequests?: ChangeRequest[]; // Specific changes requested
  confidence?: 'low' | 'medium' | 'high'; // Moderator confidence level
}

export interface ChangeRequest {
  category: 'title' | 'description' | 'price' | 'images' | 'specifications' | 'other';
  description: string;
  required: boolean;
}

// ModerationStats moved to enhanced version below with ModerationWorkflow types

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsMetrics {
  userMetrics: UserMetrics;
  listingMetrics: ListingMetrics;
  engagementMetrics: EngagementMetrics;
  geographicMetrics: GeographicMetrics;
}

export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userGrowthTrend: TrendData[];
  registrationsByDate: TimeSeriesData[];
  usersByRegion: RegionData[];
}

export interface ListingMetrics {
  totalListings: number;
  newListings: number;
  activeListings: number;
  listingGrowthTrend: TrendData[];
  listingsByDate: TimeSeriesData[];
  listingsByCategory: CategoryData[];
  averageListingPrice: number;
  priceDistribution: PriceRangeData[];
}

export interface EngagementMetrics {
  totalSearches: number;
  uniqueSearchers: number;
  averageSearchesPerUser: number;
  topSearchTerms: SearchTermData[];
  searchesByDate: TimeSeriesData[];
  listingViews: number;
  averageViewsPerListing: number;
  viewsByDate: TimeSeriesData[];
  inquiries: number;
  inquiryRate: number;
  inquiriesByDate: TimeSeriesData[];
}

export interface GeographicMetrics {
  usersByState: StateData[];
  listingsByState: StateData[];
  topCities: CityData[];
  geographicDistribution: GeoDistributionData[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface RegionData {
  region: string;
  count: number;
  percentage: number;
}

export interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

export interface PriceRangeData {
  range: string;
  count: number;
  percentage: number;
}

export interface SearchTermData {
  term: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StateData {
  state: string;
  count: number;
  percentage: number;
}

export interface CityData {
  city: string;
  state: string;
  count: number;
  percentage: number;
}

export interface GeoDistributionData {
  location: string;
  latitude: number;
  longitude: number;
  userCount: number;
  listingCount: number;
}

export interface PlatformSettings {
  general: GeneralSettings;
  features: FeatureFlags;
  content: ContentPolicies;
  listings: ListingConfiguration;
  notifications: NotificationSettings;
}

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxListingsPerUser: number;
  sessionTimeout: number;
}

export interface FeatureFlags {
  userRegistration: boolean;
  listingCreation: boolean;
  messaging: boolean;
  reviews: boolean;
  analytics: boolean;
  paymentProcessing: boolean;
  advancedSearch: boolean;
  mobileApp: boolean;
  socialLogin: boolean;
  emailNotifications: boolean;
}

export interface ContentPolicies {
  termsOfService: string;
  privacyPolicy: string;
  communityGuidelines: string;
  listingPolicies: string;
  lastUpdated: string;
  version: string;
}

export interface ListingConfiguration {
  categories: ListingCategory[];
  pricingTiers: PricingTier[];
  maxImages: number;
  maxDescriptionLength: number;
  requireApproval: boolean;
  autoExpireDays: number;
}

export interface ListingCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  order: number;
  subcategories?: ListingSubcategory[];
}

export interface ListingSubcategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  order: number;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  active: boolean;
  order: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  templates: NotificationTemplate[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
  active: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'listing' | 'general';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  tags: string[];
  attachments: TicketAttachment[];
  responses: TicketResponse[];
  escalated: boolean;
  escalatedAt?: string;
  escalatedBy?: string;
  escalationReason?: string;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  message: string;
  isInternal: boolean;
  authorId: string;
  authorName: string;
  authorType: 'admin' | 'user';
  createdAt: string;
  attachments: TicketAttachment[];
  readBy: string[];
  readAt?: string;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface SettingsUpdateRequest {
  section: keyof PlatformSettings;
  data: any;
  reason: string;
}

export interface SettingsAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  section: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  timestamp: string;
  ipAddress: string;
}

export interface AuditLogStats {
  totalActions: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
  resourceBreakdown: Record<string, number>;
  hourlyActivity: Record<string, number>;
  topUsers: Array<{
    userId: string;
    email: string;
    count: number;
  }>;
  timeRange: string;
  startDate: string;
  endDate: string;
}

export interface TicketFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedTo?: string[];
  dateRange?: DateRange;
  search?: string;
  tags?: string[];
}

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionScore: number;
  ticketsByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  ticketsByCategory: {
    technical: number;
    billing: number;
    account: number;
    listing: number;
    general: number;
  };
  ticketsByStatus: {
    open: number;
    in_progress: number;
    waiting_response: number;
    resolved: number;
    closed: number;
  };
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature' | 'promotion';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  targetAudience: 'all' | 'sellers' | 'buyers' | 'premium' | 'specific';
  targetUserIds?: string[];
  scheduledAt?: string;
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
  channels: AnnouncementChannel[];
  readBy: string[];
  clickCount: number;
  impressionCount: number;
  tags: string[];
}

export interface AnnouncementChannel {
  type: 'email' | 'in_app' | 'push' | 'sms';
  enabled: boolean;
  template?: string;
  subject?: string;
}

export interface AnnouncementStats {
  totalAnnouncements: number;
  activeAnnouncements: number;
  scheduledAnnouncements: number;
  totalImpressions: number;
  totalClicks: number;
  averageClickRate: number;
  announcementsByType: {
    info: number;
    warning: number;
    maintenance: number;
    feature: number;
    promotion: number;
  };
}

// Enhanced Financial Management Types
export interface Transaction {
  id: string;
  transactionId: string; // Alternative ID for consistency
  type: 'payment' | 'refund' | 'commission' | 'payout' | 'membership' | 'subscription';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'disputed' | 'cancelled';
  userId: string;
  userName: string;
  userEmail: string;
  listingId?: string;
  listingTitle?: string;
  paymentMethod: string;
  processorTransactionId: string;
  createdAt: string;
  completedAt?: string;
  description: string;
  fees: number;
  netAmount: number;
  metadata?: Record<string, any>;
  billingAccountId?: string;
  subscriptionId?: string;
  invoiceId?: string;
}

// Billing account management
export interface BillingAccount {
  billingId: string;
  userId: string;
  customerId?: string; // Payment processor customer ID
  paymentMethodId?: string;
  subscriptionId?: string;
  plan: string;
  amount: number;
  currency: string;
  status: 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing';
  nextBillingDate?: number;
  trialEndsAt?: number;
  canceledAt?: number;
  paymentHistory: Transaction[];
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxInfo?: {
    taxId?: string;
    taxExempt: boolean;
    taxRate?: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Finance calculation for boat loans
export interface FinanceCalculation {
  calculationId: string;
  listingId: string;
  userId?: string;
  boatPrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  paymentSchedule?: PaymentScheduleItem[];
  saved: boolean;
  shared: boolean;
  shareToken?: string;
  calculationNotes?: string;
  lenderInfo?: {
    name?: string;
    rate?: number;
    terms?: string;
  };
  createdAt: number;
  updatedAt?: number;
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
}

// Financial reporting and analytics - enhanced existing interface above

// Dispute management
export interface DisputeCase extends DisputedTransaction {
  disputeId: string;
  caseNumber: string;
  disputeType: 'chargeback' | 'inquiry' | 'fraud' | 'authorization' | 'processing_error';
  disputeAmount: number;
  evidenceRequired: string[];
  evidenceSubmitted: DisputeEvidence[];
  respondByDate: string;
  resolution?: {
    outcome: 'won' | 'lost' | 'accepted';
    resolvedAt: string;
    resolvedBy: string;
    notes: string;
  };
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface DisputeEvidence {
  evidenceId: string;
  type: 'receipt' | 'communication' | 'shipping' | 'refund' | 'other';
  description: string;
  fileUrl?: string;
  submittedAt: string;
  submittedBy: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalTransactions: number;
  pendingPayouts: number;
  disputedTransactions: number;
  commissionEarned: number;
  refundsProcessed: number;
}

export interface DisputedTransaction extends Transaction {
  disputeReason: string;
  disputeDate: string;
  disputeStatus: 'open' | 'under_review' | 'resolved' | 'escalated';
  disputeNotes?: string;
}

export interface PaymentProcessor {
  name: string;
  type: 'stripe' | 'paypal' | 'square' | 'other';
  isActive: boolean;
  configuration: {
    apiKey?: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
  };
  supportedFeatures: {
    payments: boolean;
    refunds: boolean;
    disputes: boolean;
    payouts: boolean;
    subscriptions: boolean;
  };
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  adminId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  processedAt?: string;
  notes?: string;
}

export interface PayoutSchedule {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  scheduledDate: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  transactionIds: string[];
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

export interface FinancialReport {
  id: string;
  reportId?: string; // Alternative ID for consistency
  type: 'revenue' | 'commission' | 'payout' | 'dispute' | 'subscription' | 'membership';
  title: string;
  description: string;
  dateRange: DateRange;
  generatedAt: string;
  generatedBy: string;
  format: 'csv' | 'pdf' | 'excel' | 'json';
  downloadUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  filters?: Record<string, any>;
  summary?: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    topPaymentMethods: Array<{ method: string; count: number; amount: number }>;
  };
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange: DateRange;
  metrics: string[];
  includeCharts: boolean;
}
