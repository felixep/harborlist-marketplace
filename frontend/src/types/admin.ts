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

// Content Moderation Types
export interface ContentFlag {
  id: string;
  type: 'inappropriate' | 'spam' | 'fraud' | 'duplicate' | 'other';
  reason: string;
  reportedBy: string;
  reportedAt: string;
  severity: 'low' | 'medium' | 'high';
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
  notes?: string;
  notifyUser: boolean;
}

export interface ModerationStats {
  totalFlagged: number;
  pendingReview: number;
  approvedToday: number;
  rejectedToday: number;
  averageReviewTime: number;
}

// Analytics Types
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

export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange: DateRange;
  metrics: string[];
  includeCharts: boolean;
}

// Platform Settings Types
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

// Financial Management Types
export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'commission' | 'payout';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'disputed';
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
  type: 'revenue' | 'commission' | 'payout' | 'dispute';
  title: string;
  description: string;
  dateRange: DateRange;
  generatedAt: string;
  generatedBy: string;
  format: 'csv' | 'pdf' | 'excel';
  downloadUrl?: string;
  status: 'generating' | 'completed' | 'failed';
}

// Support and Communication Types
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

export interface TicketFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedTo?: string[];
  dateRange?: DateRange;
  search?: string;
  tags?: string[];
}

export interface TicketAssignment {
  ticketId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
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

export interface SupportTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AdminLoginResponse {
  user: AdminUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  data?: {
    user: AdminUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

// Audit Log Types
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

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogExportRequest {
  format: 'csv' | 'json';
  startDate: string;
  endDate: string;
  userId?: string;
  action?: string;
  resource?: string;
}

export interface AuditLogExportResponse {
  data: string;
  filename: string;
  recordCount: number;
}