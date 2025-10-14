/**
 * @fileoverview Enhanced registration form component with user type selection and premium membership options.
 * 
 * Provides comprehensive registration interface with:
 * - User type selection (individual/dealer)
 * - Premium membership option presentation
 * - Payment processing integration for premium signups
 * - Tier-specific feature highlights
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { UserTier, EnhancedUser } from '@harborlist/shared-types';

interface PremiumPlan {
  id: string;
  name: string;
  type: 'individual' | 'dealer';
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  popular?: boolean;
}

interface PaymentMethod {
  type: 'card';
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'premium_individual',
    name: 'Premium Individual',
    type: 'individual',
    price: { monthly: 29.99, yearly: 299.99 },
    features: [
      'Unlimited listings',
      'Priority placement in search',
      'Advanced analytics',
      'Premium support',
      'Featured listings (5/month)',
      'Enhanced photo gallery'
    ]
  },
  {
    id: 'premium_dealer',
    name: 'Premium Dealer',
    type: 'dealer',
    price: { monthly: 99.99, yearly: 999.99 },
    features: [
      'Unlimited listings',
      'Priority placement in search',
      'Advanced analytics',
      'Premium support',
      'Featured listings (20/month)',
      'Enhanced photo gallery',
      'Bulk operations',
      'Dealer badge',
      'Inventory management',
      'Lead management',
      'Custom branding'
    ],
    popular: true
  }
];

/**
 * Enhanced registration form with user type selection and premium membership options
 */
