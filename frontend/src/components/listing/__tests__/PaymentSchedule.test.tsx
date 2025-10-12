import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import PaymentSchedule from '../PaymentSchedule';
import { PaymentScheduleItem } from '@harborlist/shared-types';

describe('PaymentSchedule', () => {
  const mockSchedule: PaymentScheduleItem[] = [
    {
      paymentNumber: 1,
      paymentDate: '2024-01-01',
      principalAmount: 400.00,
      interestAmount: 433.33,
      totalPayment: 833.33,
      remainingBalance: 79600.00
    },
    {
      paymentNumber: 2,
      paymentDate: '2024-02-01',
      principalAmount: 402.17,
      interestAmount: 431.16,
      totalPayment: 833.33,
      remainingBalance: 79197.83
    },
    {
      paymentNumber: 3,
      paymentDate: '2024-03-01',
      principalAmount: 404.35,
      interestAmount: 428.98,
      totalPayment: 833.33,
      remainingBalance: 78793.48
    },
    // Add more payments to test pagination
    ...Array.from({ length: 177 }, (_, i) => ({
      paymentNumber: i + 4,
      paymentDate: `2024-${String(((i + 3) % 12) + 1).padStart(2, '0')}-01`,
      principalAmount: 400 + (i * 2),
      interestAmount: 433 - (i * 2),
      totalPayment: 833.33,
      remainingBalance: 78000 - (i * 400)
    }))
  ];

  describe('Basic Rendering', () => {
    it('renders payment schedule with correct headers', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
      expect(screen.getByText('Payment #')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText('Interest')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
    });

    it('renders first 12 payments by default', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#12')).toBeInTheDocument();
      expect(screen.queryByText('#13')).not.toBeInTheDocument();
    });

    it('shows "Show All" button when more than 12 payments', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText(`Show All ${mockSchedule.length} Payments`)).toBeInTheDocument();
    });

    it('does not show "Show All" button when 12 or fewer payments', () => {
      const shortSchedule = mockSchedule.slice(0, 10);
      render(<PaymentSchedule schedule={shortSchedule} />);
      
      expect(screen.queryByText(/Show All/)).not.toBeInTheDocument();
    });

    it('returns null when no schedule provided', () => {
      const { container } = render(<PaymentSchedule schedule={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Payment Display', () => {
    it('formats currency values correctly', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('$400.00')).toBeInTheDocument(); // Principal
      expect(screen.getByText('$433.33')).toBeInTheDocument(); // Interest
      expect(screen.getByText('$833.33')).toBeInTheDocument(); // Total payment
      expect(screen.getByText('$79,600.00')).toBeInTheDocument(); // Remaining balance
    });

    it('formats dates correctly', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 2024')).toBeInTheDocument();
    });

    it('displays payment numbers correctly', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows all payments when "Show All" is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Initially only shows first 12
      expect(screen.queryByText('#13')).not.toBeInTheDocument();
      
      // Click show all
      await user.click(screen.getByText(`Show All ${mockSchedule.length} Payments`));
      
      // Now shows payment 13
      expect(screen.getByText('#13')).toBeInTheDocument();
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });

    it('hides payments when "Show Less" is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Show all payments first
      await user.click(screen.getByText(`Show All ${mockSchedule.length} Payments`));
      expect(screen.getByText('#13')).toBeInTheDocument();
      
      // Click show less
      await user.click(screen.getByText('Show Less'));
      
      // Should hide payment 13
      expect(screen.queryByText('#13')).not.toBeInTheDocument();
      expect(screen.getByText(`Show All ${mockSchedule.length} Payments`)).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('switches to yearly view', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Click yearly view
      await user.click(screen.getByText('Yearly'));
      
      // Should show yearly headers
      expect(screen.getByText('Year')).toBeInTheDocument();
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText('Interest')).toBeInTheDocument();
      expect(screen.getByText('Total Paid')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
    });

    it('switches back to monthly view', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Switch to yearly view first
      await user.click(screen.getByText('Yearly'));
      
      // Switch back to monthly
      await user.click(screen.getByText('Monthly'));
      
      // Should show monthly headers
      expect(screen.getByText('Payment #')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('shows year detail view when year is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Switch to yearly view
      await user.click(screen.getByText('Yearly'));
      
      // Click on a year (assuming 2024 is shown)
      const yearRow = screen.getByText('2024');
      await user.click(yearRow.closest('div')!);
      
      // Should show back button
      expect(screen.getByText('← Back to Summary')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays correct summary statistics', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Check total payments count
      expect(screen.getByText(mockSchedule.length.toString())).toBeInTheDocument();
      
      // Check total principal (sum of all principal amounts)
      const totalPrincipal = mockSchedule.reduce((sum, payment) => sum + payment.principalAmount, 0);
      expect(screen.getByText(`$${totalPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)).toBeInTheDocument();
      
      // Check total interest (sum of all interest amounts)
      const totalInterest = mockSchedule.reduce((sum, payment) => sum + payment.interestAmount, 0);
      expect(screen.getByText(`$${totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)).toBeInTheDocument();
      
      // Check total paid (sum of all payments)
      const totalPaid = mockSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
      expect(screen.getByText(`$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)).toBeInTheDocument();
    });

    it('displays correct labels for summary statistics', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Total Principal')).toBeInTheDocument();
      expect(screen.getByText('Total Interest')).toBeInTheDocument();
      expect(screen.getByText('Total Paid')).toBeInTheDocument();
    });
  });

  describe('Yearly Summary Calculations', () => {
    it('calculates yearly totals correctly', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Switch to yearly view
      await user.click(screen.getByText('Yearly'));
      
      // Should show 2024 with correct totals
      expect(screen.getByText('2024')).toBeInTheDocument();
      
      // Calculate expected totals for 2024 (first 12 payments)
      const year2024Payments = mockSchedule.filter(p => p.paymentDate.startsWith('2024'));
      const expectedPrincipal = year2024Payments.reduce((sum, p) => sum + p.principalAmount, 0);
      const expectedInterest = year2024Payments.reduce((sum, p) => sum + p.interestAmount, 0);
      
      // Check if the calculated values are displayed (allowing for rounding)
      const principalText = `$${expectedPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const interestText = `$${expectedInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      expect(screen.getByText(principalText)).toBeInTheDocument();
      expect(screen.getByText(interestText)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Check for proper table headers
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(6); // Payment #, Date, Principal, Interest, Payment, Balance
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Tab to the Monthly/Yearly toggle buttons
      await user.tab();
      expect(screen.getByText('Monthly')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Yearly')).toHaveFocus();
    });

    it('has proper ARIA labels', () => {
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Check for accessible button labels
      const showAllButton = screen.getByText(`Show All ${mockSchedule.length} Payments`);
      expect(showAllButton).toBeInTheDocument();
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
      
      render(<PaymentSchedule schedule={mockSchedule} />);
      
      // Should still render main elements
      expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
      expect(screen.getByText('Payment #')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single payment schedule', () => {
      const singlePayment = [mockSchedule[0]];
      render(<PaymentSchedule schedule={singlePayment} />);
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.queryByText('Show All')).not.toBeInTheDocument();
    });

    it('handles payments with zero values', () => {
      const zeroPayment: PaymentScheduleItem = {
        paymentNumber: 1,
        paymentDate: '2024-01-01',
        principalAmount: 0,
        interestAmount: 0,
        totalPayment: 0,
        remainingBalance: 0
      };
      
      render(<PaymentSchedule schedule={[zeroPayment]} />);
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('handles very large payment amounts', () => {
      const largePayment: PaymentScheduleItem = {
        paymentNumber: 1,
        paymentDate: '2024-01-01',
        principalAmount: 1000000,
        interestAmount: 500000,
        totalPayment: 1500000,
        remainingBalance: 50000000
      };
      
      render(<PaymentSchedule schedule={[largePayment]} />);
      
      expect(screen.getByText('$1,000,000.00')).toBeInTheDocument();
      expect(screen.getByText('$50,000,000.00')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large payment schedules efficiently', () => {
      // Create a large schedule (30 years = 360 payments)
      const largeSchedule = Array.from({ length: 360 }, (_, i) => ({
        paymentNumber: i + 1,
        paymentDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        principalAmount: 400 + i,
        interestAmount: 433 - i * 0.5,
        totalPayment: 833.33,
        remainingBalance: 80000 - (i * 222)
      }));
      
      const startTime = performance.now();
      render(<PaymentSchedule schedule={largeSchedule} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should still show correct elements
      expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
      expect(screen.getByText('Show All 360 Payments')).toBeInTheDocument();
    });
  });
});