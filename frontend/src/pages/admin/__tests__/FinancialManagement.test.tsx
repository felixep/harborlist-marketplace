import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FinancialManagement from '../FinancialManagement';

// Mock the useFinancialData hook
vi.mock('../../../hooks/useFinancialData', () => ({
  useFinancialData: () => ({
    summary: {
      totalRevenue: 125000,
      totalTransactions: 1250,
      pendingPayouts: 15000,
      disputedTransactions: 5,
      commissionEarned: 12500,
      refundsProcessed: 2500
    },
    transactions: [
      {
        id: 'txn_001',
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
      }
    ],
    disputes: [
      {
        id: 'txn_001',
        type: 'payment',
        amount: 50000,
        currency: 'USD',
        status: 'disputed',
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
        netAmount: 48500,
        disputeReason: 'Item not as described',
        disputeDate: '2024-01-20T14:00:00Z',
        disputeStatus: 'under_review',
        disputeNotes: 'Customer claims boat condition differs from listing'
      }
    ],
    refundRequests: [],
    payoutSchedule: [],
    reports: [],
    isLoading: false,
    isLoadingTransactions: false,
    isLoadingDisputes: false,
    error: null,
    fetchSummary: vi.fn(),
    fetchTransactions: vi.fn(),
    fetchDisputes: vi.fn(),
    processRefund: vi.fn(),
    resolveDispute: vi.fn(),
    generateReport: vi.fn(),
    exportData: vi.fn()
  })
}));

describe('FinancialManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders financial management page with correct title', () => {
    render(<FinancialManagement />);
    
    expect(screen.getByText('Financial Management')).toBeInTheDocument();
  });

  it('displays financial summary cards in overview tab', () => {
    render(<FinancialManagement />);
    
    // Check if summary cards are displayed
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,250.00')).toBeInTheDocument();
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Disputed Transactions')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    render(<FinancialManagement />);
    
    // Initially on overview tab
    expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
    
    // Click on transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });
    
    // Click on disputes tab
    fireEvent.click(screen.getByText('Disputes'));
    
    await waitFor(() => {
      expect(screen.getByText('Disputed Transactions')).toBeInTheDocument();
    });
    
    // Click on reports tab
    fireEvent.click(screen.getByText('Reports'));
    
    await waitFor(() => {
      expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    });
  });

  it('displays transaction table with correct data', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    // Check if transaction data is displayed
    expect(screen.getByText('txn_001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('displays dispute table with correct data', () => {
    render(<FinancialManagement />);
    
    // Switch to disputes tab
    fireEvent.click(screen.getByText('Disputes'));
    
    // Check if dispute data is displayed
    expect(screen.getByText('Item not as described')).toBeInTheDocument();
    expect(screen.getByText('under review')).toBeInTheDocument();
  });

  it('shows search and filter controls in transactions tab', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    // Check if search and filter controls are present
    expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
  });

  it('handles search input in transactions tab', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    const searchInput = screen.getByPlaceholderText('Search transactions...');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    expect(searchInput).toHaveValue('John Doe');
  });

  it('handles status filter change in transactions tab', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });
    
    expect(statusFilter).toHaveValue('completed');
  });

  it('displays report generation options in reports tab', () => {
    render(<FinancialManagement />);
    
    // Switch to reports tab
    fireEvent.click(screen.getByText('Reports'));
    
    // Check if report options are displayed
    expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
    expect(screen.getByText('Commission Tracking')).toBeInTheDocument();
    expect(screen.getByText('Payout Schedule')).toBeInTheDocument();
    
    // Check if generate report buttons are present
    const generateButtons = screen.getAllByText('Generate Report');
    expect(generateButtons).toHaveLength(3);
  });

  it('shows integration warning in reports tab', () => {
    render(<FinancialManagement />);
    
    // Switch to reports tab
    fireEvent.click(screen.getByText('Reports'));
    
    expect(screen.getByText('Integration Required')).toBeInTheDocument();
    expect(screen.getByText(/Financial reporting features require integration/)).toBeInTheDocument();
  });

  it('displays action buttons in header', () => {
    render(<FinancialManagement />);
    
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Process Payout')).toBeInTheDocument();
  });

  it('shows transaction action buttons', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Process Refund')).toBeInTheDocument();
  });

  it('shows dispute action buttons', () => {
    render(<FinancialManagement />);
    
    // Switch to disputes tab
    fireEvent.click(screen.getByText('Disputes'));
    
    expect(screen.getByText('Investigate')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<FinancialManagement />);
    
    // Check if currency is formatted correctly in summary cards
    expect(screen.getByText('$1,250.00')).toBeInTheDocument(); // Total Revenue
    expect(screen.getByText('$150.00')).toBeInTheDocument(); // Pending Payouts
    expect(screen.getByText('$125.00')).toBeInTheDocument(); // Commission Earned
  });

  it('formats dates correctly', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    // Check if date is formatted correctly
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
  });

  it('applies correct status badge colors', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    const completedBadge = screen.getByText('completed');
    expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('handles date range inputs', () => {
    render(<FinancialManagement />);
    
    // Switch to transactions tab
    fireEvent.click(screen.getByText('Transactions'));
    
    const dateInputs = screen.getAllByDisplayValue('').filter(input => 
      input.getAttribute('type') === 'date'
    );
    expect(dateInputs).toHaveLength(2); // Start and end date inputs
    
    fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-01-31' } });
    
    expect(dateInputs[0]).toHaveValue('2024-01-01');
    expect(dateInputs[1]).toHaveValue('2024-01-31');
  });
});