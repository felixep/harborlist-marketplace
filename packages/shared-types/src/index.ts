// Main exports for @harborlist/shared-types package
// This file serves as the public API for all shared TypeScript definitions

// Common domain types
export * from './common';

// Team-based staff roles
export * from './teams';

// Re-export types and enums
export type {
  // Core entities
  Listing,
  EnhancedListing,
  BoatDetails,
  Engine,
  Location,
  Review,
  ListingRating,
  
  // User management
  User,
  AdminUser,
  EnhancedUser,
  SalesUser,
  UserTier,
  TierFeature,
  UserLimits,
  UserCapability,
  
  // Search and filtering
  SearchFilters,
  SearchResult,
  
  // API responses
  ApiResponse,
  ErrorResponse,
  
  // Admin and Analytics
  PlatformMetrics,
  HealthStatus,
  MetricCardData,
  ChartData,
  DashboardChartData,
  SystemAlert,
  ContentFlag,
  FlaggedListing,
  ModerationDecision,
  ModerationStats,
  ModerationWorkflow,
  ModerationNotes,
  ModerationQueue,
  DateRange,
  AnalyticsMetrics,
  UserMetrics,
  ListingMetrics,
  EngagementMetrics,
  GeographicMetrics,
  TrendData,
  TimeSeriesData,
  RegionData,
  CategoryData,
  PriceRangeData,
  SearchTermData,
  StateData,
  CityData,
  GeoDistributionData,
  
  // Platform Settings
  PlatformSettings,
  GeneralSettings,
  FeatureFlags,
  ContentPolicies,
  ListingConfiguration,
  ListingCategory,
  ListingSubcategory,
  PricingTier,
  NotificationSettings,
  NotificationTemplate,
  
  // Support
  SupportTicket,
  TicketResponse,
  TicketAttachment,
  
  // Audit
  AuditLog,
  AuthSession,
  LoginAttempt,
  AuditLogStats,
  
  // Settings and Configuration
  SettingsUpdateRequest,
  SettingsAuditLog,
  
  // Support System
  TicketFilters,
  SupportStats,
  
  // Announcements
  PlatformAnnouncement,
  AnnouncementChannel,
  AnnouncementStats,
  
  // Financial Management
  Transaction,
  BillingAccount,
  FinanceCalculation,
  PaymentScheduleItem,
  DisputeCase,
  DisputeEvidence,
  FinancialSummary,
  DisputedTransaction,
  PaymentProcessor,
  RefundRequest,
  PayoutSchedule,
  FinancialReport,
  ExportOptions
} from './common';

// Re-export enums (these need to be available at runtime)
export {
  UserRole,
  UserStatus,
  AdminPermission
} from './common';