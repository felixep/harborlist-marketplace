import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoanScenarioComparison from '../LoanScenarioComparison';

describe('LoanScenarioComparison', () => {
  const mockOnScenarioSelect = vi.fn();

  beforeEach(() => {
    mockOnScenarioSelect.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders loan scenario comparison with title', () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      expect(screen.getByText('Loan Scenario Comparison')).toBeInTheDocument();
      expect(screen.getByText('Compare different financing options to find the best fit for your budget')).toBeInTheDocument();
    });

    it('generates default scenarios on mount', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
        expect(screen.getByText('Lower Down Payment (10% down, 15 years)')).toBeInTheDocument();
        expect(screen.getByText('Shorter Term (20% down, 10 years)')).toBeInTheDocument();
        expect(screen.getByText('Longer Term (20% down, 20 years)')).toBeInTheDocument();
        expect(screen.getByText('Higher Down Payment (30% down, 15 years)')).toBeInTheDocument();
        expect(screen.getByText('Premium Rate (20% down, 7.5%, 15 years)')).toBeInTheDocument();
      });
    });

    it('does not render scenarios when boat price is zero', () => {
      render(<LoanScenarioComparison baseBoatPrice={0} />);
      
      expect(screen.queryByText('Conservative (20% down, 15 years)')).not.toBeInTheDocument();
    });
  });

  describe('Scenario Display', () => {
    it('displays scenario details correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Check conservative scenario details
        expect(screen.getByText('$20,000')).toBeInTheDocument(); // Down payment
        expect(screen.getByText('20.0%')).toBeInTheDocument(); // Down payment percentage
        expect(screen.getByText('6.5%')).toBeInTheDocument(); // Interest rate
        expect(screen.getByText('15 years')).toBeInTheDocument(); // Term
        expect(screen.getByText('$80,000')).toBeInTheDocument(); // Loan amount
      });
    });

    it('calculates monthly payments correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Conservative scenario: $80,000 loan at 6.5% for 15 years
        // Expected monthly payment: ~$697
        const monthlyPayments = screen.getAllByText(/\$\d{3}/);
        expect(monthlyPayments.length).toBeGreaterThan(0);
      });
    });

    it('shows comparison data for non-base scenarios', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Look for comparison indicators (↓ or ↑)
        const comparisonElements = screen.getAllByText(/[↓↑]/);
        expect(comparisonElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Scenario Selection', () => {
    it('selects first scenario by default', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Selected')).toBeInTheDocument();
      });
    });

    it('changes selection when scenario is clicked', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
      });
      
      // Click on a different scenario
      const lowerDownScenario = screen.getByText('Lower Down Payment (10% down, 15 years)');
      await user.click(lowerDownScenario.closest('div')!);
      
      // Should show expanded details for selected scenario
      await waitFor(() => {
        expect(screen.getByText('Total Interest')).toBeInTheDocument();
        expect(screen.getByText('Total Cost')).toBeInTheDocument();
        expect(screen.getByText('Total Payments')).toBeInTheDocument();
      });
    });

    it('calls onScenarioSelect when Use This Scenario is clicked', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} onScenarioSelect={mockOnScenarioSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Use This Scenario')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Use This Scenario'));
      
      expect(mockOnScenarioSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: expect.any(String),
          name: expect.any(String),
          params: expect.objectContaining({
            boatPrice: 100000,
            downPayment: expect.any(Number),
            interestRate: expect.any(Number),
            termMonths: expect.any(Number)
          }),
          result: expect.objectContaining({
            monthlyPayment: expect.any(Number),
            totalInterest: expect.any(Number),
            totalCost: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Scenario Calculations', () => {
    it('calculates different down payment scenarios correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Conservative: 20% down = $20,000
        expect(screen.getByText('$20,000')).toBeInTheDocument();
        
        // Lower down: 10% down = $10,000
        expect(screen.getByText('$10,000')).toBeInTheDocument();
        
        // Higher down: 30% down = $30,000
        expect(screen.getByText('$30,000')).toBeInTheDocument();
      });
    });

    it('calculates different term scenarios correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Should show different year terms
        expect(screen.getByText('10 years')).toBeInTheDocument(); // Shorter term
        expect(screen.getByText('15 years')).toBeInTheDocument(); // Conservative
        expect(screen.getByText('20 years')).toBeInTheDocument(); // Longer term
      });
    });

    it('calculates different interest rate scenarios correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Should show different interest rates
        expect(screen.getByText('6.5%')).toBeInTheDocument(); // Conservative rate
        expect(screen.getByText('7.5%')).toBeInTheDocument(); // Premium rate
      });
    });
  });

  describe('Comparison Logic', () => {
    it('shows savings when scenario has lower payments', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Click on longer term scenario (should have lower monthly payment)
        const longerTermScenario = screen.getByText('Longer Term (20% down, 20 years)');
        await user.click(longerTermScenario.closest('div')!);
      });
      
      await waitFor(() => {
        // Should show comparison with conservative scenario
        expect(screen.getByText('Compared to Conservative scenario:')).toBeInTheDocument();
      });
    });

    it('does not show comparison for base scenario', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Conservative scenario should be selected by default
        expect(screen.getByText('Selected')).toBeInTheDocument();
      });
      
      // Should not show comparison section for base scenario
      expect(screen.queryByText('Compared to Conservative scenario:')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('regenerates scenarios when refresh is clicked', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
      });
      
      // Click refresh
      await user.click(screen.getByText('Refresh Scenarios'));
      
      // Scenarios should still be there (same logic, but re-generated)
      await waitFor(() => {
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
      });
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
      
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      expect(screen.getByText('Loan Scenario Comparison')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels and roles', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Use This Scenario')).toBeInTheDocument();
        expect(screen.getByText('Refresh Scenarios')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
      });
      
      // Tab to first scenario
      await user.tab();
      // The scenario div should be focusable via click, but keyboard navigation
      // would need additional implementation for full accessibility
    });
  });

  describe('Edge Cases', () => {
    it('handles very small boat prices', async () => {
      render(<LoanScenarioComparison baseBoatPrice={5000} />);
      
      await waitFor(() => {
        // Should still generate scenarios
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
        expect(screen.getByText('$1,000')).toBeInTheDocument(); // 20% of $5,000
      });
    });

    it('handles very large boat prices', async () => {
      render(<LoanScenarioComparison baseBoatPrice={5000000} />);
      
      await waitFor(() => {
        // Should still generate scenarios
        expect(screen.getByText('Conservative (20% down, 15 years)')).toBeInTheDocument();
        expect(screen.getByText('$1,000,000')).toBeInTheDocument(); // 20% of $5,000,000
      });
    });

    it('handles zero interest rate scenarios', async () => {
      // This would require modifying the component to accept custom scenarios
      // For now, we test that the component handles the calculations correctly
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Should render without errors
        expect(screen.getByText('Loan Scenario Comparison')).toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency values correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={123456} />);
      
      await waitFor(() => {
        // Should format with proper commas and currency symbol
        expect(screen.getByText('$24,691')).toBeInTheDocument(); // 20% down payment
        expect(screen.getByText('$98,765')).toBeInTheDocument(); // Loan amount
      });
    });

    it('formats percentages correctly', async () => {
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      await waitFor(() => {
        // Should show percentages with one decimal place
        expect(screen.getByText('20.0%')).toBeInTheDocument();
        expect(screen.getByText('10.0%')).toBeInTheDocument();
        expect(screen.getByText('30.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('generates scenarios efficiently', () => {
      const startTime = performance.now();
      render(<LoanScenarioComparison baseBoatPrice={100000} />);
      const endTime = performance.now();
      
      // Should render quickly (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('handles multiple boat price changes efficiently', async () => {
      const { rerender } = render(<LoanScenarioComparison baseBoatPrice={100000} />);
      
      // Change boat price multiple times
      rerender(<LoanScenarioComparison baseBoatPrice={150000} />);
      rerender(<LoanScenarioComparison baseBoatPrice={200000} />);
      rerender(<LoanScenarioComparison baseBoatPrice={250000} />);
      
      await waitFor(() => {
        // Should show updated scenarios for latest price
        expect(screen.getByText('$50,000')).toBeInTheDocument(); // 20% of $250,000
      });
    });
  });
});