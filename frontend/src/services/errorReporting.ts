import { config } from '../config/env';

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
    additionalData?: Record<string, any>;
  };
  fingerprint: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  errorsByComponent: Record<string, number>;
  errorsByAction: Record<string, number>;
}

class ErrorReportingService {
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 100;
  private flushInterval = 30000; // 30 seconds
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.setupEventListeners();
    this.startPeriodicFlush();
  }

  private setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrors();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        component: 'Global',
        action: 'UnhandledError',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(event.reason), {
        component: 'Global',
        action: 'UnhandledPromiseRejection'
      });
    });
  }

  private startPeriodicFlush() {
    setInterval(() => {
      if (this.errorQueue.length > 0) {
        this.flushErrors();
      }
    }, this.flushInterval);
  }

  private generateFingerprint(error: Error, context: Partial<ErrorReport['context']>): string {
    const message = error.message || 'Unknown error';
    const component = context.component || 'Unknown';
    const action = context.action || 'Unknown';
    
    // Create a simple hash-like fingerprint
    const combined = `${message}-${component}-${action}`;
    return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private createErrorReport(
    error: Error, 
    level: ErrorReport['level'] = 'error',
    context: Partial<ErrorReport['context']> = {}
  ): ErrorReport {
    const timestamp = new Date().toISOString();
    const id = `error-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullContext: ErrorReport['context'] = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      ...context
    };

    return {
      id,
      timestamp,
      level,
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: fullContext,
      fingerprint: this.generateFingerprint(error, context)
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      const adminToken = localStorage.getItem('adminAuthToken');
      if (adminToken) {
        const payload = JSON.parse(atob(adminToken.split('.')[1]));
        return payload.userId;
      }
    } catch (e) {
      // Ignore errors when parsing token
    }
    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('errorReportingSessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorReportingSessionId', sessionId);
    }
    return sessionId;
  }

  public reportError(
    error: Error, 
    context: Partial<ErrorReport['context']> = {},
    level: ErrorReport['level'] = 'error'
  ): void {
    const errorReport = this.createErrorReport(error, level, context);
    
    // Add to queue
    this.errorQueue.push(errorReport);
    
    // Prevent queue from growing too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Try to flush immediately for critical errors
    if (level === 'error' && this.isOnline) {
      this.flushErrors();
    }

    // Log to console in development
    if (config.isDevelopment) {
      console.error('Error reported:', errorReport);
    }
  }

  public reportWarning(
    message: string,
    context: Partial<ErrorReport['context']> = {}
  ): void {
    this.reportError(new Error(message), context, 'warning');
  }

  public reportInfo(
    message: string,
    context: Partial<ErrorReport['context']> = {}
  ): void {
    this.reportError(new Error(message), context, 'info');
  }

  private async flushErrors(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) {
      return;
    }

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await this.sendErrorsWithRetry(errorsToSend);
    } catch (error) {
      // If sending fails, put errors back in queue
      this.errorQueue = [...errorsToSend, ...this.errorQueue];
      
      // Prevent queue from growing too large
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
      }
    }
  }

  private async sendErrorsWithRetry(errors: ErrorReport[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.sendErrors(errors);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryAttempts) {
          // Wait before retrying with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async sendErrors(errors: ErrorReport[]): Promise<void> {
    const token = localStorage.getItem('adminAuthToken');
    
    const response = await fetch(`${config.apiUrl}/admin/error-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({ errors })
    });

    if (!response.ok) {
      throw new Error(`Failed to send error reports: ${response.status} ${response.statusText}`);
    }
  }

  public async getErrorMetrics(
    startDate: string,
    endDate: string
  ): Promise<ErrorMetrics> {
    const token = localStorage.getItem('adminAuthToken');
    
    const response = await fetch(
      `${config.apiUrl}/admin/error-reports/metrics?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch error metrics: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  public async getErrorReports(
    filters: {
      startDate?: string;
      endDate?: string;
      level?: ErrorReport['level'];
      component?: string;
      fingerprint?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: ErrorReport[]; total: number }> {
    const token = localStorage.getItem('adminAuthToken');
    const query = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    );

    const response = await fetch(
      `${config.apiUrl}/admin/error-reports?${query}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch error reports: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  public clearQueue(): void {
    this.errorQueue = [];
  }

  public getQueueSize(): number {
    return this.errorQueue.length;
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService();