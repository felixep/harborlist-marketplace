import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider } from '../../AdminAuthProvider';
import { ToastProvider } from '../../../../contexts/ToastContext';
import AdminDashboard from '../../../../pages/admin/AdminDashboard';
import UserManagement from '../../../../pages/admin/UserManagement';
import ListingModeration from '../../../../pages/admin/ListingModeration';
import * as adminApi from '../../../../services/adminApi';

// Mock the admin API
jest.mock('../../../../services/adminApi');
const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

// Mock data
const mockDashboardMetrics = {
  totalUsers: 1250,
  activeListings: 342,
  pendingModeration: 15,
  systemHealth: 'healthy' as const,
  revenueToday: 2450.75,
  userGrowth: 12.5,
  listingGrowth: 8.3,
  errorRate: 0.02,
  responseTime: 145,
  uptime: 99.98
};

const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'active' as const,
    role: 'user' as const,
    createdAt: '2024-01-15T10:30:00Z',
    lastLogin: '2024-09-28T08:15:00Z',
    listingsCount: 3,
    verified: true
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: 'suspended' as const,
    role: 'user' as const,
    createdAt: '2024-02-20T14:45:00Z',
    lastLogin: '2024-09-25T16:30:00Z',
    listingsCount: 1,
    verified: false
  }
];

