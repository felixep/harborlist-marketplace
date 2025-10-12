/**
 * @fileoverview User onboarding component with tier-specific feature introduction.
 * 
 * Provides guided onboarding experience with:
 * - Tier-specific feature highlights
 * - Capability introduction and usage guidance
 * - Premium feature showcase and upgrade prompts
 * - Interactive feature walkthrough
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useToast } from '../../contexts/ToastContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  features: OnboardingFeature[];
  ctaText: string;
  ctaAction: () => void;
}

interface OnboardingFeature {
  icon: string;
  title: string;
  description: string;
  available: boolean;
  premium?: boolean;
}

interface OnboardingProps {
  userType: 'individual' | 'dealer';
  plan: string;
  isPremium: boolean;
}

/**
 * User onboarding component with tier-specific feature introduction
 */
export const UserOnboarding: React.FC<OnboardingProps> = ({
  userType,
  plan,
  isPremium
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  /**
   * Get onboarding steps based on user type and plan
   */
  const getOnboardingSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: `Welcome to HarborList${isPremium ? ' Premium' : ''}!`,
        description: `You're all set up as a ${userType === 'dealer' ? 'boat dealer' : 'individual seller'}. Let's explore what you can do.`,
        features: [
          {
            icon: '🚤',
            title: 'Create Listings',
            description: `List your boats with detailed specifications and photos`,
            available: true
          },
          {
            icon: '📊',
            title: 'Track Performance',
            description: 'Monitor views, inquiries, and listing performance',
            available: isPremium,
            premium: !isPremium
          },
          {
            icon: '💬',
            title: 'Manage Inquiries',
            description: 'Respond to buyer questions and manage leads',
            available: true
          },
          {
            icon: '⭐',
            title: 'Build Reputation',
            description: 'Collect reviews and build your seller reputation',
            available: true
          }
        ],
        ctaText: 'Get Started',
        ctaAction: () => setCurrentStep(1)
      }
    ];

    if (userType === 'individual') {
      baseSteps.push({
        id: 'individual-features',
        title: 'Individual Seller Features',
        description: 'Perfect tools for selling your personal watercraft',
        features: [
          {
            icon: '📝',
            title: isPremium ? 'Unlimited Listings' : 'Basic Listings',
            description: isPremium ? 'Create as many listings as you need' : 'Up to 3 active listings',
            available: true
          },
          {
            icon: '📸',
            title: isPremium ? 'Enhanced Photo Gallery' : 'Basic Photos',
            description: isPremium ? 'Up to 20 high-quality photos per listing' : 'Up to 5 photos per listing',
            available: true
          },
          {
            icon: '🎯',
            title: 'Priority Placement',
            description: 'Your listings appear higher in search results',
            available: isPremium,
            premium: !isPremium
          },
          {
            icon: '📈',
            title: 'Advanced Analytics',
            description: 'Detailed insights into listing performance',
            available: isPremium,
            premium: !isPremium
          }
        ],
        ctaText: isPremium ? 'Create Your First Listing' : 'Start with Basic Features',
        ctaAction: () => setCurrentStep(2)
      });
    } else {
      baseSteps.push({
        id: 'dealer-features',
        title: 'Dealer Features',
        description: 'Professional tools for managing your boat inventory',
        features: [
          {
            icon: '🏢',
            title: 'Dealer Badge',
            description: 'Professional dealer badge on all your listings',
            available: isPremium,
            premium: !isPremium
          },
          {
            icon: '📦',
            title: 'Inventory Management',
            description: 'Bulk operations and inventory tracking tools',
            available: isPremium,
            premium: !isPremium
          },
          {
            icon: '🎨',
            title: 'Custom Branding',
            description: 'Add your dealership logo and branding',
            available: isPremium,
            premium: !isPremium
          },
          {
            icon: '👥',
            title: 'Lead Management',
            description: 'Advanced tools for managing customer inquiries',
            available: isPremium,
            premium: !isPremium
          }
        ],
        ctaText: isPremium ? 'Set Up Your Dealership' : 'Explore Dealer Features',
        ctaAction: () => setCurrentStep(2)
      });
    }

    // Add premium upgrade step for basic users
    if (!isPremium) {
      baseSteps.push({
        id: 'premium-upgrade',
        title: 'Unlock Premium Features',
        description: 'Take your boat selling to the next level with premium features',
        features: [
          {
            icon: '🚀',
            title: 'Priority Placement',
            description: 'Get your listings seen first by potential buyers',
            available: false,
            premium: true
          },
          {
            icon: '📊',
            title: 'Advanced Analytics',
            description: 'Detailed insights and performance metrics',
            available: false,
            premium: true
          },
          {
            icon: '⭐',
            title: 'Featured Listings',
            description: userType === 'dealer' ? '20 featured listings per month' : '5 featured listings per month',
            available: false,
            premium: true
          },
          {
            icon: '🎧',
            title: 'Premium Support',
            description: 'Priority customer support and dedicated assistance',
            available: false,
            premium: true
          }
        ],
        ctaText: 'Upgrade to Premium',
        ctaAction: () => navigate('/upgrade')
      });
    }

    // Final step
    baseSteps.push({
      id: 'complete',
      title: 'You\'re Ready to Go!',
      description: 'Your account is set up and ready. Start listing your boats and connecting with buyers.',
      features: [
        {
          icon: '✅',
          title: 'Account Verified',
          description: 'Your account is active and ready to use',
          available: true
        },
        {
          icon: '🎯',
          title: 'Features Unlocked',
          description: `All ${isPremium ? 'premium' : 'basic'} features are available`,
          available: true
        },
        {
          icon: '📚',
          title: 'Resources Available',
          description: 'Access help guides and best practices',
          available: true
        },
        {
          icon: '🤝',
          title: 'Community Access',
          description: 'Join the HarborList seller community',
          available: true
        }
      ],
      ctaText: 'Start Selling',
      ctaAction: () => completeOnboarding()
    });

    return baseSteps;
  };

  const steps = getOnboardingSteps();

  /**
   * Complete onboarding and redirect to dashboard
   */
  const completeOnboarding = () => {
    showSuccess('Welcome to HarborList!', 'Your account is ready. Start creating your first listing!');
    navigate('/create-listing', { replace: true });
  };

  /**
   * Skip onboarding and go to dashboard
   */
  const skipOnboarding = () => {
    navigate('/', { replace: true });
  };

  /**
   * Go to next step
   */
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => [...prev, steps[currentStep].id]);
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Go to previous step
   */
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Render feature card
   */
  const renderFeatureCard = (feature: OnboardingFeature) => (
    <div
      key={feature.title}
      className={`p-4 rounded-lg border-2 ${
        feature.available
          ? 'border-green-200 bg-green-50'
          : feature.premium
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{feature.icon}</div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-gray-900">{feature.title}</h4>
            {feature.available && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Available
              </span>
            )}
            {feature.premium && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
        </div>
      </div>
    </div>
  );

  /**
   * Render progress indicator
   */
  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`w-3 h-3 rounded-full ${
            index === currentStep
              ? 'bg-blue-600'
              : index < currentStep
              ? 'bg-green-500'
              : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="text-4xl">🚤</div>
            <h1 className="text-3xl font-bold text-gray-900">HarborList</h1>
          </div>
          <p className="text-gray-600">
            Welcome, {user?.name}! Let's get you started with your {userType} account.
          </p>
        </div>

        {/* Progress Indicator */}
        {renderProgressIndicator()}

        {/* Current Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentStepData.features.map(renderFeatureCard)}
          </div>

          {/* Premium Upgrade Prompt for Basic Users */}
          {!isPremium && currentStepData.features.some(f => f.premium) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-2xl">⭐</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Unlock Premium Features
                  </h3>
                  <p className="text-gray-600">
                    Get access to all premium features and maximize your selling potential.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Starting at ${userType === 'dealer' ? '99.99' : '29.99'}/month
                </div>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {currentStep > 0 && (
                <button
                  onClick={previousStep}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 font-medium"
                >
                  Previous
                </button>
              )}
              <button
                onClick={skipOnboarding}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                Skip Tour
              </button>
            </div>

            <div className="flex space-x-4">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={currentStepData.ctaAction}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                {currentStepData.ctaText}
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Need help getting started?
          </p>
          <div className="flex items-center justify-center space-x-6">
            <a
              href="/help"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              📚 Help Center
            </a>
            <a
              href="/contact"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              💬 Contact Support
            </a>
            <a
              href="/community"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              👥 Join Community
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Onboarding page wrapper component
 */
export const OnboardingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Get onboarding data from location state
  const onboardingData = location.state as {
    userType: 'individual' | 'dealer';
    plan: string;
    isPremium: boolean;
  } | null;

  // Redirect if no onboarding data or user not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!onboardingData) {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, onboardingData, navigate]);

  if (!onboardingData || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <UserOnboarding
      userType={onboardingData.userType}
      plan={onboardingData.plan}
      isPremium={onboardingData.isPremium}
    />
  );
};