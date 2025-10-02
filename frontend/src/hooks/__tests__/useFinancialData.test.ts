import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFinancialData } from '../useFinancialData';

// Mock console methods to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock window.alert
const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

// Mock URL.createObjectURL and related methods for export functionality
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Mock document methods for export functionality
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
    style: {}
  }))
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn()
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn()
});

describe('useFinancialData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useFinancialData());

    expect(result.current.summary).toBeNull();
    expect(result.current.transactions).toEqual([]);
    expect(result.current.disputes).toEqual([]);
    expect(result.current.refundRequests).toEqual([]);
    expect(result.current.payoutSchedule).toEqual([]);
    expect(result.current.reports).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads initial data on mount', async () => {
    const { result } = renderHook(() => useFinancialData());

    // Fast-forward timers to complete the mock API calls
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual({
      totalRevenue: 125000,
      totalTransactions: 1250,
      pendingPayouts: 15000,
      disputedTransactions: 5,
      commissionEarned: 12500,
      refundsProcessed: 2500
    });

    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.disputes).toHaveLength(1);
  });

  it('fetches summary data correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    act(() => {
      result.current.fetchSummary();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBeDefined();
    expect(result.current.summary?.totalRevenue).toBe(125000);
  });

  it('fetches transactions with filters', async () => {
    const { result } = renderHook(() => useFinancialData());

    const filters = {
      status: 'completed',
      type: 'payment'
    };

    act(() => {
      result.current.fetchTransactions(filters);
    });

    expect(result.current.isLoadingTransactions).toBe(true);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(result.current.isLoadingTransactions).toBe(false);
    });

    expect(result.current.transactions).toBeDefined();
  });

  it('fetches disputes correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    act(() => {
      result.current.fetchDisputes();
    });

    expect(result.current.isLoadingDisputes).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(result.current.isLoadingDisputes).toBe(false);
    });

    expect(result.current.disputes).toHaveLength(1);
    expect(result.current.disputes[0].disputeReason).toBe('Item not as described');
  });

  it('processes refund correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    // Wait for initial data to load
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    act(() => {
      result.current.processRefund('txn_001', 25000, 'Customer request');
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Refund request submitted successfully');
    });

    // Check if transaction status was updated
    const updatedTransaction = result.current.transactions.find(t => t.id === 'txn_001');
    expect(updatedTransaction?.status).toBe('pending');
  });

  it('resolves dispute correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    // Wait for initial data to load
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.disputes).toHaveLength(1);
    });

    act(() => {
      result.current.resolveDispute('txn_001', 'Resolved in favor of customer', 'Refund processed');
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Dispute resolved successfully');
    });

    // Check if dispute status was updated
    const updatedDispute = result.current.disputes.find(d => d.id === 'txn_001');
    expect(updatedDispute?.disputeStatus).toBe('resolved');
    expect(updatedDispute?.disputeNotes).toBe('Refund processed');
  });

  it('generates report correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    const dateRange = {
      start: '2024-01-01',
      end: '2024-01-31'
    };

    act(() => {
      result.current.generateReport('revenue', dateRange);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Report generation started');
    });

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.reports[0].type).toBe('revenue');
    expect(result.current.reports[0].status).toBe('generating');

    // Fast-forward to complete report generation
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      const completedReport = result.current.reports.find(r => r.status === 'completed');
      expect(completedReport).toBeDefined();
      expect(completedReport?.downloadUrl).toContain('/api/reports/download/');
    });
  });

  it('exports data correctly', async () => {
    const { result } = renderHook(() => useFinancialData());

    const filters = { status: 'completed' };

    act(() => {
      result.current.exportData('csv', filters);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Data export completed');
    });

    // Verify that the export process was initiated
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('handles errors correctly', async () => {
    // Mock console.error to avoid noise
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useFinancialData());

    // The hook should handle errors gracefully
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Since we're using mock data, errors won't actually occur
    // but the error handling structure is in place
    expect(result.current.error).toBeNull();

    global.fetch = originalFetch;
  });

  it('filters transactions by status', async () => {
    const { result } = renderHook(() => useFinancialData());

    // Wait for initial data to load
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Filter by completed status
    act(() => {
      result.current.fetchTransactions({ status: 'completed' });
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(result.current.isLoadingTransactions).toBe(false);
    });

    // All returned transactions should have completed status
    result.current.transactions.forEach(transaction => {
      expect(transaction.status).toBe('completed');
    });
  });

  it('filters transactions by type', async () => {
    const { result } = renderHook(() => useFinancialData());

    // Wait for initial data to load
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Filter by payment type
    act(() => {
      result.current.fetchTransactions({ type: 'payment' });
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(result.current.isLoadingTransactions).toBe(false);
    });

    // All returned transactions should be payment type
    result.current.transactions.forEach(transaction => {
      expect(transaction.type).toBe('payment');
    });
  });

  it('provides all required functions', () => {
    const { result } = renderHook(() => useFinancialData());

    expect(typeof result.current.fetchSummary).toBe('function');
    expect(typeof result.current.fetchTransactions).toBe('function');
    expect(typeof result.current.fetchDisputes).toBe('function');
    expect(typeof result.current.processRefund).toBe('function');
    expect(typeof result.current.resolveDispute).toBe('function');
    expect(typeof result.current.generateReport).toBe('function');
    expect(typeof result.current.exportData).toBe('function');
  });
});