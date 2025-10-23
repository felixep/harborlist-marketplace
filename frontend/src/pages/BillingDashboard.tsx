/**
 * @fileoverview User billing dashboard for managing subscriptions and payment methods
 * 
 * Features:
 * - Current subscription overview
 * - Payment method management
 * - Transaction history
 * - Plan change options
 * - Billing address management
 * 
 * @author HarborList Development Team
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../contexts/ToastContext';
import { billingApi } from '../services/billingApi';
import { BillingAccount, Transaction } from '@harborlist/shared-types';

interface PaymentMethod {
  id: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface BillingDashboardState {
  billingAccount: BillingAccount | null;
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const BillingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [state, setState] = useState<BillingDashboardState>({
    billingAccount: null,
    paymentMethods: [],
    transactions: [],
    loading: true,
    error: null,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'payment-methods' | 'transactions' | 'settings'>('overview');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    if (!user) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [billingResponse, paymentMethodsResponse, transactionsResponse] = await Promise.all([
        billingApi.getBillingAccount(user.userId).catch(() => ({ billingAccount: null })),
        billingApi.getPaymentMethods().catch(() => ({ paymentMethods: [] })),
        billingApi.getTransactionHistory({ limit: 10 }).catch(() => ({ transactions: [], total: 0 })),
      ]);

      setState(prev => ({
        ...prev,
        billingAccount: billingResponse.billingAccount,
        paymentMethods: paymentMethodsResponse.paymentMethods || [],
        transactions: transactionsResponse.transactions || [],
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load billing data',
        loading: false,
      }));
    }
  };

  const handleCancelSubscription = async () => {
    if (!state.billingAccount) return;

    try {
      await billingApi.cancelBillingAccount(state.billingAccount.billingId);
      showSuccess('Subscription Canceled', 'Your subscription has been canceled successfully.');
      setShowCancelModal(false);
      loadBillingData();
    } catch (error: any) {
      showError('Cancellation Failed', error.message || 'Failed to cancel subscription');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600">You need to be signed in to view your billing information.</p>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscriptions</h1>
          <p className="text-gray-600 mt-2">Manage your subscription, payment methods, and billing history</p>
        </div>

        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {state.error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'payment-methods', label: 'Payment Methods', icon: '💳' },
              { id: 'transactions', label: 'Transaction History', icon: '📋' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Subscription */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
              
              {state.billingAccount ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan:</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {state.billingAccount.plan.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(state.billingAccount.amount, state.billingAccount.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(state.billingAccount.status)}`}>
                          {state.billingAccount.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Billing:</span>
                        <span className="font-medium text-gray-900">
                          {state.billingAccount.nextBillingDate 
                            ? formatDate(state.billingAccount.nextBillingDate)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPlanChangeModal(true)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Change Plan
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💳</div>
                  <p className="text-gray-500 mb-4">No active subscription</p>
                  <button className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors">
                    Upgrade to Premium
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Spent</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(
                        state.transactions
                          .filter(t => t.type === 'payment' && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Transactions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {state.transactions.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">💳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Payment Methods</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {state.paymentMethods.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payment-methods' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
              <button className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                Add Payment Method
              </button>
            </div>
            
            {state.paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {state.paymentMethods.map((method) => (
                  <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">💳</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            **** **** **** {method.last4}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {method.expMonth}/{method.expYear}
                          </p>
                        </div>
                        {method.isDefault && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">💳</div>
                <p className="text-gray-500 mb-4">No payment methods added</p>
                <button className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors">
                  Add Your First Payment Method
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
            </div>
            
            {state.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {state.transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {transaction.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-gray-500">No transactions found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing Settings</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                {state.billingAccount?.billingAddress ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">
                      {state.billingAccount.billingAddress.street}<br />
                      {state.billingAccount.billingAddress.city}, {state.billingAccount.billingAddress.state} {state.billingAccount.billingAddress.zipCode}<br />
                      {state.billingAccount.billingAddress.country}
                    </p>
                    <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                      Update Address
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500">No billing address on file</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Billing notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Payment receipts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Promotional emails</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;