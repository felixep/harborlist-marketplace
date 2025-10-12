/**
 * @fileoverview Tests for EnhancedRegisterForm component
 * 
 * Tests cover:
 * - Registration form validation and submission
 * - User type selection functionality
 * - Premium membership signup and payment processing
 * - Multi-step form navigation
 * - Error handling and user feedback
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EnhancedRegisterForm } from '../EnhancedRegisterForm';
import { AuthProvider } from '../AuthProvider';
import { ToastProvider } from '../../../contexts/ToastContext';
import { api } from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  api: {
    register: vi.fn(),
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
    useLocation: () => ({ state: null })
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

describe('EnhancedRegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Account Information Step', () => {
    it('renders account information form initially', () => {
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Test weak password
      await user.type(passwordInput, 'weak');
      expect(screen.getByText('At least 8 characters')).toHaveClass('text-red-600');
      expect(screen.getByText('One uppercase letter')).toHaveClass('text-red-600');
      expect(screen.getByText('One special character')).toHaveClass('text-red-600');

      // Test strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPass123!');
      expect(screen.getByText('At least 8 characters')).toHaveClass('text-green-600');
      expect(screen.getByText('One uppercase letter')).toHaveClass('text-green-600');
      expect(screen.getByText('One special character')).toHaveClass('text-green-600');
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmPasswordInput, 'DifferentPass123!');
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, 'StrongPass123!');
      
      expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
    });

    it('prevents submission with mismatched passwords', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
      
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(screen.getByText('Create Your Account')).toBeInTheDocument(); // Still on first step
    });

    it('proceeds to user type selection with valid data', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByText('Choose Your Account Type')).toBeInTheDocument();
    });
  });

  describe('User Type Selection Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      // Fill out account information and proceed
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
    });

    it('renders user type selection options', () => {
      expect(screen.getByText('Choose Your Account Type')).toBeInTheDocument();
      expect(screen.getByText('Individual Seller')).toBeInTheDocument();
      expect(screen.getByText('Boat Dealer')).toBeInTheDocument();
    });

    it('allows user type selection', async () => {
      const user = userEvent.setup();
      
      // Individual should be selected by default
      expect(screen.getByDisplayValue('individual')).toBeChecked();
      
      // Select dealer
      await user.click(screen.getByText('Boat Dealer'));
      expect(screen.getByDisplayValue('dealer')).toBeChecked();
    });

    it('allows navigation back to account step', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    });

    it('proceeds to premium plan selection', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    });
  });

  describe('Premium Plan Selection Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      // Navigate to premium step
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
    });

    it('renders plan selection options', () => {
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Premium Individual')).toBeInTheDocument();
    });

    it('shows billing cycle toggle', () => {
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Yearly (Save 17%)')).toBeInTheDocument();
    });

    it('updates pricing when billing cycle changes', async () => {
      const user = userEvent.setup();
      
      // Should show monthly pricing initially
      expect(screen.getByText('$29.99')).toBeInTheDocument();
      
      // Switch to yearly
      await user.click(screen.getByText('Yearly (Save 17%)'));
      
      expect(screen.getByText('$299.99')).toBeInTheDocument();
    });

    it('allows basic account creation without payment', async () => {
      const user = userEvent.setup();
      vi.mocked(api.register).mockResolvedValue({
        requiresVerification: true,
        message: 'Please verify your email',
        user: { email: 'john@example.com', name: 'John Doe' }
      });
      
      // Basic plan should be selected by default
      await user.click(screen.getByRole('button', { name: /create basic account/i }));
      
      await waitFor(() => {
        expect(api.register).toHaveBeenCalledWith('John Doe', 'john@example.com', 'StrongPass123!');
        expect(mockNavigate).toHaveBeenCalledWith('/registration-success', expect.any(Object));
      });
    });

    it('proceeds to payment for premium plans', async () => {
      const user = userEvent.setup();
      
      // Select premium plan
      await user.click(screen.getByText('Premium Individual'));
      await user.click(screen.getByRole('button', { name: /continue to payment/i }));
      
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });
  });

  describe('Payment Processing Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      // Navigate to payment step
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByText('Premium Individual'));
      await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    });

    it('renders payment form', () => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
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

    it('processes premium registration with payment', async () => {
      const user = userEvent.setup();
      
      // Mock successful API calls
      vi.mocked(api.register).mockResolvedValue({
        requiresVerification: true,
        message: 'Please verify your email',
        user: { email: 'john@example.com', name: 'John Doe', id: 'user123' }
      });
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
      
      await user.click(screen.getByRole('button', { name: /complete registration/i }));
      
      await waitFor(() => {
        expect(api.register).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/registration-success', expect.any(Object));
      });
    });

    it('handles payment processing errors', async () => {
      const user = userEvent.setup();
      
      // Mock registration success but billing failure
      vi.mocked(api.register).mockResolvedValue({
        requiresVerification: false,
        message: 'Account created',
        user: { email: 'john@example.com', name: 'John Doe', id: 'user123' }
      });
      vi.mocked(api.createBillingAccount).mockRejectedValue({
        code: 'PAYMENT_FAILED',
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
      
      await user.click(screen.getByRole('button', { name: /complete registration/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/payment processing failed/i)).toBeInTheDocument();
      });
    });

    it('allows navigation back to plan selection', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('shows correct progress through steps', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      // Should show 4 steps initially (Account, User Type, Plan, Payment)
      const progressDots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('rounded-full') && el.className.includes('w-8')
      );
      
      // Navigate through steps and verify progress
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      // Should be on step 2 now
      expect(screen.getByText('Choose Your Account Type')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles existing user error', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      vi.mocked(api.register).mockRejectedValue({
        code: 'USER_EXISTS',
        message: 'User already exists'
      });

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /create basic account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an account with this email address already exists/i)).toBeInTheDocument();
        expect(screen.getByText(/sign in to your existing account instead/i)).toBeInTheDocument();
      });
    });

    it('handles weak password error', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      vi.mocked(api.register).mockRejectedValue({
        code: 'WEAK_PASSWORD',
        message: 'Password too weak'
      });

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /create basic account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one uppercase letter and one special character/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EnhancedRegisterForm />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      
      nameInput.focus();
      expect(nameInput).toHaveFocus();
      
      await user.tab();
      expect(emailInput).toHaveFocus();
    });
  });
});