import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserManagement from '../UserManagement';
import { ToastProvider } from '../../../contexts/ToastContext';
import { adminApi } from '../../../services/adminApi';

// Mock the hooks and services
vi.mock('../../../hooks/useAdminOperations', () => ({
  useAdminOperations: () => ({
    isLoading: false,
    updateUserStatus: vi.fn(),
    executeCustomOperation: vi.fn()
  })
}));

vi.mock('../../../services/adminApi', () => ({
  adminApi: {
    getUsers: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    userType: 'individual',
    status: 'active',
    role: 'user',
    premiumActive: false,
    capabilities: [],
    membershipDetails: {
      features: [],
      limits: {
        maxListings: 5,
        maxImages: 10,
        priorityPlacement: false,
        featuredListings: 0,
        analyticsAccess: false,
        bulkOperations: false
      },
      autoRenew: false
    }
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    userType: 'premium_dealer',
    status: 'active',
    role: 'user',
    premiumActive: true,
    capabilities: [
      {
        feature: 'advanced_search',
        enabled: true,
        grantedBy: 'admin',
        grantedAt: Date.now()
      }
    ],
    membershipDetails: {
      features: ['advanced_search', 'priority_placement'],
      limits: {
        maxListings: 50,
        maxImages: 100,
        priorityPlacement: true,
        featuredListings: 5,
        analyticsAccess: true,
        bulkOperations: true
      },
      autoRenew: true
    }
  }
];

const mockUserTiers = [
  {
    tierId: 'tier1',
    name: 'Basic',
    type: 'individual',
    isPremium: false,
    features: [],
    limits: {
      maxListings: 5,
      maxImages: 10,
      priorityPlacement: false,
      featuredListings: 0,
      analyticsAccess: false,
      bulkOperations: false
    },
    pricing: { monthly: 0, currency: 'USD' },
    active: true,
    displayOrder: 1
  }
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getUsers as any).mockResolvedValue({ users: mockUsers });
    (adminApi.get as any).mockImplementation((url: string) => {
      if (url === '/user-tiers') {
        return Promise.resolve({ data: mockUserTiers });
      }
      if (url === '/user-groups') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders user management interface', async () => {
    renderWithProviders(<UserManagement />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays user information correctly', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      // Check user details
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      
      // Check user types
      expect(screen.getByText('individual')).toBeInTheDocument();
      expect(screen.getByText('premium dealer')).toBeInTheDocument();
      
      // Check premium status
      const premiumBadges = screen.getAllByText('Active');
      expect(premiumBadges.length).toBeGreaterThan(0);
    });
  });

  it('filters users by search term', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Name or email...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by user type', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const userTypeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(userTypeFilter, { target: { value: 'individual' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('opens user edit modal when edit button is clicked', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User: John Doe')).toBeInTheDocument();
      expect(screen.getByText('User Type')).toBeInTheDocument();
      expect(screen.getByText('Tier Assignment')).toBeInTheDocument();
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
    });
  });

  it('handles bulk user selection', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select individual users
    const checkboxes = screen.getAllByRole('checkbox');
    const userCheckbox = checkboxes.find(cb => cb.closest('tr')?.textContent?.includes('John Doe'));
    
    if (userCheckbox) {
      fireEvent.click(userCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Bulk Actions (1)')).toBeInTheDocument();
      });
    }
  });

  it('handles select all functionality', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText('Select All');
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Bulk Actions (2)')).toBeInTheDocument();
    });
  });

  it('updates user type when changed in modal', async () => {
    (adminApi.post as any).mockResolvedValue({});
    
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User: John Doe')).toBeInTheDocument();
    });

    const userTypeSelect = screen.getByDisplayValue('individual');
    fireEvent.change(userTypeSelect, { target: { value: 'dealer' } });

    expect(adminApi.post).toHaveBeenCalledWith('/users/1/user-type', { userType: 'dealer' });
  });

  it('handles capability toggle', async () => {
    (adminApi.post as any).mockResolvedValue({});
    
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User: John Doe')).toBeInTheDocument();
    });

    const advancedSearchCheckbox = screen.getByLabelText('Advanced Search');
    fireEvent.click(advancedSearchCheckbox);

    expect(adminApi.post).toHaveBeenCalledWith('/users/1/capabilities', {
      capability: 'advanced_search',
      enabled: true,
      expiresAt: expect.any(Number)
    });
  });

  it('handles bulk actions', async () => {
    (adminApi.post as any).mockResolvedValue({});
    
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select a user
    const checkboxes = screen.getAllByRole('checkbox');
    const userCheckbox = checkboxes.find(cb => cb.closest('tr')?.textContent?.includes('John Doe'));
    
    if (userCheckbox) {
      fireEvent.click(userCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Bulk Actions (1)')).toBeInTheDocument();
      });

      const activateButton = screen.getByText('Activate');
      fireEvent.click(activateButton);

      expect(adminApi.post).toHaveBeenCalledWith('/users/bulk/activate', { userIds: ['1'] });
    }
  });

  it('displays pagination when there are many users', async () => {
    const manyUsers = Array.from({ length: 25 }, (_, i) => ({
      ...mockUsers[0],
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`
    }));

    (adminApi.getUsers as any).mockResolvedValue({ users: manyUsers });
    
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (adminApi.getUsers as any).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      // The component should handle the error gracefully
      // This might show an error message or empty state
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });
});