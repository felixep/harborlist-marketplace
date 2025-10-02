import { config } from '../config/env';
import { errorReporting } from './errorReporting';

export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  skipErrorReporting?: boolean;
  context?: {
    component?: string;
    action?: string;
    additionalData?: Record<string, any>;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public response?: Response;
  public data?: any;

  constructor(
    message: string,
    status: number,
    statusText: string,
    response?: Response,
    data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 3;
  private defaultRetryDelay = 1000; // 1 second

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('adminAuthToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    if (!error.status || error.status >= 500) {
      return true;
    }

    // Retry on specific 4xx errors that might be transient
    if (error.status === 408 || error.status === 429) {
      return true;
    }

    return false;
  }

  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      timeout = this.defaultTimeout,
      skipErrorReporting = false,
      context = {},
      ...fetchOptions
    } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers: {
        ...this.getAuthHeaders(),
        ...fetchOptions.headers
      }
    };

    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, requestOptions, timeout);
        
        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: response.statusText };
          }

          const apiError = new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText,
            response,
            errorData
          );

          if (this.shouldRetry(apiError, attempt, retries)) {
            lastError = apiError;
            const delay = this.calculateRetryDelay(attempt, retryDelay);
            await this.delay(delay);
            continue;
          }

          throw apiError;
        }

        const data = await response.json();
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        };

      } catch (error) {
        const apiError = error instanceof ApiError 
          ? error 
          : new ApiError(
              error instanceof Error ? error.message : 'Network error',
              0,
              'Network Error'
            );

        if (this.shouldRetry(apiError, attempt, retries)) {
          lastError = apiError;
          const delay = this.calculateRetryDelay(attempt, retryDelay);
          await this.delay(delay);
          continue;
        }

        // Report error if not skipped
        if (!skipErrorReporting) {
          errorReporting.reportError(apiError, {
            component: context.component || 'ApiClient',
            action: context.action || 'Request',
            additionalData: {
              url,
              method: requestOptions.method || 'GET',
              attempt,
              ...context.additionalData
            }
          });
        }

        throw apiError;
      }
    }

    // This should never be reached, but just in case
    throw lastError || new ApiError('Unknown error', 0, 'Unknown Error');
  }

  // Convenience methods
  public async get<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public async delete<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new ApiClient(config.apiUrl);