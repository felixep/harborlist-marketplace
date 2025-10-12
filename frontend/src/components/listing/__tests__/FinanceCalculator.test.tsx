import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FinanceCalculator from '../FinanceCalculator';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../contexts/ToastContext';

// Mock dependencies
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: vi.fn()
}));
vi.mock('../SavedCalculations', () => ({
  default: ({ onCalculationSelect }: any) => (
    <div data-testid="saved-calculations">
      <button onClick={() => onCalculationSelect({
        calculationId: 'test-calc',
        boatPrice: 100000,
        downPayment: 20000,
        interestRate: 6.5,
        termMonths: 180,
        monthlyPayment: 877.57,
        totalInterest: 37963.60,
        totalCost: 137963.60,
        loanAmount: 80000,
        saved: true,
        shared: false,
        createdAt: Date.now()
      })}>
        Select Saved Calculation
      </button>
    </div>
  )
}));

vi.mock('../LoanScenarioComparison', () => ({
  default: ({ onScenarioSelect }: any) => (
    <div data-testid="loan-scenarios">
      <button onClick={() => onScenarioSelect({
        scenarioId: 'test-scenario',
        name: 'Test Scenario',
        params: {
          boatPrice: 100000,
          downPayment: 15000,
          interestRate: 7.0,
          termMonths: 240
        }
      })}>
        Select Scenario
      </button>
    </div>
  )
}));

