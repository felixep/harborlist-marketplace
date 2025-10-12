/**
 * @fileoverview Tests for PremiumUpgrade page component
 * 
 * Tests cover:
 * - Plan comparison and selection
 * - Payment processing integration
 * - Feature highlights and benefits
 * - Upgrade confirmation and error handling
 * - Billing cycle changes and pricing updates
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PremiumUpgrade } from '../PremiumUpgrade';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { ToastProvider } from '../../contexts/ToastContext';
import { api } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  api: {
    createBillingAccount: vi.fn(),
    createSubscription: vi.fn(),
  }
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth context
const mockUser = {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com'
};

vi.mock('../../components/auth/AuthProvider', async () => {
  const actual = await vi.importActual('../../components/auth/AuthProvider');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser
    })
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

describe('PremiumUpgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plan Selection', () => {
    it('renders upgrade page with plan options', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
      expect(screen.getByText('Premium Individual')).toBeInTheDocument();
      expect(screen.getByText('Premium Dealer')).toBeInTheDocument();
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('shows monthly pricing by default', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      expect(screen.getByText('$29.99')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getAllByText('/month')).toHaveLength(2);
    });

    it('updates pricing when switching to yearly billing', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      await user.click(screen.getByText('Yearly'));

      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText('$999.99')).toBeInTheDocument();
      expect(screen.getAllByText('/year')).toHaveLength(2);
    });

    it('shows savings for yearly billing', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      await user.click(screen.getByText('Yearly'));

      expect(screen.getByText('Save $60 per year')).toBeInTheDocument(); // Individual plan savings
      expect(screen.getByText('Save $200 per year')).toBeInTheDocument(); // Dealer plan savings
    });

    it('displays plan features correctly', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      // Individual plan features
      expect(screen.getByText('Unlimited listings')).toBeInTheDocument();
      expect(screen.getByText('Priority placement in search')).toBeInTheDocument();
      expect(screen.getByText('Advanced analytics')).toBeInTheDocument();
      expect(screen.getByText('Featured listings (5/month)')).toBeInTheDocument();

      // Dealer-specific features
      expect(screen.getByText('Bulk operations')).toBeInTheDocument();
      expect(screen.getByText('Dealer badge')).toBeInTheDocument();
      expect(screen.getByText('Inventory management')).toBeInTheDocument();
      expect(screen.getByText('Featured listings (20/month)')).toBeInTheDocument();
    });

    it('proceeds to payment when plan is selected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      await user.click(screen.getByText('Choose Premium Individual'));

      expect(screen.getByText('Complete Your Upgrade')).toBeInTheDocument();
      expect(screen.getByText('Upgrading to Premium Individual')).toBeInTheDocument();
    });
  });

  describe('Feature Comparison Table', () => {
    it('renders feature comparison table', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      expect(screen.getByText('Compare Features')).toBeInTheDocument();
      expect(screen.getByText('Active Listings')).toBeInTheDocument();
      expect(screen.getByText('Photos per Listing')).toBeInTheDocument();
      expect(screen.getByText('Priority Placement')).toBeInTheDocument();
      expect(screen.getByText('Featured Listings')).toBeInTheDocument();
    });

    it('shows correct feature availability', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      // Basic plan limitations
      expect(screen.getByText('3')).toBeInTheDocument(); // Basic listings limit
      expect(screen.getByText('5')).toBeInTheDocument(); // Basic photos limit
      
      // Premium features
      expect(screen.getAllByText('Unlimited')).toHaveLength(4); // 2 plans × 2 unlimited features
      expect(screen.getAllByText('✅')).toHaveLength(8); // Premium checkmarks
      expect(screen.getAllByText('❌')).toHaveLength(6); // Basic plan missing features
    });
  });

  describe('Payment Processing', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      // Navigate to payment step
      await user.click(screen.getByText('Choose Premium Individual'));
    });

    it('renders payment form', () => {
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
    });

    it('renders billing address form', () => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    });

    it('shows selected plan pricing', () => {
      expect(screen.getByText('$29.99 / month')).toBeInTheDocument();
    });

    it('processes successful upgrade', async () => {
      const user = userEvent.setup();
      
      // Mock successful API calls
      vi.mocked(api.createBillingAccount).mockResolvedValue({ success: true });
      vi.mocked(api.createSubscription).mockResolvedValue({ success: true });

      // Fill out payment form
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      
      // Fill out billing address
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Anytown');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      
      await user.click(screen.getByRole('button', { name: /upgrade now/i }));
      
      await waitFor(() => {
        expect(api.createBillingAccount).toHaveBeenCalledWith({
          plan: 'premium_individual',
          billingCycle: 'monthly',
          paymentMethod: {
            type: 'card',
            cardholderName: 'John Doe',
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          },
          billingAddress: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            country: 'US'
          }
        });
        
        expect(api.createSubscription).toHaveBeenCalledWith({
          plan: 'premium_individual',
          billingCycle: 'monthly'
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });
      });
    });

    it('handles billing account creation failure', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.createBillingAccount).mockRejectedValue({
        message: 'Payment processing failed'
      });

      // Fill out forms
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Anytown');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      
      await user.click(screen.getByRole('button', { name: /upgrade now/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
      });
    });

    it('handles subscription creation failure', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.createBillingAccount).mockResolvedValue({ success: true });
      vi.mocked(api.createSubscription).mockRejectedValue({
        message: 'Subscription creation failed'
      });

      // Fill out forms and submit
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Anytown');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      
      await user.click(screen.getByRole('button', { name: /upgrade now/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Subscription creation failed')).toBeInTheDocument();
      });
    });

    it('shows loading state during processing', async () => {
      const user = userEvent.setup();
      
      // Mock delayed API response
      vi.mocked(api.createBillingAccount).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      vi.mocked(api.createSubscription).mockResolvedValue({ success: true });

      // Fill out forms
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Anytown');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      
      await user.click(screen.getByRole('button', { name: /upgrade now/i }));
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });

    it('allows navigation back to plan selection', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('button', { name: /back to plans/i }));
      
      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
      expect(screen.getByText('Premium Individual')).toBeInTheDocument();
    });
  });

  describe('Billing Cycle Integration', () => {
    it('updates payment form pricing when billing cycle changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      // Switch to yearly billing
      await user.click(screen.getByText('Yearly'));
      
      // Select plan
      await user.click(screen.getByText('Choose Premium Individual'));
      
      expect(screen.getByText('$299.99 / year')).toBeInTheDocument();
      expect(screen.getByText('Save $60 per year')).toBeInTheDocument();
    });

    it('sends correct billing cycle to API', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      vi.mocked(api.createBillingAccount).mockResolvedValue({ success: true });
      vi.mocked(api.createSubscription).mockResolvedValue({ success: true });

      // Switch to yearly and select plan
      await user.click(screen.getByText('Yearly'));
      await user.click(screen.getByText('Choose Premium Individual'));
      
      // Fill out forms and submit
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
      await user.selectOptions(screen.getByLabelText(/expiry month/i), '12');
      await user.selectOptions(screen.getByLabelText(/expiry year/i), '2025');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Anytown');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      
      await user.click(screen.getByRole('button', { name: /upgrade now/i }));
      
      await waitFor(() => {
        expect(api.createBillingAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            billingCycle: 'yearly'
          })
        );
        
        expect(api.createSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            billingCycle: 'yearly'
          })
        );
      });
    });
  });

  describe('User Authentication', () => {
    it('shows sign in prompt for unauthenticated users', () => {
      // Mock no user
      vi.doMock('../../components/auth/AuthProvider', async () => {
        const actual = await vi.importActual('../../components/auth/AuthProvider');
        return {
          ...actual,
          useAuth: () => ({
            user: null
          })
        };
      });

      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      expect(screen.getByText('Please Sign In')).toBeInTheDocument();
      expect(screen.getByText('You need to be signed in to upgrade your account.')).toBeInTheDocument();
    });

    it('navigates to login when sign in button clicked', async () => {
      const user = userEvent.setup();
      
      // Mock no user
      vi.doMock('../../components/auth/AuthProvider', async () => {
        const actual = await vi.importActual('../../components/auth/AuthProvider');
        return {
          ...actual,
          useAuth: () => ({
            user: null
          })
        };
      });

      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Security and Trust', () => {
    it('shows security notice', () => {
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      expect(screen.getByText('🔒 Your payment information is secure and encrypted')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      await user.click(screen.getByText('Choose Premium Individual'));

      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PremiumUpgrade />
        </TestWrapper>
      );

      const monthlyButton = screen.getByText('Monthly');
      const yearlyButton = screen.getByText('Yearly');
      
      monthlyButton.focus();
      expect(monthlyButton).toHaveFocus();
      
      await user.tab();
      expect(yearlyButton).toHaveFocus();
    });
  });
});