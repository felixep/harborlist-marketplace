/**
 * @fileoverview Premium upgrade page for existing users to upgrade their membership.
 * 
 * Provides comprehensive upgrade experience with:
 * - Plan comparison and selection
 * - Payment processing integration
 * - Feature highlights and benefits
 * - Upgrade confirmation and onboarding
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

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
  currentPlan?: boolean;
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
      'Enhanced photo gallery',
      'Finance calculator integration',
      'Listing performance insights'
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
      'Custom branding',
      'Finance calculator integration',
      'Advanced reporting'
    ],
    popular: true
  }
];

/**
 * Premium upgrade page component
 */
export const PremiumUpgrade: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPayment, setShowPayment] = useState(false);
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

  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  /**
   * Handles plan selection
   */
  const handlePlanSelect = (plan: PremiumPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
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
    }
  };

  /**
   * Handles premium upgrade submission
   */
  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setError('');
    setLoading(true);

    try {
      // Create billing account with payment method
      await api.createBillingAccount({
        plan: selectedPlan.id,
        billingCycle,
        paymentMethod: {
          type: 'card',
          ...paymentMethod
        },
        billingAddress
      });

      // Create subscription
      await api.createSubscription({
        plan: selectedPlan.id,
        billingCycle
      });

      showSuccess('Upgrade Successful!', 'Your premium membership is now active. Enjoy your new features!');
      navigate('/profile', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Upgrade failed. Please try again.');
      showError('Upgrade Failed', error.message || 'There was an issue processing your upgrade.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculates plan price based on billing cycle
   */
  const getPlanPrice = (plan: PremiumPlan) => {
    return billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
  };

  /**
   * Calculates savings for yearly billing
   */
  const getYearlySavings = (plan: PremiumPlan) => {
    const monthlyTotal = plan.price.monthly * 12;
    const yearlySavings = monthlyTotal - plan.price.yearly;
    return Math.round(yearlySavings);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to upgrade your account.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlock powerful features to maximize your boat selling potential and reach more buyers
          </p>
        </div>

        {!showPayment ? (
          <>
            {/* Billing Cycle Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Yearly
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {PREMIUM_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden relative ${
                    plan.popular ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        ${getPlanPrice(plan)}
                        <span className="text-lg font-normal text-gray-500">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 font-medium">
                          Save ${getYearlySavings(plan)} per year
                        </div>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="ml-3 text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanSelect(plan)}
                      className={`w-full py-3 px-6 rounded-md font-medium transition-all ${
                        plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Choose {plan.name}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Comparison */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Compare Features
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4">Feature</th>
                      <th className="text-center py-4 px-4">Basic</th>
                      <th className="text-center py-4 px-4">Premium Individual</th>
                      <th className="text-center py-4 px-4">Premium Dealer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-4 px-4 font-medium">Active Listings</td>
                      <td className="py-4 px-4 text-center">3</td>
                      <td className="py-4 px-4 text-center">Unlimited</td>
                      <td className="py-4 px-4 text-center">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Photos per Listing</td>
                      <td className="py-4 px-4 text-center">5</td>
                      <td className="py-4 px-4 text-center">20</td>
                      <td className="py-4 px-4 text-center">20</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Priority Placement</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">✅</td>
                      <td className="py-4 px-4 text-center">✅</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Featured Listings</td>
                      <td className="py-4 px-4 text-center">0</td>
                      <td className="py-4 px-4 text-center">5/month</td>
                      <td className="py-4 px-4 text-center">20/month</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Advanced Analytics</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">✅</td>
                      <td className="py-4 px-4 text-center">✅</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Dealer Badge</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">✅</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium">Bulk Operations</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">❌</td>
                      <td className="py-4 px-4 text-center">✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Payment Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Complete Your Upgrade
                </h2>
                <p className="text-gray-600">
                  Upgrading to {selectedPlan?.name}
                </p>
                {selectedPlan && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      ${getPlanPrice(selectedPlan)} / {billingCycle === 'yearly' ? 'year' : 'month'}
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="text-sm text-green-600">
                        Save ${getYearlySavings(selectedPlan)} per year
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpgrade} className="space-y-6">
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
                    onClick={() => setShowPayment(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300 font-medium"
                  >
                    Back to Plans
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Processing...' : `Upgrade Now - $${selectedPlan ? getPlanPrice(selectedPlan) : 0}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🔒 Your payment information is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
};