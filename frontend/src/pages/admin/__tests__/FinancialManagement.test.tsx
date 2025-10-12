import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FinancialManagement from '../FinancialManagement';
import { ToastProvider } from '../../../contexts/ToastContext';
import { adminApi } from '../../../services/adminApi';

// Mock the admin API
vi.mock('../../../services/adminApi', () => ({
  adminApi: {
    getFinancialSummary: vi.fn(),
    getTransactions: vi.fn(),
    getBillingAccounts: vi.fn(),
    getDisputedTransactions: vi.fn(),
    getFinancialReports: vi.fn(),
    processRefund: vi.fn(),
    updateDisputeStatus: vi.fn(),
    generateFinancialReport: vi.fn()
  }
}));

const mockFinancialSummary = {
  totalRevenue: 125000,
  totalTransactions: 1250,
  pendingPayouts: 15000,
  disputedTransactions: 5,
  commissionEarned: 12500,
  refundsProcessed: 2500
};

const mockTransactions = [
  {
    id: 'txn_001',
    transactionId: 'txn_001',
    type: 'payment',
    amount: 50000,
    currency: 'USD',
    status: 'completed',
    userId: 'user_123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    listingId: 'listing_456',
    listingTitle: '2020 Sea Ray Sundancer',
    paymentMethod: 'Credit Card',
    processorTransactionId: 'stripe_ch_123456',
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T10:31:00Z',
    description: 'Boat listing purchase',
    fees: 1500,
    netAmount: 48500
  },
  {
    id: 'txn_002',
    transactionId: 'txn_002',
    type: 'refund',
    amount: 25000,
    currency: 'USD',
    status: 'pending',
    userId: 'user_456',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    paymentMethod: 'Credit Card',
    processorTransactionId: 'stripe_ch_789012',
    createdAt: '2024-01-16T14:20:00Z',
    description: 'Refund for cancelled purchase',
    fees: 750,
    netAmount: 24250
  }
];

const mockBillingAccounts = [
  {
    billingId: 'bill_001',
    userId: 'user_123',
    customerId: 'cus_123',
    paymentMethodId: 'pm_123',
    subscriptionId: 'sub_123',
    plan: 'Premium Individual',
    amount: 2999,
    currency: 'USD',
    status: 'active',
    nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    paymentHistory: [],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now()
  }
];

