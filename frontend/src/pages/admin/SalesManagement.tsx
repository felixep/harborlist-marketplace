import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { SalesUser, EnhancedUser, UserCapability } from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';

interface SalesFilters {
  search: string;
  territory: string;
  performanceLevel: string;
  status: string;
}

interface CustomerAssignment {
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAt: string;
  salesUserId: string;
  status: 'active' | 'inactive';
}

interface SalesTarget {
  monthly: number;
  quarterly: number;
  yearly: number;
  achieved: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
}

const SalesManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales_users' | 'assignments' | 'performance' | 'reports'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data state
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [customers, setCustomers] = useState<EnhancedUser[]>([]);
  const [assignments, setAssignments] = useState<CustomerAssignment[]>([]);
  const [selectedSalesUser, setSelectedSalesUser] = useState<SalesUser | null>(null);
  
  // Modal state
  const [showCreateSalesUserModal, setShowCreateSalesUserModal] = useState(false);
  const [showAssignCustomerModal, setShowAssignCustomerModal] = useState(false);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    territory: '',
    performanceLevel: '',
    status: 'active'
  });
  
  // Form state
  const [newSalesUser, setNewSalesUser] = useState({
    name: '',
    email: '',
    territory: '',
    commissionRate: 5,
    managerUserId: ''
  });
  
  const [salesTargets, setSalesTargets] = useState<SalesTarget>({
    monthly: 0,
    quarterly: 0,
    yearly: 0,
    achieved: { monthly: 0, quarterly: 0, yearly: 0 }
  });

  useEffect(() => {
    loadSalesUsers();
    loadCustomers();
    loadAssignments();
  }, []);

  const loadSalesUsers = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getSalesUsers();
      setSalesUsers(response.salesUsers || []);
    } catch (error) {
      showError('Error', 'Failed to load sales users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await adminApi.getUsers({ role: 'user' });
      setCustomers(response.users || []);
    } catch (error) {
      showError('Error', 'Failed to load customers');
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await adminApi.get('/sales/assignments');
      setAssignments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showError('Error', 'Failed to load customer assignments');
    }
  };

  const handleCreateSalesUser = async () => {
    if (!newSalesUser.name || !newSalesUser.email) {
      showWarning('Warning', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await adminApi.createSalesUser({
        ...newSalesUser,
        role: 'sales',
        permissions: ['user_management', 'tier_management', 'capability_assignment']
      });
      showSuccess('Success', 'Sales user created successfully');
      setShowCreateSalesUserModal(false);
      setNewSalesUser({ name: '', email: '', territory: '', commissionRate: 5, managerUserId: '' });
      loadSalesUsers();
    } catch (error) {
      showError('Error', 'Failed to create sales user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignCustomer = async (customerId: string, salesUserId: string) => {
    setIsLoading(true);
    try {
      await adminApi.assignCustomerToSales(customerId, salesUserId);
      showSuccess('Success', 'Customer assigned successfully');
      loadAssignments();
    } catch (error) {
      showError('Error', 'Failed to assign customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTargets = async () => {
    if (!selectedSalesUser) return;

    setIsLoading(true);
    try {
      await adminApi.updateSalesTargets(selectedSalesUser.id, salesTargets);
      showSuccess('Success', 'Sales targets updated successfully');
      setShowTargetsModal(false);
      loadSalesUsers();
    } catch (error) {
      showError('Error', 'Failed to update sales targets');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPerformanceColor = (achieved: number, target: number) => {
    const percentage = target > 0 ? (achieved / target) * 100 : 0;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sales Team</p>
              <p className="text-2xl font-semibold text-gray-900">
                {salesUsers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Performance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {salesUsers.reduce((acc, user) => acc + (user.salesTargets?.achieved.monthly || 0), 0)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Commission</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(salesUsers.reduce((acc, user) => acc + ((user.commissionRate || 0) * 1000), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowCreateSalesUserModal(true)}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">👤</span>
            Add Sales User
          </button>
          <button
            onClick={() => setShowAssignCustomerModal(true)}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">🎯</span>
            Assign Customer
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span className="mr-2">📊</span>
            View Reports
          </button>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers This Month</h3>
        <div className="space-y-4">
          {salesUsers
            .sort((a, b) => (b.salesTargets?.achieved.monthly || 0) - (a.salesTargets?.achieved.monthly || 0))
            .slice(0, 5)
            .map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-800">#{index + 1}</span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.territory || 'No territory'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user.salesTargets?.achieved.monthly || 0}% of target
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.assignedCustomers?.length || 0} customers
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderSalesUsers = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search sales users..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={filters.territory}
            onChange={(e) => setFilters(prev => ({ ...prev, territory: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Territories</option>
            <option value="north">North</option>
            <option value="south">South</option>
            <option value="east">East</option>
            <option value="west">West</option>
          </select>

          <select
            value={filters.performanceLevel}
            onChange={(e) => setFilters(prev => ({ ...prev, performanceLevel: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Performance</option>
            <option value="high">High (&gt;100%)</option>
            <option value="medium">Medium (75-100%)</option>
            <option value="low">Low (&lt;75%)</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Sales Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Sales Team</h3>
            <button
              onClick={() => setShowCreateSalesUserModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Add Sales User
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.territory || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.assignedCustomers?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.commissionRate || 0}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`text-sm font-medium ${getPerformanceColor(
                        user.salesTargets?.achieved.monthly || 0,
                        user.salesTargets?.monthly || 1
                      )}`}>
                        {user.salesTargets?.achieved.monthly || 0}%
                      </div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (user.salesTargets?.achieved.monthly || 0))}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedSalesUser(user);
                        setSalesTargets(user.salesTargets || {
                          monthly: 0,
                          quarterly: 0,
                          yearly: 0,
                          achieved: { monthly: 0, quarterly: 0, yearly: 0 }
                        });
                        setShowTargetsModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Set Targets
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {salesUsers.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">👥</span>
            <p className="text-gray-500">No sales users found</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Processing request..." 
        backdrop="blur"
      />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Sales Management</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => setActiveTab('reports')}
            className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Reports
          </button>
          <button 
            onClick={() => setShowCreateSalesUserModal(true)}
            className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Add Sales User
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'sales_users', label: 'Sales Team' },
            { key: 'assignments', label: 'Customer Assignments' },
            { key: 'performance', label: 'Performance' },
            { key: 'reports', label: 'Reports' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'sales_users' && renderSalesUsers()}
      {activeTab === 'assignments' && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🎯</span>
          <p className="text-gray-500">Customer assignments interface coming soon</p>
        </div>
      )}
      {activeTab === 'performance' && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📈</span>
          <p className="text-gray-500">Performance analytics interface coming soon</p>
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-gray-500">Sales reports interface coming soon</p>
        </div>
      )}

      {/* Create Sales User Modal */}
      {showCreateSalesUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Sales User</h3>
                <button
                  onClick={() => setShowCreateSalesUserModal(false)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newSalesUser.name}
                    onChange={(e) => setNewSalesUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newSalesUser.email}
                    onChange={(e) => setNewSalesUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
                  <select
                    value={newSalesUser.territory}
                    onChange={(e) => setNewSalesUser(prev => ({ ...prev, territory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Territory</option>
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newSalesUser.commissionRate}
                    onChange={(e) => setNewSalesUser(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateSalesUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSalesUser}
                  disabled={!newSalesUser.name || !newSalesUser.email}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Sales User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Targets Modal */}
      {showTargetsModal && selectedSalesUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Set Sales Targets: {selectedSalesUser.name}</h3>
                <button
                  onClick={() => setShowTargetsModal(false)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Target (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={salesTargets.monthly}
                    onChange={(e) => setSalesTargets(prev => ({ ...prev, monthly: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quarterly Target (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={salesTargets.quarterly}
                    onChange={(e) => setSalesTargets(prev => ({ ...prev, quarterly: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Target (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={salesTargets.yearly}
                    onChange={(e) => setSalesTargets(prev => ({ ...prev, yearly: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTargetsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTargets}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Update Targets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;