vi.mock('../PaymentSchedule', () => ({
  default: ({ schedule }: any) => (
    <div data-testid="payment-schedule">
      Payment Schedule ({schedule?.length || 0} payments)
    </div>
  )
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  share: vi.fn().mockResolvedValue(undefined),
});

const mockUseAuth = useAuth as any;
const mockUseToast = useToast as any;

describe('FinanceCalculator', () => {
  const mockShowToast = vi.fn();
  const mockUser = {
    userId: 'test-user',
    token: 'test-token',
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: []
    });
    
    mockFetch.mockClear();
    mockShowToast.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('renders calculator with default values', () => {
      mockUseAuth.mockReturnValue({ user: null });
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Finance Calculator')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100000')).toBeInTheDocument(); // Boat price
      expect(screen.getByDisplayValue('20000')).toBeInTheDocument(); // Default 20% down payment
      expect(screen.getByDisplayValue('6.5')).toBeInTheDocument(); // Default interest rate
    });

    it('renders all tabs when user is logged in', () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Calculator')).toBeInTheDocument();
      expect(screen.getByText('Compare Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('hides saved tab when user is not logged in', () => {
      mockUseAuth.mockReturnValue({ user: null });
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Calculator')).toBeInTheDocument();
      expect(screen.getByText('Compare Scenarios')).toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });
  });

  describe('Calculation Accuracy', () => {
    it('calculates monthly payment correctly', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Wait for calculation to complete
      await waitFor(() => {
        expect(screen.getByText('$877')).toBeInTheDocument(); // Monthly payment
      });
      
      expect(screen.getByText('$80,000')).toBeInTheDocument(); // Loan amount
      expect(screen.getByText('$37,964')).toBeInTheDocument(); // Total interest (rounded)
      expect(screen.getByText('$137,964')).toBeInTheDocument(); // Total cost (rounded)
    });

    it('recalculates when parameters change', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Change down payment
      const downPaymentInput = screen.getByDisplayValue('20000');
      await user.clear(downPaymentInput);
      await user.type(downPaymentInput, '30000');
      
      // Wait for recalculation
      await waitFor(() => {
        expect(screen.getByText('$70,000')).toBeInTheDocument(); // New loan amount
      });
    });

    it('handles zero interest rate correctly', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Set interest rate to 0
      const interestInput = screen.getByDisplayValue('6.5');
      await user.clear(interestInput);
      await user.type(interestInput, '0');
      
      // Wait for recalculation
      await waitFor(() => {
        expect(screen.getByText('$444')).toBeInTheDocument(); // 80000 / 180 months
        expect(screen.getByText('$0')).toBeInTheDocument(); // No interest
      });
    });
  });

  describe('Input Validation', () => {
    it('validates down payment range', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Try to set down payment above 90%
      const downPaymentInput = screen.getByDisplayValue('20000');
      await user.clear(downPaymentInput);
      await user.type(downPaymentInput, '95000');
      
      // Try to save - should show validation error
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Down payment must be between'),
        'error'
      );
    });

    it('validates interest rate range', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Try to set interest rate above 30%
      const interestInput = screen.getByDisplayValue('6.5');
      await user.clear(interestInput);
      await user.type(interestInput, '35');
      
      // Try to save - should show validation error
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Interest rate must be between'),
        'error'
      );
    });
  });

  describe('Save Functionality', () => {
    it('saves calculation successfully', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          calculation: {
            calculationId: 'saved-calc-123',
            boatPrice: 100000,
            downPayment: 20000,
            interestRate: 6.5,
            termMonths: 180
          }
        })
      });
      
      const user = userEvent.setup();
      render(<FinanceCalculator boatPrice={100000} listingId="test-listing" />);
      
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/finance/calculate/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            boatPrice: 100000,
            downPayment: 20000,
            interestRate: 6.5,
            termMonths: 180,
            listingId: 'test-listing',
            includeSchedule: true
          })
        });
      });
      
      expect(mockShowToast).toHaveBeenCalledWith('Calculation saved successfully', 'success');
    });

    it('handles save error', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });
      
      const user = userEvent.setup();
      render(<FinanceCalculator boatPrice={100000} />);
      
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save calculation', 'error');
      });
    });

    it('shows login required message when not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      expect(mockShowToast).toHaveBeenCalledWith('Please log in to save calculations', 'error');
    });
  });

  describe('Share Functionality', () => {
    it('shares calculation using Web Share API', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      const shareButton = screen.getByText('Share Calculation');
      await user.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.share).toHaveBeenCalledWith({
          title: 'Boat Finance Calculator',
          text: expect.stringContaining('Monthly Payment: $877'),
          url: window.location.href
        });
      });
    });

    it('falls back to clipboard when Web Share API not available', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      // Mock Web Share API as not available
      const originalShare = navigator.share;
      delete (navigator as any).share;
      
      const user = userEvent.setup();
      render(<FinanceCalculator boatPrice={100000} />);
      
      const shareButton = screen.getByText('Share Calculation');
      await user.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Boat Finance Calculation:')
        );
        expect(mockShowToast).toHaveBeenCalledWith('Calculation copied to clipboard', 'success');
      });
      
      // Restore Web Share API
      (navigator as any).share = originalShare;
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Initially on calculator tab
      expect(screen.getByText('Finance Calculator')).toBeInTheDocument();
      
      // Switch to scenarios tab
      await user.click(screen.getByText('Compare Scenarios'));
      expect(screen.getByTestId('loan-scenarios')).toBeInTheDocument();
      
      // Switch to saved tab
      await user.click(screen.getByText('Saved'));
      expect(screen.getByTestId('saved-calculations')).toBeInTheDocument();
      
      // Switch back to calculator
      await user.click(screen.getByText('Calculator'));
      expect(screen.getByText('Finance Calculator')).toBeInTheDocument();
    });
  });

  describe('Scenario Integration', () => {
    it('applies selected scenario to calculator', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Switch to scenarios tab
      await user.click(screen.getByText('Compare Scenarios'));
      
      // Select a scenario
      await user.click(screen.getByText('Select Scenario'));
      
      // Should switch back to calculator tab with new values
      expect(screen.getByDisplayValue('15000')).toBeInTheDocument(); // New down payment
      expect(screen.getByDisplayValue('7')).toBeInTheDocument(); // New interest rate
      expect(screen.getByDisplayValue('240')).toBeInTheDocument(); // New term
    });
  });

  describe('Saved Calculations Integration', () => {
    it('applies selected saved calculation to calculator', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Switch to saved tab
      await user.click(screen.getByText('Saved'));
      
      // Select a saved calculation
      await user.click(screen.getByText('Select Saved Calculation'));
      
      // Should switch back to calculator tab with saved values
      expect(screen.getByDisplayValue('20000')).toBeInTheDocument(); // Saved down payment
      expect(screen.getByDisplayValue('6.5')).toBeInTheDocument(); // Saved interest rate
      expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // Saved term
    });
  });

  describe('Advanced Options', () => {
    it('toggles advanced options', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Advanced options should be hidden initially
      expect(screen.queryByText('Include payment schedule')).not.toBeInTheDocument();
      
      // Click advanced options
      await user.click(screen.getByText('Advanced Options'));
      
      // Advanced options should be visible
      expect(screen.getByText('Include payment schedule')).toBeInTheDocument();
      
      // Click simple view
      await user.click(screen.getByText('Simple View'));
      
      // Advanced options should be hidden again
      expect(screen.queryByText('Include payment schedule')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      mockUseAuth.mockReturnValue({ user: null });
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Should still render main elements
      expect(screen.getByText('Finance Calculator')).toBeInTheDocument();
      expect(screen.getByText('Payment Estimate')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      mockUseAuth.mockReturnValue({ user: null });
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Check for proper labels
      expect(screen.getByLabelText('Boat Price')).toBeInTheDocument();
      expect(screen.getByLabelText(/Down Payment/)).toBeInTheDocument();
      expect(screen.getByLabelText('Interest Rate (%)')).toBeInTheDocument();
      expect(screen.getByLabelText('Loan Term')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={100000} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByDisplayValue('20000')).toHaveFocus(); // Down payment input
      
      await user.tab();
      expect(screen.getByDisplayValue('6.5')).toHaveFocus(); // Interest rate input
      
      await user.tab();
      expect(screen.getByDisplayValue('180')).toHaveFocus(); // Term select
    });
  });

  describe('Error Handling', () => {
    it('displays error message for invalid calculations', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const user = userEvent.setup();
      
      render(<FinanceCalculator boatPrice={0} />); // Invalid boat price
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Invalid calculation parameters')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<FinanceCalculator boatPrice={100000} />);
      
      const saveButton = screen.getByText('Save Calculation');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save calculation', 'error');
      });
    });
  });
});