export const EnhancedRegisterForm: React.FC = () => {
  const [step, setStep] = useState<'account' | 'userType' | 'premium' | 'payment'>('account');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [userType, setUserType] = useState<'individual' | 'dealer'>('individual');
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    type: 'card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const { register } = useAuth();
  const { showInfo, showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  /**
   * Handles basic account information form submission
   */
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setStep('userType');
  };

  /**
   * Handles user type selection
   */
  const handleUserTypeSubmit = () => {
    setStep('premium');
  };

  /**
   * Handles premium plan selection
   */
  const handlePremiumSubmit = () => {
    if (selectedPlan) {
      setStep('payment');
    } else {
      // Skip premium, proceed with basic registration
      handleBasicRegistration();
    }
  };

  /**
   * Handles basic registration without premium features
   */
  const handleBasicRegistration = async () => {
    setLoading(true);
    try {
      const response = await api.register(formData.name, formData.email, formData.password, userType) as { 
        requiresVerification?: boolean; 
        message: string;
        user: { email: string; name: string } 
      };
      
      if (response.requiresVerification) {
        navigate('/registration-success', { 
          state: { 
            email: formData.email,
            name: formData.name,
            message: response.message,
            userType,
            plan: 'basic'
          },
          replace: true 
        });
      } else {
        await register(formData.name, formData.email, formData.password, userType);
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      handleRegistrationError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles premium registration with payment processing
   */
  const handlePremiumRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, create the basic user account
      const registrationResponse = await api.register(formData.name, formData.email, formData.password, userType) as {
        requiresVerification?: boolean;
        message: string;
        user: { email: string; name: string; id: string };
      };

      // If account creation successful, process premium subscription
      if (selectedPlan) {
        // Create billing account with payment method
        const billingResponse = await fetch('/api/billing/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            plan: selectedPlan.id,
            billingCycle,
            paymentMethod: {
              type: 'card',
              ...paymentMethod
            },
            billingAddress
          })
        });

        if (!billingResponse.ok) {
          throw new Error('Failed to set up billing account');
        }

        // Create subscription
        const subscriptionResponse = await fetch('/api/billing/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            plan: selectedPlan.id,
            billingCycle
          })
        });

        if (!subscriptionResponse.ok) {
          throw new Error('Failed to create subscription');
        }

        showSuccess('Premium Registration Complete', 'Your premium account has been created successfully!');
      }

      if (registrationResponse.requiresVerification) {
        navigate('/registration-success', { 
          state: { 
            email: formData.email,
            name: formData.name,
            message: registrationResponse.message,
            userType,
            plan: selectedPlan?.id || 'basic',
            isPremium: !!selectedPlan
          },
          replace: true 
        });
      } else {
        await register(formData.name, formData.email, formData.password, userType);
        navigate('/onboarding', { 
          state: { 
            userType,
            plan: selectedPlan?.id || 'basic',
            isPremium: !!selectedPlan
          },
          replace: true 
        });
      }
    } catch (error: any) {
      handleRegistrationError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles registration errors with user-friendly messages
   */
  const handleRegistrationError = (error: any) => {
    setErrorCode(error.code || null);
    
    if (error.code === 'USER_EXISTS') {
      setError('An account with this email address already exists.');
      showInfo(
        'Account Already Exists', 
        `An account is already registered with ${formData.email}. You can sign in instead.`,
        { duration: 8000 }
      );
    } else if (error.code === 'WEAK_PASSWORD') {
      setError('Password must contain at least one uppercase letter and one special character.');
    } else if (error.code === 'INVALID_EMAIL') {
      setError('Please enter a valid email address.');
    } else if (error.code === 'PAYMENT_FAILED') {
      setError('Payment processing failed. Please check your payment information and try again.');
    } else if (error.code === 'BILLING_ERROR') {
      setError('There was an issue setting up your billing account. Please try again.');
    } else {
      setError(error.message || 'Registration failed. Please try again.');
    }
  };

  /**
   * Handles form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('payment.')) {
      const field = name.split('.')[1];
      setPaymentMethod(prev => ({ ...prev, [field]: value }));
    } else if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setBillingAddress(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Gets available premium plans for selected user type
   */
  const getAvailablePlans = () => {
    return PREMIUM_PLANS.filter(plan => plan.type === userType);
  };

  /**
   * Calculates plan price based on billing cycle
   */
  const getPlanPrice = (plan: PremiumPlan) => {
    return billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
  };

  /**
   * Renders account information step
   */
  const renderAccountStep = () => (
    <form onSubmit={handleAccountSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
        <p className="text-gray-600 mt-2">Start by providing your basic information</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <div>{error}</div>
          {errorCode === 'USER_EXISTS' && (
            <div className="mt-2">
              <Link 
                to="/login" 
                state={{ from: location.state?.from, email: formData.email }}
                className="font-medium text-red-800 hover:text-red-900 underline"
              >
                Sign in to your existing account instead →
              </Link>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
        {formData.password && (
          <div className="mt-2 text-xs text-gray-600">
            <div className="space-y-1">
              <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{formData.password.length >= 8 ? '✓' : '✗'}</span>
                At least 8 characters
              </div>
              <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{/[A-Z]/.test(formData.password) ? '✓' : '✗'}</span>
                One uppercase letter
              </div>
              <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '✓' : '✗'}</span>
                One special character
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
            formData.confirmPassword && formData.password !== formData.confirmPassword
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          required
        />
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <div className="mt-1 text-sm text-red-600">
            Passwords do not match
          </div>
        )}
        {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
          <div className="mt-1 text-sm text-green-600">
            ✓ Passwords match
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );

  /**
   * Renders user type selection step
   */
  const renderUserTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Account Type</h2>
        <p className="text-gray-600 mt-2">Select the type that best describes how you'll use HarborList</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
            userType === 'individual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setUserType('individual')}
        >
          <div className="flex items-center mb-4">
            <input
              type="radio"
              name="userType"
              value="individual"
              checked={userType === 'individual'}
              onChange={(e) => setUserType(e.target.value as 'individual' | 'dealer')}
              className="mr-3"
            />
            <h3 className="text-lg font-semibold">Individual Seller</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Perfect for boat owners looking to sell their personal watercraft
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• List your personal boats</li>
            <li>• Basic listing features</li>
            <li>• Standard search visibility</li>
            <li>• Community support</li>
          </ul>
        </div>

        <div
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
            userType === 'dealer'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setUserType('dealer')}
        >
          <div className="flex items-center mb-4">
            <input
              type="radio"
              name="userType"
              value="dealer"
              checked={userType === 'dealer'}
              onChange={(e) => setUserType(e.target.value as 'individual' | 'dealer')}
              className="mr-3"
            />
            <h3 className="text-lg font-semibold">Boat Dealer</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Ideal for boat dealers and marine businesses with inventory to manage
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Multiple boat listings</li>
            <li>• Dealer badge and branding</li>
            <li>• Inventory management tools</li>
            <li>• Business-focused features</li>
          </ul>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setStep('account')}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleUserTypeSubmit}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );

  /**
   * Renders premium plan selection step
   */
  const renderPremiumStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="text-gray-600 mt-2">Unlock premium features to maximize your boat selling potential</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500'
            }`}
          >
            Yearly (Save 17%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Plan */}
        <div
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
            selectedPlan === null
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setSelectedPlan(null)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Basic</h3>
            <span className="text-2xl font-bold text-green-600">Free</span>
          </div>
          <p className="text-gray-600 mb-4">Perfect for getting started</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-6">
            <li>• Up to 3 active listings</li>
            <li>• Basic photo gallery (5 photos)</li>
            <li>• Standard search placement</li>
            <li>• Community support</li>
            <li>• Basic listing analytics</li>
          </ul>
          <div className="flex items-center">
            <input
              type="radio"
              name="plan"
              checked={selectedPlan === null}
              onChange={() => setSelectedPlan(null)}
              className="mr-2"
            />
            <span className="text-sm">Select Basic Plan</span>
          </div>
        </div>

        {/* Premium Plans */}
        {getAvailablePlans().map((plan) => (
          <div
            key={plan.id}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all relative ${
              selectedPlan?.id === plan.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="text-right">
                <span className="text-2xl font-bold">${getPlanPrice(plan)}</span>
                <span className="text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {plan.type === 'dealer' ? 'Professional tools for dealers' : 'Enhanced features for individuals'}
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
            <div className="flex items-center">
              <input
                type="radio"
                name="plan"
                checked={selectedPlan?.id === plan.id}
                onChange={() => setSelectedPlan(plan)}
                className="mr-2"
              />
              <span className="text-sm">Select {plan.name}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setStep('userType')}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handlePremiumSubmit}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {selectedPlan ? 'Continue to Payment' : 'Create Basic Account'}
        </button>
      </div>
    </div>
  );

  /**
   * Renders payment information step
   */
  const renderPaymentStep = () => (
    <form onSubmit={handlePremiumRegistration} className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Information</h2>
        <p className="text-gray-600 mt-2">
          Complete your {selectedPlan?.name} subscription
        </p>
        {selectedPlan && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold">
              ${getPlanPrice(selectedPlan)} / {billingCycle === 'yearly' ? 'year' : 'month'}
            </div>
            <div className="text-sm text-gray-600">
              {billingCycle === 'yearly' && 'Save 17% with yearly billing'}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Payment Method */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Method</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
          <input
            type="text"
            name="payment.cardholderName"
            value={paymentMethod.cardholderName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Card Number</label>
          <input
            type="text"
            name="payment.cardNumber"
            value={paymentMethod.cardNumber}
            onChange={handleChange}
            placeholder="1234 5678 9012 3456"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Month</label>
            <select
              name="payment.expiryMonth"
              value={paymentMethod.expiryMonth}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Month</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                  {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Year</label>
            <select
              name="payment.expiryYear"
              value={paymentMethod.expiryYear}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Year</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CVV</label>
            <input
              type="text"
              name="payment.cvv"
              value={paymentMethod.cvv}
              onChange={handleChange}
              placeholder="123"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Billing Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Street Address</label>
          <input
            type="text"
            name="billing.street"
            value={billingAddress.street}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              name="billing.city"
              value={billingAddress.city}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <select
              name="billing.state"
              value={billingAddress.state}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select State</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              {/* Add more states as needed */}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
            <input
              type="text"
              name="billing.zipCode"
              value={billingAddress.zipCode}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <select
              name="billing.country"
              value={billingAddress.country}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setStep('premium')}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Complete Registration - $${selectedPlan ? getPlanPrice(selectedPlan) : 0}`}
        </button>
      </div>
    </form>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (step) {
      case 'account':
        return renderAccountStep();
      case 'userType':
        return renderUserTypeStep();
      case 'premium':
        return renderPremiumStep();
      case 'payment':
        return renderPaymentStep();
      default:
        return renderAccountStep();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Account', 'User Type', 'Plan', 'Payment'].map((stepName, index) => {
            const stepNumber = index + 1;
            const currentStepNumber = ['account', 'userType', 'premium', 'payment'].indexOf(step) + 1;
            const isActive = stepNumber === currentStepNumber;
            const isCompleted = stepNumber < currentStepNumber;
            const isPaymentStep = stepName === 'Payment';
            const showPaymentStep = selectedPlan !== null;

            if (isPaymentStep && !showPaymentStep) {
              return null;
            }

            return (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isActive
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : stepNumber}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {stepName}
                </span>
                {index < 3 && (showPaymentStep || stepName !== 'Payment') && (
                  <div className={`w-12 h-0.5 mx-4 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {renderCurrentStep()}
    </div>
  );
};