import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { 
  Transaction, 
  FinancialSummary, 
  DisputedTransaction, 
  BillingAccount,
  FinancialReport,
  DateRange 
} from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';

interface BillingFilters {
  search: string;
  status: string;
  type: string;
  dateRange: DateRange;
  amountRange: { min: string; max: string };
}

interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
}

// Mock data for development
const mockDisputes = [
  {
    id: 'disp_001',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    amount: 29999,
    disputeReason: 'Unauthorized charge',
    disputeStatus: 'pending',
    disputeDate: '2024-01-15T10:30:00Z',
  },
  {
    id: 'disp_002',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    amount: 9999,
    disputeReason: 'Service not received',
    disputeStatus: 'investigating',
    disputeDate: '2024-01-14T14:20:00Z',
  },
];

const FinancialManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'billing' | 'disputes' | 'reports'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data state
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [billingAccounts, setBillingAccounts] = useState<BillingAccount[]>([]);
  const [disputes, setDisputes] = useState<DisputedTransaction[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<BillingFilters>({
    search: '',
    status: 'all',
    type: 'all',
    dateRange: { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    amountRange: { min: '', max: '' }
  });
  
  // Modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundRequest, setRefundRequest] = useState<RefundRequest>({
    transactionId: '',
    amount: 0,
    reason: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'billing') {
      loadBillingAccounts();
    } else if (activeTab === 'disputes') {
      loadDisputes();
    } else if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, filters]);

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      const summary = await adminApi.getFinancialSummary(filters.dateRange);
      setFinancialSummary(summary);
    } catch (error) {
      showError('Error', 'Failed to load financial summary');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getTransactions({
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      });
      setTransactions(response.transactions || []);
    } catch (error) {
      showError('Error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBillingAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getBillingAccounts({
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      });
      setBillingAccounts(response.accounts || []);
    } catch (error) {
      showError('Error', 'Failed to load billing accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getDisputedTransactions({
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      });
      setDisputes(response.disputes || []);
    } catch (error) {
      showError('Error', 'Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getFinancialReports();
      setReports(response.reports || []);
    } catch (error) {
      showError('Error', 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction || !refundRequest.reason) {
      showWarning('Warning', 'Please provide a refund reason');
      return;
    }

    setIsLoading(true);
    try {
      await adminApi.processRefund(
        selectedTransaction.transactionId,
        refundRequest.amount,
        refundRequest.reason
      );
      showSuccess('Success', 'Refund processed successfully');
      setShowRefundModal(false);
      loadTransactions();
    } catch (error) {
      showError('Error', 'Failed to process refund');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisputeUpdate = async (disputeId: string, status: string, notes?: string) => {
    setIsLoading(true);
    try {
      await adminApi.updateDisputeStatus(disputeId, status, notes);
      showSuccess('Success', 'Dispute status updated');
      loadDisputes();
    } catch (error) {
      showError('Error', 'Failed to update dispute status');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    setIsLoading(true);
    try {
      const reportData = {
        type: reportType,
        dateRange: filters.dateRange,
        format: 'pdf'
      };
      await adminApi.generateFinancialReport(reportData);
      showSuccess('Success', 'Report generation started. You will be notified when ready.');
      loadReports();
    } catch (error) {
      showError('Error', 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? formatCurrency(financialSummary.totalRevenue) : '--'}
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
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? financialSummary.totalTransactions.toLocaleString() : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disputed Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? financialSummary.disputedTransactions : '--'}
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
              <p className="text-sm font-medium text-gray-500">Commission Earned</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? formatCurrency(financialSummary.commissionEarned) : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">💸</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Payouts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? formatCurrency(financialSummary.pendingPayouts) : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">↩️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Refunds Processed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialSummary ? formatCurrency(financialSummary.refundsProcessed) : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Revenue Trends</h3>
          <div className="flex space-x-2">
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <span className="text-6xl mb-4 block">📈</span>
            <p className="text-gray-500">Revenue chart will be implemented with Chart.js integration</p>
            <p className="text-sm text-gray-400 mt-2">Data visualization coming soon</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generateReport('revenue')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">📊</span>
            Generate Revenue Report
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">⚠️</span>
            Review Disputes
          </button>
          <button
            onClick={() => generateReport('payout')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">💸</span>
            Process Payouts
          </button>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="disputed">Disputed</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="commission">Commission</option>
            <option value="payout">Payout</option>
            <option value="membership">Membership</option>
          </select>

          <input
            type="date"
            value={filters.dateRange.startDate}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              dateRange: { ...prev.dateRange, startDate: e.target.value }
            }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />

          <input
            type="date"
            value={filters.dateRange.endDate}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              dateRange: { ...prev.dateRange, endDate: e.target.value }
            }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            <button
              onClick={() => generateReport('transactions')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Export Transactions
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.transactionId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.userName}</div>
                      <div className="text-sm text-gray-500">{transaction.userEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {transaction.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(transaction.fees)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        // Show transaction details modal
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      View
                    </button>
                    {transaction.status === 'completed' && (
                      <button 
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setRefundRequest({
                            transactionId: transaction.transactionId,
                            amount: transaction.amount,
                            reason: ''
                          });
                          setShowRefundModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">💳</span>
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBillingAccounts = () => (
    <div className="space-y-6">
      {/* Billing Account Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="suspended">Suspended</option>
          </select>

          <input
            type="number"
            placeholder="Min amount"
            value={filters.amountRange.min}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              amountRange: { ...prev.amountRange, min: e.target.value }
            }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />

          <input
            type="number"
            placeholder="Max amount"
            value={filters.amountRange.max}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              amountRange: { ...prev.amountRange, max: e.target.value }
            }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Billing Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Customer Billing Accounts</h3>
            <button
              onClick={() => generateReport('billing')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Export Billing Data
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingAccounts.map((account) => (
                <tr key={account.billingId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">Customer #{account.userId}</div>
                    <div className="text-sm text-gray-500">ID: {account.billingId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {account.plan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(account.amount)} {account.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(account.status)}`}>
                      {account.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.nextBillingDate ? formatDate(new Date(account.nextBillingDate).toISOString()) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.paymentMethodId ? 'Card ending in ****' : 'No payment method'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      View Details
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {billingAccounts.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">💳</span>
            <p className="text-gray-500">No billing accounts found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDisputes = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Disputed Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispute Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispute Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockDisputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dispute.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{dispute.userName}</div>
                      <div className="text-sm text-gray-500">{dispute.userEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(dispute.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dispute.disputeReason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(dispute.disputeStatus)}`}>
                      {dispute.disputeStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(dispute.disputeDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      Investigate
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Reports</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => generateReport('revenue')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-medium text-gray-900">Revenue Report</h4>
                <p className="text-sm text-gray-500">Monthly and yearly revenue breakdown</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => generateReport('transactions')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💳</span>
              <div>
                <h4 className="font-medium text-gray-900">Transaction Report</h4>
                <p className="text-sm text-gray-500">Detailed transaction history</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => generateReport('billing')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🧾</span>
              <div>
                <h4 className="font-medium text-gray-900">Billing Report</h4>
                <p className="text-sm text-gray-500">Customer billing and subscriptions</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => generateReport('commission')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💰</span>
              <div>
                <h4 className="font-medium text-gray-900">Commission Report</h4>
                <p className="text-sm text-gray-500">Platform commission breakdown</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => generateReport('payout')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💸</span>
              <div>
                <h4 className="font-medium text-gray-900">Payout Report</h4>
                <p className="text-sm text-gray-500">Seller payout summary</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => generateReport('disputes')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-medium text-gray-900">Disputes Report</h4>
                <p className="text-sm text-gray-500">Dispute resolution summary</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
        
        {reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{report.title}</h4>
                  <p className="text-sm text-gray-500">
                    Generated {formatDate(report.generatedAt)} • {report.format.toUpperCase()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                  <button className="text-red-600 hover:text-red-800 text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-gray-500">No reports generated yet</p>
          </div>
        )}
      </div>

      {/* Integration Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <span className="text-yellow-400 mt-0.5">⚠️</span>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Integration Required</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Financial reporting features require integration with payment processor APIs (Stripe, PayPal, etc.) 
              to access real transaction data and generate accurate reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Processing request..." 
        backdrop="blur"
      />

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'billing' && renderBillingAccounts()}
      {activeTab === 'disputes' && renderDisputes()}
      {activeTab === 'reports' && renderReports()}

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Process Refund</h3>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm font-medium">{selectedTransaction.transactionId}</div>
                    <div className="text-sm text-gray-500">{selectedTransaction.userName} - {formatCurrency(selectedTransaction.amount)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount</label>
                  <input
                    type="number"
                    value={refundRequest.amount / 100}
                    onChange={(e) => setRefundRequest(prev => ({ 
                      ...prev, 
                      amount: Math.round(parseFloat(e.target.value) * 100) 
                    }))}
                    max={selectedTransaction.amount / 100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum refund: {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund</label>
                  <textarea
                    value={refundRequest.reason}
                    onChange={(e) => setRefundRequest(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide a reason for this refund..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundRequest.reason || refundRequest.amount <= 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagement;