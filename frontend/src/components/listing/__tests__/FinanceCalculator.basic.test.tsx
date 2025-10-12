import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FinanceCalculator from '../FinanceCalculator';

// Mock dependencies
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null }))
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
    toasts: []
  }))
}));

vi.mock('../SavedCalculations', () => ({
  default: () => <div data-testid="saved-calculations">Saved Calculations</div>
}));

vi.mock('../LoanScenarioComparison', () => ({
  default: () => <div data-testid="loan-scenarios">Loan Scenarios</div>
}));

vi.mock('../PaymentSchedule', () => ({
  default: () => <div data-testid="payment-schedule">Payment Schedule</div>
}));

// Mock fetch
global.fetch = vi.fn();

// Mock clipboard and share APIs
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  share: vi.fn().mockResolvedValue(undefined),
});

describe('FinanceCalculator - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders calculator with boat price', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Calculator')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    });

    it('shows default down payment as 20% of boat price', () => {
      render(<FinanceCalculator boatPrice={150000} />);
      
      expect(screen.getByDisplayValue('30000')).toBeInTheDocument(); // 20% of 150k
    });

    it('shows default interest rate and term', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByDisplayValue('6.5')).toBeInTheDocument(); // Default interest rate
      expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // Default term (15 years)
    });
  });

  describe('Tab Navigation', () => {
    it('shows calculator tab by default', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Calculator')).toBeInTheDocument();
      expect(screen.getByText('Compare Scenarios')).toBeInTheDocument();
    });

    it('does not show saved tab when user is not logged in', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });
  });

  describe('Calculation Display', () => {
    it('shows payment estimate section', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Payment Estimate')).toBeInTheDocument();
    });

    it('shows disclaimer', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText(/This calculator provides estimates only/)).toBeInTheDocument();
    });
  });

  describe('Form Controls', () => {
    it('has all required form inputs', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByLabelText('Boat Price')).toBeInTheDocument();
      expect(screen.getByLabelText(/Down Payment/)).toBeInTheDocument();
      expect(screen.getByLabelText('Interest Rate (%)')).toBeInTheDocument();
      expect(screen.getByLabelText('Loan Term')).toBeInTheDocument();
    });

    it('has share and save buttons', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Share Calculation')).toBeInTheDocument();
      expect(screen.getByText('Save Calculation')).toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('shows advanced options toggle', () => {
      render(<FinanceCalculator boatPrice={100000} />);
      
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero boat price', () => {
      render(<FinanceCalculator boatPrice={0} />);
      
      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('handles very large boat price', () => {
      render(<FinanceCalculator boatPrice={5000000} />);
      
      expect(screen.getByDisplayValue('5000000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000000')).toBeInTheDocument(); // 20% down payment
    });
  });
});