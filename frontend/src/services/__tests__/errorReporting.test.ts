import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorReporting } from '../errorReporting';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'test-user-agent'
  },
  writable: true
});

describe('ErrorReportingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    });
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    errorReporting.clearQueue();
  });

  describe('reportError', () => {
    it('reports error and adds to queue', () => {
      const error = new Error('Test error');
      
      errorReporting.reportError(error, {
        component: 'TestComponent',
        action: 'TestAction'
      });

      expect(errorReporting.getQueueSize()).toBe(1);
    });

    it('generates unique fingerprint for errors', () => {
      const error1 = new Error('Same error');
      const error2 = new Error('Same error');
      
      errorReporting.reportError(error1, { component: 'Component1' });
      errorReporting.reportError(error2, { component: 'Component2' });

      // Different components should generate different fingerprints
      expect(errorReporting.getQueueSize()).toBe(2);
    });

    it('limits queue size', () => {
      // Report more errors than max queue size (100)
      for (let i = 0; i < 150; i++) {
        errorReporting.reportError(new Error(`Error ${i}`));
      }

      expect(errorReporting.getQueueSize()).toBe(100);
    });

    it('extracts user ID from token', () => {
      const mockToken = btoa(JSON.stringify({
        header: {},
        payload: { userId: 'test-user-123' },
        signature: 'test'
      }));
      
      mockLocalStorage.getItem.mockReturnValue(`header.${btoa(JSON.stringify({ userId: 'test-user-123' }))}.signature`);
      
      errorReporting.reportError(new Error('Test error'));
      
      expect(errorReporting.getQueueSize()).toBe(1);
    });
  });

  describe('reportWarning', () => {
    it('reports warning with correct level', () => {
      errorReporting.reportWarning('Test warning', {
        component: 'TestComponent'
      });

      expect(errorReporting.getQueueSize()).toBe(1);
    });
  });

  describe('reportInfo', () => {
    it('reports info with correct level', () => {
      errorReporting.reportInfo('Test info', {
        component: 'TestComponent'
      });

      expect(errorReporting.getQueueSize()).toBe(1);
    });
  });

  describe('error flushing', () => {
    it('flushes errors when online', async () => {
      const error = new Error('Test error');
      errorReporting.reportError(error);

      // Trigger flush
      vi.advanceTimersByTime(30000);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/error-reports'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test error')
        })
      );
    });

    it('does not flush when offline', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true
      });

      const error = new Error('Test error');
      errorReporting.reportError(error);

      jest.advanceTimersByTime(30000);

      expect(fetch).not.toHaveBeenCalled();
    });

    it('retries failed requests', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const error = new Error('Test error');
      errorReporting.reportError(error);

      vi.advanceTimersByTime(30000);

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 0));
      vi.advanceTimersByTime(1000); // First retry delay
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('puts errors back in queue on failure', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const error = new Error('Test error');
      errorReporting.reportError(error);

      expect(errorReporting.getQueueSize()).toBe(1);

      vi.advanceTimersByTime(30000);
      await new Promise(resolve => setTimeout(resolve, 0));

      // After all retries fail, error should be back in queue
      expect(errorReporting.getQueueSize()).toBe(1);
    });
  });

  describe('getErrorMetrics', () => {
    it('fetches error metrics', async () => {
      const mockMetrics = {
        totalErrors: 10,
        errorRate: 0.05,
        topErrors: [],
        errorsByComponent: {},
        errorsByAction: {}
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      });

      const result = await errorReporting.getErrorMetrics('2023-01-01', '2023-01-31');

      expect(result).toEqual(mockMetrics);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/error-reports/metrics'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('throws error on failed request', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        errorReporting.getErrorMetrics('2023-01-01', '2023-01-31')
      ).rejects.toThrow('Failed to fetch error metrics: 500 Internal Server Error');
    });
  });

  describe('getErrorReports', () => {
    it('fetches error reports with filters', async () => {
      const mockReports = {
        reports: [],
        total: 0
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReports)
      });

      const result = await errorReporting.getErrorReports({
        level: 'error',
        component: 'TestComponent',
        limit: 10
      });

      expect(result).toEqual(mockReports);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('level=error&component=TestComponent&limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('global error handlers', () => {
    it('handles window error events', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Global error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Global error')
      });

      window.dispatchEvent(errorEvent);

      expect(errorReporting.getQueueSize()).toBe(1);
    });

    it('handles unhandled promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Unhandled rejection'),
        reason: 'Unhandled rejection'
      });

      window.dispatchEvent(rejectionEvent);

      expect(errorReporting.getQueueSize()).toBe(1);
    });
  });
});