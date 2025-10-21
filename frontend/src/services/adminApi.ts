import { config } from '../config/env';
import { AdminUser, AdminPermission, UserRole } from '@harborlist/shared-types';
import { apiClient, ApiRequestOptions } from './apiClient';

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminLoginResponse {
  token: string;
  user: AdminUser;
  expiresAt: string;
}

interface AdminValidateResponse {
  user: AdminUser;
  valid: boolean;
}

interface VerifyUserEmailResponse {
  success: boolean;
  message: string;
  alreadyVerified?: boolean;
  cognitoUpdated: boolean;
  cognitoError?: string;
  user: any; // Full DynamoDB user record
  metadata?: {
    verifiedBy: string;
    verifiedAt: string;
    dynamoDbUpdated: boolean;
    cognitoUpdated: boolean;
  };
}

class AdminApiService {
  private async request<T>(
    endpoint: string, 
    options: ApiRequestOptions = {},
    context: { component?: string; action?: string } = {}
  ): Promise<T> {
    const response = await apiClient.request<T>(endpoint, {
      ...options,
      context: {
        component: context.component || 'AdminApi',
        action: context.action || 'Request',
        ...options.context
      }
    });
    return response.data;
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<AdminLoginResponse> {
    return this.request<AdminLoginResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, { component: 'AdminAuth', action: 'Login' });
  }

  // Staff authentication endpoints for Cognito Staff User Pool
  async staffLogin(email: string, password: string): Promise<any> {
    return this.request('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, { component: 'StaffAuth', action: 'Login' });
  }

  async staffRefreshToken(refreshToken: string): Promise<any> {
    return this.request('/auth/staff/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }, { component: 'StaffAuth', action: 'RefreshToken' });
  }

  async validateStaffToken(token: string): Promise<any> {
    return this.request('/auth/staff/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, { component: 'StaffAuth', action: 'ValidateToken' });
  }

  async staffVerifyMFA(mfaToken: string, mfaCode: string): Promise<any> {
    return this.request('/auth/staff/verify-mfa', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, mfaCode })
    }, { component: 'StaffAuth', action: 'VerifyMFA' });
  }

  async validateToken(): Promise<AdminValidateResponse> {
    return this.request<AdminValidateResponse>('/admin/auth/verify', {
      method: 'POST'
    }, { component: 'AdminAuth', action: 'ValidateToken' });
  }

  async refreshToken(): Promise<AdminLoginResponse> {
    return this.request<AdminLoginResponse>('/auth/refresh', {
      method: 'POST'
    }, { component: 'AdminAuth', action: 'RefreshToken' });
  }

