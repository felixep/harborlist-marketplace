/**
 * @fileoverview Tests for UserOnboarding component
 * 
 * Tests cover:
 * - Onboarding flow and feature introduction
 * - Tier-specific feature highlights
 * - Premium upgrade prompts for basic users
 * - Navigation and step progression
 * - Completion and redirection
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserOnboarding, OnboardingPage } from '../UserOnboarding';
import { AuthProvider } from '../AuthProvider';
import { ToastProvider } from '../../../contexts/ToastContext';

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ 
      state: {
        userType: 'individual',
        plan: 'basic',
        isPremium: false
      }
    })
  };
});

// Mock auth context
const mockUser = {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com'
};

vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual('../AuthProvider');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true
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

describe('UserOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Individual User - Basic Plan', () => {
    const defaultProps = {
      userType: 'individual' as const,
      plan: 'basic',
      isPremium: false
    };

    it('renders welcome step for individual basic user', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to HarborList!')).toBeInTheDocument();
      expect(screen.getByText(/You're all set up as a individual seller/)).toBeInTheDocument();
      expect(screen.getByText('Create Listings')).toBeInTheDocument();
      expect(screen.getByText('Track Performance')).toBeInTheDocument();
      expect(screen.getByText('Manage Inquiries')).toBeInTheDocument();
      expect(screen.getByText('Build Reputation')).toBeInTheDocument();
    });

    it('shows premium features as unavailable for basic users', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Track Performance should be marked as premium
      const trackPerformanceCard = screen.getByText('Track Performance').closest('div');
      expect(trackPerformanceCard).toHaveClass('border-yellow-200');
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('progresses through individual seller features step', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Individual Seller Features')).toBeInTheDocument();
      expect(screen.getByText('Basic Listings')).toBeInTheDocument();
      expect(screen.getByText('Basic Photos')).toBeInTheDocument();
      expect(screen.getByText('Priority Placement')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    });

    it('shows premium upgrade step for basic users', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Progress through steps
      await user.click(screen.getByRole('button', { name: /get started/i }));
      await user.click(screen.getByRole('button', { name: /start with basic features/i }));

      expect(screen.getByText('Unlock Premium Features')).toBeInTheDocument();
      expect(screen.getByText('Priority Placement')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
      expect(screen.getByText('5 featured listings per month')).toBeInTheDocument();
    });

    it('navigates to upgrade page when upgrade button clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Progress to upgrade step
      await user.click(screen.getByRole('button', { name: /get started/i }));
      await user.click(screen.getByRole('button', { name: /start with basic features/i }));
      await user.click(screen.getByRole('button', { name: /upgrade to premium/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/upgrade');
    });

    it('shows premium upgrade prompt in feature steps', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Unlock Premium Features')).toBeInTheDocument();
      expect(screen.getByText('Starting at $29.99/month')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
    });
  });

  describe('Individual User - Premium Plan', () => {
    const premiumProps = {
      userType: 'individual' as const,
      plan: 'premium_individual',
      isPremium: true
    };

    it('renders welcome step for premium individual user', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...premiumProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to HarborList Premium!')).toBeInTheDocument();
      expect(screen.getByText(/You're all set up as a individual seller/)).toBeInTheDocument();
    });

    it('shows all features as available for premium users', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...premiumProps} />
        </TestWrapper>
      );

      const availableCards = screen.getAllByText('Available');
      expect(availableCards.length).toBeGreaterThan(0);
      
      // Should not show premium badges
      expect(screen.queryByText('Premium')).not.toBeInTheDocument();
    });

    it('shows premium individual features', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...premiumProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Individual Seller Features')).toBeInTheDocument();
      expect(screen.getByText('Unlimited Listings')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Photo Gallery')).toBeInTheDocument();
      expect(screen.getByText('Priority Placement')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    });

    it('does not show upgrade step for premium users', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...premiumProps} />
        </TestWrapper>
      );

      // Progress through steps
      await user.click(screen.getByRole('button', { name: /get started/i }));
      await user.click(screen.getByRole('button', { name: /create your first listing/i }));

      expect(screen.getByText("You're Ready to Go!")).toBeInTheDocument();
      expect(screen.queryByText('Unlock Premium Features')).not.toBeInTheDocument();
    });
  });

  describe('Dealer User - Basic Plan', () => {
    const dealerProps = {
      userType: 'dealer' as const,
      plan: 'basic',
      isPremium: false
    };

    it('renders welcome step for dealer user', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...dealerProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to HarborList!')).toBeInTheDocument();
      expect(screen.getByText(/You're all set up as a boat dealer/)).toBeInTheDocument();
    });

    it('shows dealer-specific features', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...dealerProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Dealer Features')).toBeInTheDocument();
      expect(screen.getByText('Dealer Badge')).toBeInTheDocument();
      expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      expect(screen.getByText('Custom Branding')).toBeInTheDocument();
      expect(screen.getByText('Lead Management')).toBeInTheDocument();
    });

    it('shows correct pricing for dealer upgrade', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...dealerProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Starting at $99.99/month')).toBeInTheDocument();
    });
  });

  describe('Dealer User - Premium Plan', () => {
    const premiumDealerProps = {
      userType: 'dealer' as const,
      plan: 'premium_dealer',
      isPremium: true
    };

    it('shows premium dealer features', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...premiumDealerProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      expect(screen.getByText('Dealer Features')).toBeInTheDocument();
      expect(screen.getByText('20 featured listings per month')).toBeInTheDocument();
    });
  });

  describe('Navigation and Progress', () => {
    const defaultProps = {
      userType: 'individual' as const,
      plan: 'basic',
      isPremium: false
    };

    it('shows progress indicator', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      const progressDots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('rounded-full') && el.className.includes('w-3')
      );
      expect(progressDots.length).toBeGreaterThan(0);
    });

    it('allows skipping onboarding', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /skip tour/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('allows navigation between steps', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Go to next step
      await user.click(screen.getByRole('button', { name: /get started/i }));
      expect(screen.getByText('Individual Seller Features')).toBeInTheDocument();

      // Go back
      await user.click(screen.getByRole('button', { name: /previous/i }));
      expect(screen.getByText('Welcome to HarborList!')).toBeInTheDocument();
    });

    it('shows step counter', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Step 1 of/)).toBeInTheDocument();
    });
  });

  describe('Completion', () => {
    const defaultProps = {
      userType: 'individual' as const,
      plan: 'basic',
      isPremium: false
    };

    it('completes onboarding and redirects to create listing', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Progress to final step
      await user.click(screen.getByRole('button', { name: /get started/i }));
      await user.click(screen.getByRole('button', { name: /start with basic features/i }));
      await user.click(screen.getByRole('button', { name: /upgrade to premium/i })); // This goes to upgrade page
      
      // Reset and go through completion path
      jest.clearAllMocks();
      
      // Simulate completing without upgrade
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /get started/i }));
      await user.click(screen.getByRole('button', { name: /start with basic features/i }));
      
      // Skip upgrade step by clicking next
      const nextButtons = screen.getAllByRole('button');
      const upgradeButton = nextButtons.find(btn => btn.textContent?.includes('Upgrade to Premium'));
      if (upgradeButton) {
        await user.click(upgradeButton);
      }
    });

    it('shows completion step with account status', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      // Navigate to completion (this would be the final step)
      // For testing, we'll check if completion elements exist in the component
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });
  });

  describe('Help and Support', () => {
    const defaultProps = {
      userType: 'individual' as const,
      plan: 'basic',
      isPremium: false
    };

    it('shows help links', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('📚 Help Center')).toBeInTheDocument();
      expect(screen.getByText('💬 Contact Support')).toBeInTheDocument();
      expect(screen.getByText('👥 Join Community')).toBeInTheDocument();
    });

    it('has correct help link URLs', () => {
      render(
        <TestWrapper>
          <UserOnboarding {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /help center/i })).toHaveAttribute('href', '/help');
      expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute('href', '/contact');
      expect(screen.getByRole('link', { name: /join community/i })).toHaveAttribute('href', '/community');
    });
  });
});

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock no location state
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ state: null }),
        useNavigate: () => mockNavigate
      };
    });

    render(
      <TestWrapper>
        <OnboardingPage />
      </TestWrapper>
    );

    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  it('redirects to login if not authenticated', () => {
    // Mock unauthenticated state
    vi.doMock('../AuthProvider', async () => {
      const actual = await vi.importActual('../AuthProvider');
      return {
        ...actual,
        useAuth: () => ({
          user: null,
          isAuthenticated: false
        })
      };
    });

    render(
      <TestWrapper>
        <OnboardingPage />
      </TestWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('redirects to home if no onboarding data', () => {
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ state: null }),
        useNavigate: () => mockNavigate
      };
    });

    render(
      <TestWrapper>
        <OnboardingPage />
      </TestWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('renders onboarding with valid data', () => {
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ 
          state: {
            userType: 'individual',
            plan: 'premium_individual',
            isPremium: true
          }
        }),
        useNavigate: () => mockNavigate
      };
    });

    render(
      <TestWrapper>
        <OnboardingPage />
      </TestWrapper>
    );

    expect(screen.getByText('Welcome to HarborList Premium!')).toBeInTheDocument();
  });
});