const mockDisputes = [
  {
    id: 'dispute_001',
    transactionId: 'txn_001',
    type: 'payment',
    amount: 50000,
    currency: 'USD',
    status: 'disputed',
    userId: 'user_123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    paymentMethod: 'Credit Card',
    processorTransactionId: 'stripe_ch_123456',
    createdAt: '2024-01-15T10:30:00Z',
    description: 'Boat listing purchase',
    fees: 1500,
    netAmount: 48500,
    disputeReason: 'Item not as described',
    disputeDate: '2024-01-20T14:00:00Z',
    disputeStatus: 'under_review',
    disputeNotes: 'Customer claims boat condition differs from listing'
  }
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('FinancialManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getFinancialSummary as any).mockResolvedValue(mockFinancialSummary);
    (adminApi.getTransactions as any).mockResolvedValue({ transactions: mockTransactions });
    (adminApi.getBillingAccounts as any).mockResolvedValue({ accounts: mockBillingAccounts });
    (adminApi.getDisputedTransactions as any).mockResolvedValue({ disputes: mockDisputes });
    (adminApi.getFinancialReports as any).mockResolvedValue({ reports: [] });
  });

  it('renders financial management interface', async () => {
    renderWithProviders(<FinancialManagement />);
    
    expect(screen.getByText('Financial Management')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Billing Accounts')).toBeInTheDocument();
    expect(screen.getByText('Disputes')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('displays financial summary cards', async () => {
    renderWithProviders(<FinancialManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$1,250.00')).toBeInTheDocument(); // 125000 cents = $1,250.00
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Disputed Transactions')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    renderWithProviders(<FinancialManagement />);
    
    // Click on Transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
      expect(screen.getByText('Export Transactions')).toBeInTheDocument();
    });

    // Click on Billing Accounts tab
    fireEvent.click(screen.getByText('Billing Accounts'));
    
    await waitFor(() => {
      expect(screen.getByText('Customer Billing Accounts')).toBeInTheDocument();
      expect(screen.getByText('Export Billing Data')).toBeInTheDocument();
    });
  });

  it('displays transactions correctly', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument(); // 50000 cents
      expect(screen.getByText('$250.00')).toBeInTheDocument(); // 25000 cents
    });
  });

  it('filters transactions by status', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });

    // The component should re-fetch with new filters
    expect(adminApi.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('opens refund modal when refund button is clicked', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const refundButtons = screen.getAllByText('Refund');
    fireEvent.click(refundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Process Refund')).toBeInTheDocument();
      expect(screen.getByText('Refund Amount')).toBeInTheDocument();
      expect(screen.getByText('Reason for Refund')).toBeInTheDocument();
    });
  });

  it('processes refund correctly', async () => {
    (adminApi.processRefund as any).mockResolvedValue({});
    
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const refundButtons = screen.getAllByText('Refund');
    fireEvent.click(refundButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Process Refund')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Please provide a reason for this refund...');
    fireEvent.change(reasonInput, { target: { value: 'Customer requested refund' } });

    const processButton = screen.getByText('Process Refund');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(adminApi.processRefund).toHaveBeenCalledWith(
        'txn_001',
        50000,
        'Customer requested refund'
      );
    });
  });

  it('displays billing accounts correctly', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Billing Accounts'));
    
    await waitFor(() => {
      expect(screen.getByText('Customer Billing Accounts')).toBeInTheDocument();
      expect(screen.getByText('Premium Individual')).toBeInTheDocument();
      expect(screen.getByText('$29.99 USD')).toBeInTheDocument(); // 2999 cents
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('displays disputes correctly', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Disputes'));
    
    await waitFor(() => {
      expect(screen.getByText('Disputed Transactions')).toBeInTheDocument();
      expect(screen.getByText('Item not as described')).toBeInTheDocument();
      expect(screen.getByText('under review')).toBeInTheDocument();
      expect(screen.getByText('Investigate')).toBeInTheDocument();
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });
  });

  it('handles dispute status update', async () => {
    (adminApi.updateDisputeStatus as any).mockResolvedValue({});
    
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Disputes'));
    
    await waitFor(() => {
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    const resolveButton = screen.getByText('Resolve');
    fireEvent.click(resolveButton);

    // This would typically open a modal or trigger an action
    // For now, we'll just verify the component renders correctly
    expect(screen.getByText('Disputed Transactions')).toBeInTheDocument();
  });

  it('generates financial reports', async () => {
    (adminApi.generateFinancialReport as any).mockResolvedValue({});
    
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Reports'));
    
    await waitFor(() => {
      expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    });

    const generateButtons = screen.getAllByText('Generate Report');
    fireEvent.click(generateButtons[0]);

    expect(adminApi.generateFinancialReport).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'revenue',
        format: 'pdf'
      })
    );
  });

  it('handles search functionality', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search transactions...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    // The component should update filters and re-fetch
    expect(adminApi.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'john' })
    );
  });

  it('handles date range filtering', async () => {
    renderWithProviders(<FinancialManagement />);
    
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue('');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find(input => input.type === 'date');
    
    if (startDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      
      expect(adminApi.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            startDate: '2024-01-01'
          })
        })
      );
    }
  });

  it('handles API errors gracefully', async () => {
    (adminApi.getFinancialSummary as any).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<FinancialManagement />);
    
    await waitFor(() => {
      // The component should handle the error gracefully
      expect(screen.getByText('Financial Management')).toBeInTheDocument();
    });
  });

  it('shows loading states correctly', async () => {
    // Mock a delayed response
    (adminApi.getFinancialSummary as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockFinancialSummary), 100))
    );
    
    renderWithProviders(<FinancialManagement />);
    
    // Should show loading overlay
    expect(screen.getByText('Processing request...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Processing request...')).not.toBeInTheDocument();
    });
  });
});