  async logout(): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST'
    }, { component: 'AdminAuth', action: 'Logout' });
  }

  // Admin dashboard endpoints
  async getDashboardMetrics(): Promise<any> {
    // Call the enhanced dashboard metrics endpoint that includes system health
    return this.request('/admin/dashboard/metrics', {}, 
      { component: 'Dashboard', action: 'GetMetrics' });
  }

  async getUsers(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/users${query}`, {}, 
      { component: 'UserManagement', action: 'GetUsers' });
  }

  async updateUserStatus(userId: string, status: string, reason: string): Promise<any> {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason })
    }, { component: 'UserManagement', action: 'UpdateUserStatus' });
  }

  async getFlaggedListings(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/listings/flagged${query}`, {}, 
      { component: 'ListingModeration', action: 'GetFlaggedListings' });
  }

  async getListingDetails(listingId: string): Promise<any> {
    return this.request(`/admin/listings/${listingId}`, {}, 
      { component: 'ListingModeration', action: 'GetListingDetails' });
  }

  async moderateListing(listingId: string, decision: any): Promise<any> {
    return this.request(`/listings/${listingId}/moderate`, {
      method: 'POST',
      body: JSON.stringify(decision)
    }, { component: 'ListingModeration', action: 'ModerateListing' });
  }

  async getModerationStats(): Promise<any> {
    return this.request('/admin/moderation/stats', {}, 
      { component: 'ListingModeration', action: 'GetModerationStats' });
  }

  async assignModerator(listingIds: string[], moderatorId: string): Promise<any> {
    return this.request('/admin/moderation/assign', {
      method: 'POST',
      body: JSON.stringify({ listingIds, moderatorId })
    }, { component: 'ListingModeration', action: 'AssignModerator' });
  }

  async getModeratorPerformance(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/moderation/performance${query}`, {}, 
      { component: 'ModerationAnalytics', action: 'GetModeratorPerformance' });
  }

  async getModerationQualityMetrics(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/moderation/quality${query}`, {}, 
      { component: 'ModerationAnalytics', action: 'GetQualityMetrics' });
  }

  async getModerationWorkload(): Promise<any> {
    return this.request('/admin/moderation/workload', {}, 
      { component: 'ModerationWorkload', action: 'GetWorkload' });
  }

  async rebalanceModerationWorkload(): Promise<any> {
    return this.request('/admin/moderation/workload/rebalance', {
      method: 'POST'
    }, { component: 'ModerationWorkload', action: 'Rebalance' });
  }

  async setAutoBalanceMode(enabled: boolean): Promise<any> {
    return this.request('/admin/moderation/workload/auto-balance', {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    }, { component: 'ModerationWorkload', action: 'SetAutoBalance' });
  }

  async getModerationHistory(listingId: string): Promise<any> {
    return this.request(`/admin/listings/${listingId}/moderation-history`, {}, 
      { component: 'ListingModeration', action: 'GetModerationHistory' });
  }

  async getSystemMetrics(): Promise<any> {
    return this.request('/admin/system/metrics', {}, 
      { component: 'SystemMonitoring', action: 'GetSystemMetrics' });
  }

  async getAnalytics(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/analytics${query}`, {}, 
      { component: 'Analytics', action: 'GetAnalytics' });
  }

  // Analytics endpoints
  async getAnalyticsMetrics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`${config.apiUrl}/admin/analytics/metrics?${query}`);
  }

  async getUserAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`/admin/analytics/users?${query}`);
  }

  async getListingAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`/admin/analytics/listings?${query}`);
  }

  async getEngagementAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`/admin/analytics/engagement?${query}`);
  }

  async getGeographicAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`/admin/analytics/geographic?${query}`);
  }

  async getAuditLogs(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/audit-logs${query}`);
  }

  // System monitoring endpoints
  async getSystemHealth(): Promise<any> {
    return this.request('/admin/system/health', {}, 
      { component: 'SystemMonitoring', action: 'GetSystemHealth' });
  }

  async getSystemMetricsDetailed(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/system/metrics${query}`, {}, 
      { component: 'SystemMonitoring', action: 'GetSystemMetrics' });
  }

  async getSystemAlerts(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/system/alerts${query}`, {}, 
      { component: 'SystemMonitoring', action: 'GetSystemAlerts' });
  }

  async acknowledgeAlert(alertId: string): Promise<any> {
    return this.request(`/admin/system/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    }, { component: 'SystemMonitoring', action: 'AcknowledgeAlert' });
  }

  async resolveAlert(alertId: string): Promise<any> {
    return this.request(`/admin/system/alerts/${alertId}/resolve`, {
      method: 'POST'
    }, { component: 'SystemMonitoring', action: 'ResolveAlert' });
  }

  async getSystemErrors(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/system/errors${query}`, {}, 
      { component: 'SystemMonitoring', action: 'GetSystemErrors' });
  }

  async resolveError(errorId: string): Promise<any> {
    return this.request(`/admin/system/errors/${errorId}/resolve`, {
      method: 'POST'
    }, { component: 'SystemMonitoring', action: 'ResolveError' });
  }

  // Platform Settings endpoints
  async getPlatformSettings(): Promise<any> {
    return this.request(`/admin/settings`);
  }

  async updatePlatformSettings(section: string, data: any, reason: string): Promise<any> {
    return this.request(`/admin/settings/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ data, reason })
    });
  }

  async getSettingsAuditLog(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/settings/audit-log${query}`);
  }

  async validateSettings(section: string, data: any): Promise<any> {
    return this.request(`/admin/settings/${section}/validate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resetSettings(section: string, reason: string): Promise<any> {
    return this.request(`/admin/settings/${section}/reset`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Support and Communication endpoints
  async getSupportTickets(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/support/tickets${query}`);
  }

  async getSupportStats(): Promise<any> {
    return this.request(`/admin/support/stats`);
  }

  async getTicketDetails(ticketId: string): Promise<any> {
    return this.request(`/admin/support/tickets/${ticketId}`);
  }

  async updateTicket(ticketId: string, updates: any): Promise<any> {
    return this.request(`/admin/support/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async assignTicket(ticketId: string, assignedTo: string): Promise<any> {
    return this.request(`/admin/support/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedTo })
    });
  }

  async addTicketResponse(ticketId: string, message: string, isInternal: boolean = false): Promise<any> {
    return this.request(`/admin/support/tickets/${ticketId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal })
    });
  }

  async escalateTicket(ticketId: string, reason: string): Promise<any> {
    return this.request(`/admin/support/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAnnouncements(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/support/announcements${query}`);
  }

  async getAnnouncementStats(): Promise<any> {
    return this.request(`/admin/support/announcements/stats`);
  }

  async createAnnouncement(announcement: any): Promise<any> {
    return this.request(`/admin/support/announcements`, {
      method: 'POST',
      body: JSON.stringify(announcement)
    });
  }

  async updateAnnouncement(announcementId: string, updates: any): Promise<any> {
    return this.request(`/admin/support/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async publishAnnouncement(announcementId: string): Promise<any> {
    return this.request(`/admin/support/announcements/${announcementId}/publish`, {
      method: 'POST'
    });
  }

  async archiveAnnouncement(announcementId: string): Promise<any> {
    return this.request(`/admin/support/announcements/${announcementId}/archive`, {
      method: 'POST'
    });
  }

  async getSupportTemplates(): Promise<any> {
    return this.request(`/admin/support/templates`);
  }

  async createSupportTemplate(template: any): Promise<any> {
    return this.request(`/admin/support/templates`, {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  // User Tier Management endpoints
  async getUserTiers(): Promise<any> {
    return this.request('/admin/user-tiers', {}, 
      { component: 'UserManagement', action: 'GetUserTiers' });
  }

  async createUserTier(tierData: any): Promise<any> {
    return this.request('/admin/user-tiers', {
      method: 'POST',
      body: JSON.stringify(tierData)
    }, { component: 'UserManagement', action: 'CreateUserTier' });
  }

  async updateUserTier(tierId: string, tierData: any): Promise<any> {
    return this.request(`/admin/user-tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(tierData)
    }, { component: 'UserManagement', action: 'UpdateUserTier' });
  }

  async deleteUserTier(tierId: string): Promise<any> {
    return this.request(`/admin/user-tiers/${tierId}`, {
      method: 'DELETE'
    }, { component: 'UserManagement', action: 'DeleteUserTier' });
  }

  async assignUserTier(userId: string, tierId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/tier`, {
      method: 'POST',
      body: JSON.stringify({ tierId })
    }, { component: 'UserManagement', action: 'AssignUserTier' });
  }

  async updateUserType(userId: string, userType: string): Promise<any> {
    return this.request(`/admin/users/${userId}/user-type`, {
      method: 'PUT',
      body: JSON.stringify({ userType })
    }, { component: 'UserManagement', action: 'UpdateUserType' });
  }

  async updateUserCapabilities(userId: string, capability: string, enabled: boolean, expiresAt?: number): Promise<any> {
    return this.request(`/admin/users/${userId}/capabilities`, {
      method: 'POST',
      body: JSON.stringify({ capability, enabled, expiresAt })
    }, { component: 'UserManagement', action: 'UpdateUserCapabilities' });
  }

  async verifyUserEmail(userId: string): Promise<VerifyUserEmailResponse> {
    return this.request(`/admin/users/${userId}/verify-email`, {
      method: 'POST'
    }, { component: 'UserManagement', action: 'VerifyUserEmail' });
  }

  async bulkUserAction(action: string, userIds: string[], data?: any): Promise<any> {
    return this.request(`/admin/users/bulk/${action}`, {
      method: 'POST',
      body: JSON.stringify({ userIds, ...data })
    }, { component: 'UserManagement', action: 'BulkUserAction' });
  }

  // User Group Management endpoints
  async getUserGroups(): Promise<any> {
    return this.request('/admin/user-groups', {}, 
      { component: 'UserManagement', action: 'GetUserGroups' });
  }

  async createUserGroup(groupData: any): Promise<any> {
    return this.request('/admin/user-groups', {
      method: 'POST',
      body: JSON.stringify(groupData)
    }, { component: 'UserManagement', action: 'CreateUserGroup' });
  }

  async updateUserGroup(groupId: string, groupData: any): Promise<any> {
    return this.request(`/admin/user-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData)
    }, { component: 'UserManagement', action: 'UpdateUserGroup' });
  }

  async deleteUserGroup(groupId: string): Promise<any> {
    return this.request(`/admin/user-groups/${groupId}`, {
      method: 'DELETE'
    }, { component: 'UserManagement', action: 'DeleteUserGroup' });
  }

  async addUserToGroup(userId: string, groupId: string): Promise<any> {
    return this.request(`/admin/user-groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }, { component: 'UserManagement', action: 'AddUserToGroup' });
  }

  async removeUserFromGroup(userId: string, groupId: string): Promise<any> {
    return this.request(`/admin/user-groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    }, { component: 'UserManagement', action: 'RemoveUserFromGroup' });
  }

  // Billing Management endpoints
  async getBillingAccounts(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/billing/accounts${query}`, {}, 
      { component: 'BillingManagement', action: 'GetBillingAccounts' });
  }

  async getBillingAccount(userId: string): Promise<any> {
    return this.request(`/admin/billing/accounts/${userId}`, {}, 
      { component: 'BillingManagement', action: 'GetBillingAccount' });
  }

  async updateBillingAccount(userId: string, accountData: any): Promise<any> {
    return this.request(`/admin/billing/accounts/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData)
    }, { component: 'BillingManagement', action: 'UpdateBillingAccount' });
  }

  async getTransactions(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/billing/transactions${query}`, {}, 
      { component: 'BillingManagement', action: 'GetTransactions' });
  }

  async getTransaction(transactionId: string): Promise<any> {
    return this.request(`/admin/billing/transactions/${transactionId}`, {}, 
      { component: 'BillingManagement', action: 'GetTransaction' });
  }

  async processRefund(transactionId: string, amount: number, reason: string): Promise<any> {
    return this.request(`/admin/billing/transactions/${transactionId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    }, { component: 'BillingManagement', action: 'ProcessRefund' });
  }

  async getFinancialReports(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/billing/reports${query}`, {}, 
      { component: 'BillingManagement', action: 'GetFinancialReports' });
  }

  async generateFinancialReport(reportData: any): Promise<any> {
    return this.request('/admin/billing/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }, { component: 'BillingManagement', action: 'GenerateFinancialReport' });
  }

  async getFinancialSummary(dateRange?: any): Promise<any> {
    const query = dateRange ? `?${new URLSearchParams(dateRange).toString()}` : '';
    return this.request(`/admin/billing/summary${query}`, {}, 
      { component: 'BillingManagement', action: 'GetFinancialSummary' });
  }

  async getDisputedTransactions(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/billing/disputes${query}`, {}, 
      { component: 'BillingManagement', action: 'GetDisputedTransactions' });
  }

  async updateDisputeStatus(disputeId: string, status: string, notes?: string): Promise<any> {
    return this.request(`/admin/billing/disputes/${disputeId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    }, { component: 'BillingManagement', action: 'UpdateDisputeStatus' });
  }

  // Sales Role Management endpoints
  async getSalesUsers(): Promise<any> {
    return this.request('/admin/sales/users', {}, 
      { component: 'SalesManagement', action: 'GetSalesUsers' });
  }

  async createSalesUser(salesUserData: any): Promise<any> {
    return this.request('/admin/sales/users', {
      method: 'POST',
      body: JSON.stringify(salesUserData)
    }, { component: 'SalesManagement', action: 'CreateSalesUser' });
  }

  async updateSalesUser(userId: string, salesUserData: any): Promise<any> {
    return this.request(`/admin/sales/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(salesUserData)
    }, { component: 'SalesManagement', action: 'UpdateSalesUser' });
  }

  async assignCustomerToSales(customerId: string, salesUserId: string): Promise<any> {
    return this.request(`/admin/sales/assignments`, {
      method: 'POST',
      body: JSON.stringify({ customerId, salesUserId })
    }, { component: 'SalesManagement', action: 'AssignCustomerToSales' });
  }

  async getSalesPerformance(userId: string, dateRange?: any): Promise<any> {
    const query = dateRange ? `?${new URLSearchParams(dateRange).toString()}` : '';
    return this.request(`/admin/sales/performance/${userId}${query}`, {}, 
      { component: 'SalesManagement', action: 'GetSalesPerformance' });
  }

  async updateSalesTargets(userId: string, targets: any): Promise<any> {
    return this.request(`/admin/sales/targets/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(targets)
    }, { component: 'SalesManagement', action: 'UpdateSalesTargets' });
  }

  async getSalesReports(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/sales/reports${query}`, {}, 
      { component: 'SalesManagement', action: 'GetSalesReports' });
  }

  // Generic request method for external use
  async get<T>(url: string, options?: ApiRequestOptions): Promise<{ data: T }> {
    const endpoint = url.startsWith('/admin') ? url : `/admin${url}`;
    const data = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return { data };
  }

  async post<T>(url: string, data?: any, options?: ApiRequestOptions): Promise<{ data: T }> {
    const endpoint = url.startsWith('/admin') ? url : `/admin${url}`;
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
    return { data: result };
  }

  async put<T>(url: string, data?: any, options?: ApiRequestOptions): Promise<{ data: T }> {
    const endpoint = url.startsWith('/admin') ? url : `/admin${url}`;
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
    return { data: result };
  }

  async delete<T>(url: string, options?: ApiRequestOptions): Promise<{ data: T }> {
    const endpoint = url.startsWith('/admin') ? url : `/admin${url}`;
    const result = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return { data: result };
  }
}

export const adminApi = new AdminApiService();