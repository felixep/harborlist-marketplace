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
    return this.request(`/admin/listings/${listingId}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(decision)
    }, { component: 'ListingModeration', action: 'ModerateListing' });
  }

  async getModerationStats(): Promise<any> {
    return this.request('/admin/moderation/stats', {}, 
      { component: 'ListingModeration', action: 'GetModerationStats' });
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
    return this.request(`${config.apiUrl}/admin/analytics/users?${query}`);
  }

  async getListingAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`${config.apiUrl}/admin/analytics/listings?${query}`);
  }

  async getEngagementAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`${config.apiUrl}/admin/analytics/engagement?${query}`);
  }

  async getGeographicAnalytics(dateRange: { startDate: string; endDate: string }): Promise<any> {
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).toString();
    return this.request(`${config.apiUrl}/admin/analytics/geographic?${query}`);
  }

  async getAuditLogs(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/audit-logs${query}`);
  }

  // System monitoring endpoints
  async getSystemHealth(): Promise<any> {
    return this.request(`${config.apiUrl}/admin/system/health`);
  }

  async getSystemMetricsDetailed(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/system/metrics${query}`);
  }

  async getSystemAlerts(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/system/alerts${query}`);
  }

  async acknowledgeAlert(alertId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/system/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    });
  }

  async resolveAlert(alertId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/system/alerts/${alertId}/resolve`, {
      method: 'POST'
    });
  }

  async getSystemErrors(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/system/errors${query}`);
  }

  async resolveError(errorId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/system/errors/${errorId}/resolve`, {
      method: 'POST'
    });
  }

  // Platform Settings endpoints
  async getPlatformSettings(): Promise<any> {
    return this.request(`${config.apiUrl}/admin/settings`);
  }

  async updatePlatformSettings(section: string, data: any, reason: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/settings/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ data, reason })
    });
  }

  async getSettingsAuditLog(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/settings/audit-log${query}`);
  }

  async validateSettings(section: string, data: any): Promise<any> {
    return this.request(`${config.apiUrl}/admin/settings/${section}/validate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resetSettings(section: string, reason: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/settings/${section}/reset`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Support and Communication endpoints
  async getSupportTickets(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/support/tickets${query}`);
  }

  async getSupportStats(): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/stats`);
  }

  async getTicketDetails(ticketId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/tickets/${ticketId}`);
  }

  async updateTicket(ticketId: string, updates: any): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async assignTicket(ticketId: string, assignedTo: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedTo })
    });
  }

  async addTicketResponse(ticketId: string, message: string, isInternal: boolean = false): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/tickets/${ticketId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal })
    });
  }

  async escalateTicket(ticketId: string, reason: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAnnouncements(params?: any): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`${config.apiUrl}/admin/support/announcements${query}`);
  }

  async getAnnouncementStats(): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/announcements/stats`);
  }

  async createAnnouncement(announcement: any): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/announcements`, {
      method: 'POST',
      body: JSON.stringify(announcement)
    });
  }

  async updateAnnouncement(announcementId: string, updates: any): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async publishAnnouncement(announcementId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/announcements/${announcementId}/publish`, {
      method: 'POST'
    });
  }

  async archiveAnnouncement(announcementId: string): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/announcements/${announcementId}/archive`, {
      method: 'POST'
    });
  }

  async getSupportTemplates(): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/templates`);
  }

  async createSupportTemplate(template: any): Promise<any> {
    return this.request(`${config.apiUrl}/admin/support/templates`, {
      method: 'POST',
      body: JSON.stringify(template)
    });
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
}

export const adminApi = new AdminApiService();