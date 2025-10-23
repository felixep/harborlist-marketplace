/**
 * @fileoverview Finance API service for loan calculations
 * 
 * Provides methods for:
 * - Loan payment calculations
 * - Payment schedule generation
 * - Scenario comparisons
 * - Calculation management
 * 
 * @author HarborList Development Team
 */

import { FinanceCalculation, PaymentScheduleItem } from '@harborlist/shared-types';

interface CalculationParams {
  boatPrice: number;
  downPayment: number;
  interestRate: number;
  termMonths: number;
  includeSchedule?: boolean;
}

interface LoanScenario {
  scenarioId: string;
  name: string;
  params: CalculationParams;
  result: FinanceCalculation;
}

class FinanceApiService {
  private baseUrl = '/api/finance';

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

  // Calculation Operations
  async calculateLoanPayment(params: CalculationParams & { listingId?: string }): Promise<{
    calculation: FinanceCalculation;
    message: string;
  }> {
    return this.request('/calculate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async calculateScenarios(data: {
    baseParams: CalculationParams;
    scenarios: Partial<CalculationParams>[];
    listingId?: string;
  }): Promise<{
    scenarios: LoanScenario[];
    baseParams: CalculationParams;
    message: string;
  }> {
    return this.request('/calculate/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSuggestedRates(loanAmount: number, termMonths: number): Promise<{
    suggestedRates: number[];
    loanAmount: number;
    termMonths: number;
    message: string;
  }> {
    const params = new URLSearchParams({
      loanAmount: loanAmount.toString(),
      termMonths: termMonths.toString(),
    });
    return this.request(`/rates/suggested?${params}`);
  }

  // Saved Calculations (requires authentication)
  async saveCalculation(params: CalculationParams & {
    listingId?: string;
    calculationNotes?: string;
    lenderInfo?: {
      name?: string;
      rate?: number;
      terms?: string;
    };
  }): Promise<{
    calculationId: string;
    calculation: FinanceCalculation;
    message: string;
  }> {
    return this.request('/calculate/save', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getUserCalculations(userId: string, params?: {
    limit?: number;
    listingId?: string;
  }): Promise<{
    calculations: FinanceCalculation[];
    total: number;
    userId: string;
    message: string;
  }> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request(`/calculations/${userId}${query}`);
  }

  async deleteCalculation(calculationId: string): Promise<{
    calculationId: string;
    message: string;
  }> {
    return this.request(`/calculations/${calculationId}`, {
      method: 'DELETE',
    });
  }

  // Sharing Operations
  async shareCalculation(calculationId: string): Promise<{
    shareToken: string;
    shareUrl: string;
    calculationId: string;
    message: string;
  }> {
    return this.request(`/share/${calculationId}`, {
      method: 'POST',
    });
  }

  async getSharedCalculation(shareToken: string): Promise<{
    calculation: FinanceCalculation;
    shared: boolean;
    message: string;
  }> {
    return this.request(`/calculations/shared/${shareToken}`);
  }
}

export const financeApi = new FinanceApiService();