const mockFlaggedListings = [
  {
    id: 'listing-1',
    title: '2020 Sea Ray Sundancer',
    seller: {
      id: 'user-3',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    flags: [{
      id: 'flag-1',
      reason: 'inappropriate_content' as const,
      description: 'Contains inappropriate language',
      reportedBy: 'user-4',
      reportedAt: '2024-09-27T10:00:00Z'
    }],
    status: 'flagged' as const,
    createdAt: '2024-09-25T12:00:00Z',
    price: 85000,
    location: 'Miami, FL'
  }
];

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@harbotlist.com',
  name: 'Admin User',
  role: 'admin' as const,
  permissions: ['user_management', 'content_moderation', 'analytics_view'] as const,
  lastLogin: '2024-09-28T10:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  isActive: true,
  mfaEnabled: false
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AdminAuthProvider>
            {children}
          </AdminAuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockAdminApi.verifyAdminToken.mockResolvedValue({
      user: mockAdminUser,
      permissions: mockAdminUser.permissions
    });
    
    // Set up localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-admin-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  describe('Dashboard Overview Workflow', () => {
    it('should load and display dashboard metrics correctly', async () => {
      mockAdminApi.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics);

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total users
        expect(screen.getByText('342')).toBeInTheDocument(); // Active listings
        expect(screen.getByText('15')).toBeInTheDocument(); // Pending moderation
        expect(screen.getByText('$2,450.75')).toBeInTheDocument(); // Revenue today
      });

      // Verify API was called
      expect(mockAdminApi.getDashboardMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle dashboard metrics loading error gracefully', async () => {
      mockAdminApi.getDashboardMetrics.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard metrics/i)).toBeInTheDocument();
      });
    });

    it('should refresh metrics when refresh button is clicked', async () => {
      mockAdminApi.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics);

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockAdminApi.getDashboardMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Management Workflow', () => {
    it('should load and display users list', async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1
      });

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Suspended')).toBeInTheDocument();
      });
    });

    it('should filter users by search term', async () => {
      const user = userEvent.setup();
      
      // Initial load
      mockAdminApi.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1
      });

      // Filtered results
      mockAdminApi.getUsers.mockResolvedValueOnce({
        users: [mockUsers[0]], // Only John Doe
        total: 1,
        page: 1,
        totalPages: 1
      });

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Search for John
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'john');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockAdminApi.getUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: 'john'
        });
      });
    });

    it('should suspend user with reason', async () => {
      const user = userEvent.setup();
      
      mockAdminApi.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1
      });

      mockAdminApi.updateUserStatus.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click user actions menu
      const actionsButton = screen.getByTestId('user-actions-user-1');
      await user.click(actionsButton);

      // Click suspend option
      const suspendButton = screen.getByTestId('suspend-user-user-1');
      await user.click(suspendButton);

      // Fill suspension form
      await waitFor(() => {
        expect(screen.getByTestId('suspension-modal')).toBeInTheDocument();
      });

      const reasonSelect = screen.getByTestId('suspension-reason');
      await user.selectOptions(reasonSelect, 'terms_violation');

      const notesInput = screen.getByTestId('suspension-notes');
      await user.type(notesInput, 'Inappropriate behavior');

      const confirmButton = screen.getByTestId('confirm-suspension');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAdminApi.updateUserStatus).toHaveBeenCalledWith('user-1', {
          status: 'suspended',
          reason: 'terms_violation',
          notes: 'Inappropriate behavior'
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/user suspended successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Content Moderation Workflow', () => {
    it('should load and display flagged listings', async () => {
      mockAdminApi.getFlaggedListings.mockResolvedValue({
        listings: mockFlaggedListings,
        total: 1
      });

      render(
        <TestWrapper>
          <ListingModeration />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2020 Sea Ray Sundancer')).toBeInTheDocument();
        expect(screen.getByText('inappropriate_content')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('should approve flagged listing with notes', async () => {
      const user = userEvent.setup();
      
      mockAdminApi.getFlaggedListings.mockResolvedValue({
        listings: mockFlaggedListings,
        total: 1
      });

      mockAdminApi.getListingDetails.mockResolvedValue({
        ...mockFlaggedListings[0],
        description: 'Beautiful boat in excellent condition',
        images: ['https://example.com/boat1.jpg'],
        specifications: {
          year: 2020,
          make: 'Sea Ray',
          model: 'Sundancer',
          length: '35 ft'
        }
      });

      mockAdminApi.moderateListing.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ListingModeration />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2020 Sea Ray Sundancer')).toBeInTheDocument();
      });

      // Click review button
      const reviewButton = screen.getByTestId('review-listing-listing-1');
      await user.click(reviewButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('listing-detail-modal')).toBeInTheDocument();
      });

      // Click approve button
      const approveButton = screen.getByTestId('approve-listing');
      await user.click(approveButton);

      // Fill moderation form
      await waitFor(() => {
        expect(screen.getByTestId('moderation-confirmation-modal')).toBeInTheDocument();
      });

      const notesInput = screen.getByTestId('moderation-notes');
      await user.type(notesInput, 'Content reviewed and approved');

      const notifyCheckbox = screen.getByTestId('notify-user-checkbox');
      await user.click(notifyCheckbox);

      const confirmButton = screen.getByTestId('confirm-moderation');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('listing-1', {
          action: 'approve',
          reason: 'Content reviewed and approved',
          notifyUser: true
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/listing approved successfully/i)).toBeInTheDocument();
      });
    });

    it('should reject flagged listing with reason', async () => {
      const user = userEvent.setup();
      
      mockAdminApi.getFlaggedListings.mockResolvedValue({
        listings: mockFlaggedListings,
        total: 1
      });

      mockAdminApi.getListingDetails.mockResolvedValue({
        ...mockFlaggedListings[0],
        description: 'Beautiful boat in excellent condition',
        images: ['https://example.com/boat1.jpg'],
        specifications: {
          year: 2020,
          make: 'Sea Ray',
          model: 'Sundancer',
          length: '35 ft'
        }
      });

      mockAdminApi.moderateListing.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ListingModeration />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('2020 Sea Ray Sundancer')).toBeInTheDocument();
      });

      // Click review button
      const reviewButton = screen.getByTestId('review-listing-listing-1');
      await user.click(reviewButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('listing-detail-modal')).toBeInTheDocument();
      });

      // Click reject button
      const rejectButton = screen.getByTestId('reject-listing');
      await user.click(rejectButton);

      // Fill rejection form
      await waitFor(() => {
        expect(screen.getByTestId('moderation-confirmation-modal')).toBeInTheDocument();
      });

      const reasonSelect = screen.getByTestId('rejection-reason');
      await user.selectOptions(reasonSelect, 'inappropriate_content');

      const notesInput = screen.getByTestId('moderation-notes');
      await user.type(notesInput, 'Contains inappropriate language');

      const confirmButton = screen.getByTestId('confirm-moderation');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('listing-1', {
          action: 'reject',
          reason: 'inappropriate_content',
          notes: 'Contains inappropriate language',
          notifyUser: true
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/listing rejected successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      mockAdminApi.getDashboardMetrics.mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard metrics/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle authentication errors and redirect to login', async () => {
      mockAdminApi.verifyAdminToken.mockRejectedValue(new Error('Token expired'));

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('admin-token');
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('admin-user');
      });
    });

    it('should handle permission errors appropriately', async () => {
      mockAdminApi.getUsers.mockRejectedValue(new Error('Insufficient permissions'));

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should update dashboard metrics in real-time', async () => {
      jest.useFakeTimers();
      
      mockAdminApi.getDashboardMetrics
        .mockResolvedValueOnce(mockDashboardMetrics)
        .mockResolvedValueOnce({
          ...mockDashboardMetrics,
          totalUsers: 1251, // Updated value
          pendingModeration: 14
        });

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });

      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(30000); // 30 seconds

      await waitFor(() => {
        expect(screen.getByText('1,251')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
})