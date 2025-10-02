import { endpoints } from '../config/env';

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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
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

  async register(name: string, email: string, password: string) {
    return this.request(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
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
}

export const api = new ApiService();
