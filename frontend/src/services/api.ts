import { endpoints } from '../config/env';

export interface ApiError extends Error {
  code?: string;
  requestId?: string;
  status?: number;
}

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      
      // Create a custom error object with more information
      const error = new Error(errorData.error?.message || errorData.error || `HTTP ${response.status}`) as any;
      error.code = errorData.error?.code;
      error.requestId = errorData.error?.requestId;
      error.status = response.status;
      
      throw error;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(name: string, email: string, password: string, customerType?: string) {
    return this.request(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        customerType: customerType || 'individual'
      })
    });
  }

  async verifyEmail(token: string) {
    return this.request(endpoints.auth.verifyEmail, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async resendVerification(email: string) {
    return this.request(endpoints.auth.resendVerification, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Listings
  async getListings() {
    return this.request(endpoints.listings);
  }

  async getListing(id: string) {
    return this.request(`${endpoints.listings}/${id}`);
  }

  async createListing(listing: any) {
    return this.request(endpoints.listings, {
      method: 'POST',
      body: JSON.stringify(listing)
    });
  }

  async updateListing(id: string, listing: any) {
    return this.request(`${endpoints.listings}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(listing)
    });
  }

  async deleteListing(id: string) {
    return this.request(`${endpoints.listings}/${id}`, {
      method: 'DELETE'
    });
  }

  // Search
  async searchListings(params: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`${endpoints.search}?${query}`);
  }

  // Email
  async sendEmail(data: any) {
    return this.request(endpoints.email, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Billing
  async createBillingAccount(billingData: any) {
    return this.request('/api/billing/accounts', {
      method: 'POST',
      body: JSON.stringify(billingData)
    });
  }

  async getBillingAccount(userId: string) {
    return this.request(`/api/billing/accounts/${userId}`);
  }

  async createSubscription(subscriptionData: any) {
    return this.request('/api/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData)
    });
  }

  async processPayment(paymentData: any) {
    return this.request('/api/billing/transactions', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // User Management
  async updateUserType(userId: string, userType: string, capabilities?: any[]) {
    return this.request(`/api/users/${userId}/type`, {
      method: 'PUT',
      body: JSON.stringify({ userType, capabilities })
    });
  }

  async getUserTiers() {
    return this.request('/api/users/tiers');
  }
}

export const api = new ApiService();
