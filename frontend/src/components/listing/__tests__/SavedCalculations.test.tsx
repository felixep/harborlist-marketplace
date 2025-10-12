import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SavedCalculations from '../SavedCalculations';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../contexts/ToastContext';
import { FinanceCalculation } from '@harborlist/shared-types';

// Mock dependencies
vi.mock('../../../hooks/useAuth');
vi.mock('../../../contexts/ToastContext');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
global.confirm = vi.fn();

const mockUseAuth = vi.mocked(useAuth);
const mockUseToast = vi.mocked(useToast);

describe('SavedCalculations', () => {
  const mockShowToast = vi.fn();
  const mockOnCalculationSelect = vi.fn();
  const mockOnCalculationDelete = vi.fn();
  
  const mockUser = {
    userId: 'test-user',
    token: 'test-token',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockCalculations: FinanceCalculation[] = [
    {
      calculationId: 'calc-1',
      listingId: 'listing-1',
      userId: 'test-user',
      boatPrice: 100000,
      downPayment: 20000,
      loanAmount: 80000,
      interestRate: 6.5,
      termMonths: 180,
      monthlyPayment: 697.87,
      totalInterest: 45617.60,
      totalCost: 145617.60,
      saved: true,
      shared: false,
      calculationNotes: 'First boat calculation',
      createdAt: Date.now() - 86400000, // 1 day ago
    },
    {
      calculationId: 'calc-2',
      listingId: 'listing-2',
      userId: 'test-user',
      boatPrice: 150000,
      downPayment: 30000,
      loanAmount: 120000,
      interestRate: 7.0,
      termMonths: 240,
      monthlyPayment: 1161.08,
      totalInterest: 158659.20,
      totalCost: 308659.20,
      saved: true,
      shared: true,
      shareToken: 'share-token-123',
      lenderInfo: {
        name: 'Marine Bank',
        rate: 6.8,
        terms: 'Pre-approved rate'
      },
      createdAt: Date.now() - 172800000, // 2 days ago
    }
  ];

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: []
    });
    
    mockFetch.mockClear();
    mockShowToast.mockClear();
    mockOnCalculationSelect.mockClear();
    mockOnCalculationDelete.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Authentication States', () => {
    it('shows login required message when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null });
      
      render(<SavedCalculations />);
      
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to save and manage your finance calculations')).toBeInTheDocument();
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });

    it('loads saved calculations when user is authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/finance/calculations/${mockUser.userId}`, {
          headers: {
            'Authorization': `Bearer ${mockUser.token}`
          }
        });
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while fetching calculations', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<SavedCalculations />);
      
      // Should show loading skeletons
      expect(screen.getAllByRole('generic')).toHaveLength(3); // 3 loading skeletons
    });

    it('shows empty state when no calculations exist', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: [] })
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('No Saved Calculations')).toBeInTheDocument();
        expect(screen.getByText('Save your finance calculations to compare different scenarios and access them later')).toBeInTheDocument();
      });
    });

    it('shows error state when fetch fails', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load saved calculations')).toBeInTheDocument();
      });
    });
  });

  describe('Calculation Display', () => {
    beforeEach(async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
    });

    it('displays calculation details correctly', async () => {
      render(<SavedCalculations />);
      
      await waitFor(() => {
        // First calculation
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
        expect(screen.getByText('$20,000')).toBeInTheDocument(); // Down payment
        expect(screen.getByText('6.5%')).toBeInTheDocument(); // Interest rate
        expect(screen.getByText('15 years')).toBeInTheDocument(); // Term
        expect(screen.getByText('$698')).toBeInTheDocument(); // Monthly payment (rounded)
        
        // Second calculation
        expect(screen.getByText('$150,000 Boat')).toBeInTheDocument();
        expect(screen.getByText('$30,000')).toBeInTheDocument(); // Down payment
        expect(screen.getByText('7%')).toBeInTheDocument(); // Interest rate
        expect(screen.getByText('20 years')).toBeInTheDocument(); // Term
        expect(screen.getByText('$1,161')).toBeInTheDocument(); // Monthly payment (rounded)
      });
    });

    it('shows shared indicator for shared calculations', async () => {
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('Shared')).toBeInTheDocument();
      });
    });

    it('shows notes indicator when calculation has notes', async () => {
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('Has notes')).toBeInTheDocument();
      });
    });

    it('formats dates correctly', async () => {
      render(<SavedCalculations />);
      
      await waitFor(() => {
        // Should show relative dates
        expect(screen.getByText(/Saved/)).toBeInTheDocument();
      });
    });
  });

  describe('Calculation Selection', () => {
    beforeEach(async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
    });

    it('selects calculation when clicked', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations onCalculationSelect={mockOnCalculationSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click on first calculation
      await user.click(screen.getByText('$100,000 Boat').closest('div')!);
      
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('shows expanded details for selected calculation', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click on first calculation
      await user.click(screen.getByText('$100,000 Boat').closest('div')!);
      
      await waitFor(() => {
        expect(screen.getByText('Total Interest')).toBeInTheDocument();
        expect(screen.getByText('Total Cost')).toBeInTheDocument();
        expect(screen.getByText('Loan Amount')).toBeInTheDocument();
        expect(screen.getByText('$45,618')).toBeInTheDocument(); // Total interest (rounded)
        expect(screen.getByText('$145,618')).toBeInTheDocument(); // Total cost (rounded)
        expect(screen.getByText('$80,000')).toBeInTheDocument(); // Loan amount
      });
    });

    it('shows notes in expanded view', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click on first calculation (has notes)
      await user.click(screen.getByText('$100,000 Boat').closest('div')!);
      
      await waitFor(() => {
        expect(screen.getByText('Notes:')).toBeInTheDocument();
        expect(screen.getByText('First boat calculation')).toBeInTheDocument();
      });
    });

    it('shows lender info in expanded view', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$150,000 Boat')).toBeInTheDocument();
      });
      
      // Click on second calculation (has lender info)
      await user.click(screen.getByText('$150,000 Boat').closest('div')!);
      
      await waitFor(() => {
        expect(screen.getByText('Lender Information:')).toBeInTheDocument();
        expect(screen.getByText('Marine Bank')).toBeInTheDocument();
        expect(screen.getByText('6.8%')).toBeInTheDocument();
        expect(screen.getByText('Pre-approved rate')).toBeInTheDocument();
      });
    });

    it('calls onCalculationSelect when Use This Calculation is clicked', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations onCalculationSelect={mockOnCalculationSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Select first calculation
      await user.click(screen.getByText('$100,000 Boat').closest('div')!);
      
      // Click use calculation button
      await user.click(screen.getByText('Use This Calculation'));
      
      expect(mockOnCalculationSelect).toHaveBeenCalledWith(mockCalculations[0]);
    });
  });

  describe('Share Functionality', () => {
    beforeEach(async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
    });

    it('shares calculation successfully', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ calculations: mockCalculations })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            shareToken: 'new-share-token',
            shareUrl: 'https://example.com/shared/new-share-token'
          })
        });
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click share button for first calculation
      const shareButtons = screen.getAllByTitle('Share calculation');
      await user.click(shareButtons[0]);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/finance/share/${mockCalculations[0].calculationId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUser.token}`
          }
        });
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/shared/new-share-token');
        expect(mockShowToast).toHaveBeenCalledWith('Share link copied to clipboard', 'success');
      });
    });

    it('handles share error', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ calculations: mockCalculations })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click share button
      const shareButtons = screen.getAllByTitle('Share calculation');
      await user.click(shareButtons[0]);
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to share calculation', 'error');
      });
    });
  });

  describe('Delete Functionality', () => {
    beforeEach(async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
    });

    it('deletes calculation successfully', async () => {
      const user = userEvent.setup();
      (global.confirm as any).mockReturnValue(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ calculations: mockCalculations })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });
      
      render(<SavedCalculations onCalculationDelete={mockOnCalculationDelete} />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click delete button for first calculation
      const deleteButtons = screen.getAllByTitle('Delete calculation');
      await user.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this calculation?');
        expect(mockFetch).toHaveBeenCalledWith(`/api/finance/calculations/${mockCalculations[0].calculationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockUser.token}`
          }
        });
        
        expect(mockShowToast).toHaveBeenCalledWith('Calculation deleted successfully', 'success');
        expect(mockOnCalculationDelete).toHaveBeenCalledWith(mockCalculations[0].calculationId);
      });
    });

    it('cancels delete when user declines confirmation', async () => {
      const user = userEvent.setup();
      (global.confirm as any).mockReturnValue(false);
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete calculation');
      await user.click(deleteButtons[0]);
      
      expect(global.confirm).toHaveBeenCalled();
      // Should not make delete API call
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial load
    });

    it('handles delete error', async () => {
      const user = userEvent.setup();
      (global.confirm as any).mockReturnValue(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ calculations: mockCalculations })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete calculation');
      await user.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to delete calculation', 'error');
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes calculations when refresh button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Click refresh button
      await user.click(screen.getByText('Refresh'));
      
      // Should make another API call
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: mockCalculations })
      });
    });

    it('has proper button labels and titles', async () => {
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getAllByTitle('Share calculation')).toHaveLength(2);
        expect(screen.getAllByTitle('Delete calculation')).toHaveLength(2);
        expect(screen.getByText('Use This Calculation')).toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$100,000 Boat')).toBeInTheDocument();
      });
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('Refresh')).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('handles calculations without optional fields', async () => {
      const minimalCalculation: FinanceCalculation = {
        calculationId: 'calc-minimal',
        listingId: '',
        userId: 'test-user',
        boatPrice: 50000,
        downPayment: 10000,
        loanAmount: 40000,
        interestRate: 5.0,
        termMonths: 120,
        monthlyPayment: 424.26,
        totalInterest: 10911.20,
        totalCost: 60911.20,
        saved: true,
        shared: false,
        createdAt: Date.now()
      };
      
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calculations: [minimalCalculation] })
      });
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('$50,000 Boat')).toBeInTheDocument();
        expect(screen.queryByText('Shared')).not.toBeInTheDocument();
        expect(screen.queryByText('Has notes')).not.toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<SavedCalculations />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load saved calculations')).toBeInTheDocument();
      });
    });
  });
});