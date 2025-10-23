/**
 * @fileoverview Billing API service for user billing operations
 * 
 * Provides methods for:
 * - Billing account management
 * - Subscription operations
 * - Payment method management
 * - Transaction history
 * 
 * @author HarborList Development Team
 */

import { BillingAccount, Transaction, PaymentMethod } from '@harborlist/shared-types';

class BillingApiService {
  private baseUrl = '/api/billing';

  /**
   * Makes authenticated API request
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Billing Account Operations
  async getBillingAccount(userId: string): Promise<{ billingAccount: BillingAccount }> {
    return this.request(`/accounts/${userId}`);
  }

  async createBillingAccount(billingData: {
    plan: string;
    billingCycle: 'monthly' | 'yearly';
    paymentMethod: any;
    billingAddress: any;
  }): Promise<{ billingId: string; message: string }> {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(billingData),
    });
  }

  async updateBillingAccount(billingId: string, updates: Partial<BillingAccount>): Promise<{ message: string }> {
    return this.request(`/accounts/${billingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async cancelBillingAccount(billingId: string): Promise<{ message: string }> {
    return this.request(`/accounts/${billingId}`, {
      method: 'DELETE',
    });
  }

  // Subscription Operations
  async createSubscription(subscriptionData: {
    plan: string;
    billingCycle: 'monthly' | 'yearly';
  }): Promise<{ subscriptionId: string; message: string }> {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  }

  async updateSubscription(subscriptionId: string, updates: {
    plan?: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<{ message: string }> {
    return this.request(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<{ message: string }> {
    return this.request(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  // Payment Method Operations
  async getPaymentMethods(): Promise<{ paymentMethods: PaymentMethod[] }> {
    return this.request('/payment-methods');
  }

  async createPaymentMethod(paymentMethodData: {
    type: 'card';
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
      name: string;
    };
    billing_details: any;
  }): Promise<{ paymentMethodId: string; message: string }> {
    return this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(paymentMethodData),
    });
  }

  async updatePaymentMethod(paymentMethodId: string, updates: {
    billingDetails?: any;
    setAsDefault?: boolean;
  }): Promise<{ message: string }> {
    return this.request(`/payment-methods/${paymentMethodId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
    return this.request(`/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
  }

  // Transaction Operations
  async getTransactionHistory(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request(`/transactions${query}`);
  }

  async processPayment(paymentData: {
    amount: number;
    currency: string;
    type: 'payment' | 'commission' | 'membership';
    description: string;
    listingId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ transactionId: string; status: string; message: string }> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Health Check
  async getHealthStatus(): Promise<{
    healthStatus: Record<string, any>;
    availableProcessors: string[];
    primaryProcessor: string;
  }> {
    return this.request('/health-check');
  }
}

export const billingApi = new BillingApiService();