import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SalesManagement from '../SalesManagement';
import { ToastProvider } from '../../../contexts/ToastContext';
import { adminApi } from '../../../services/adminApi';

// Mock the admin API
vi.mock('../../../services/adminApi', () => ({
  adminApi: {
    getSalesUsers: vi.fn(),
    getUsers: vi.fn(),
    get: vi.fn(),
    createSalesUser: vi.fn(),
    assignCustomerToSales: vi.fn(),
    updateSalesTargets: vi.fn(),
    getSalesPerformance: vi.fn(),
    getSalesReports: vi.fn()
  }
}));

const mockSalesUsers = [
  {
    id: 'sales_001',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    role: 'sales',
    territory: 'north',
    commissionRate: 5.5,
    assignedCustomers: ['customer_001', 'customer_002'],
    salesTargets: {
      monthly: 100,
      quarterly: 300,
      yearly: 1200,
      achieved: {
        monthly: 85,
        quarterly: 250,
        yearly: 800
      }
    },
    permissions: ['user_management', 'tier_management', 'capability_assignment']
  },
  {
    id: 'sales_002',
    name: 'Bob Wilson',
    email: 'bob@company.com',
    role: 'sales',
    territory: 'south',
    commissionRate: 6.0,
    assignedCustomers: ['customer_003'],
    salesTargets: {
      monthly: 80,
      quarterly: 240,
      yearly: 960,
      achieved: {
        monthly: 95,
        quarterly: 280,
        yearly: 950
      }
    },
    permissions: ['user_management', 'tier_management']
  }
];

const mockCustomers = [
  {
    id: 'customer_001',
    name: 'John Customer',
    email: 'john.customer@example.com',
    role: 'user',
    userType: 'individual',
    status: 'active'
  },
  {
    id: 'customer_002',
    name: 'Jane Customer',
    email: 'jane.customer@example.com',
    role: 'user',
    userType: 'dealer',
    status: 'active'
  }
];

const mockAssignments = [
  {
    customerId: 'customer_001',
    customerName: 'John Customer',
    customerEmail: 'john.customer@example.com',
    assignedAt: '2024-01-15T10:00:00Z',
    salesUserId: 'sales_001',
    status: 'active'
  },
  {
    customerId: 'customer_002',
    customerName: 'Jane Customer',
    customerEmail: 'jane.customer@example.com',
    assignedAt: '2024-01-16T14:00:00Z',
    salesUserId: 'sales_001',
    status: 'active'
  }
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('SalesManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getSalesUsers as any).mockResolvedValue({ salesUsers: mockSalesUsers });
    (adminApi.getUsers as any).mockResolvedValue({ users: mockCustomers });
    (adminApi.get as any).mockImplementation((url: string) => {
      if (url === '/sales/assignments') {
        return Promise.resolve({ data: mockAssignments });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders sales management interface', async () => {
    renderWithProviders(<SalesManagement />);
    
    expect(screen.getByText('Sales Management')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    expect(screen.getByText('Customer Assignments')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('displays sales overview metrics', async () => {
    renderWithProviders(<SalesManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Sales Team')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Number of sales users
      expect(screen.getByText('Active Assignments')).toBeInTheDocument();
      expect(screen.getByText('Monthly Performance')).toBeInTheDocument();
      expect(screen.getByText('Total Commission')).toBeInTheDocument();
    });
  });

  it('displays top performers section', async () => {
    renderWithProviders(<SalesManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Performers This Month')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('85% of target')).toBeInTheDocument();
      expect(screen.getByText('95% of target')).toBeInTheDocument();
    });
  });

  it('switches to sales team tab and displays users', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@company.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('bob@company.com')).toBeInTheDocument();
      expect(screen.getByText('north')).toBeInTheDocument();
      expect(screen.getByText('south')).toBeInTheDocument();
      expect(screen.getByText('5.5%')).toBeInTheDocument();
      expect(screen.getByText('6%')).toBeInTheDocument();
    });
  });

  it('filters sales users by territory', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    const territoryFilter = screen.getByDisplayValue('All Territories');
    fireEvent.change(territoryFilter, { target: { value: 'north' } });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });
  });

  it('opens create sales user modal', async () => {
    renderWithProviders(<SalesManagement />);
    
    const addSalesUserButton = screen.getByText('Add Sales User');
    fireEvent.click(addSalesUserButton);

    await waitFor(() => {
      expect(screen.getByText('Create Sales User')).toBeInTheDocument();
      expect(screen.getByText('Name *')).toBeInTheDocument();
      expect(screen.getByText('Email *')).toBeInTheDocument();
      expect(screen.getByText('Territory')).toBeInTheDocument();
      expect(screen.getByText('Commission Rate (%)')).toBeInTheDocument();
    });
  });

  it('creates a new sales user', async () => {
    (adminApi.createSalesUser as any).mockResolvedValue({});
    
    renderWithProviders(<SalesManagement />);
    
    const addSalesUserButton = screen.getByText('Add Sales User');
    fireEvent.click(addSalesUserButton);

    await waitFor(() => {
      expect(screen.getByText('Create Sales User')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('');
    const emailInput = screen.getAllByDisplayValue('')[1];
    const territorySelect = screen.getByDisplayValue('Select Territory');
    const commissionInput = screen.getByDisplayValue('5');

    fireEvent.change(nameInput, { target: { value: 'Charlie Brown' } });
    fireEvent.change(emailInput, { target: { value: 'charlie@company.com' } });
    fireEvent.change(territorySelect, { target: { value: 'east' } });
    fireEvent.change(commissionInput, { target: { value: '7.5' } });

    const createButton = screen.getByText('Create Sales User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(adminApi.createSalesUser).toHaveBeenCalledWith({
        name: 'Charlie Brown',
        email: 'charlie@company.com',
        territory: 'east',
        commissionRate: 7.5,
        managerUserId: '',
        role: 'sales',
        permissions: ['user_management', 'tier_management', 'capability_assignment']
      });
    });
  });

  it('opens sales targets modal', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const setTargetsButtons = screen.getAllByText('Set Targets');
    fireEvent.click(setTargetsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Set Sales Targets: Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Monthly Target (%)')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Target (%)')).toBeInTheDocument();
      expect(screen.getByText('Yearly Target (%)')).toBeInTheDocument();
    });
  });

  it('updates sales targets', async () => {
    (adminApi.updateSalesTargets as any).mockResolvedValue({});
    
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const setTargetsButtons = screen.getAllByText('Set Targets');
    fireEvent.click(setTargetsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Set Sales Targets: Alice Johnson')).toBeInTheDocument();
    });

    const monthlyInput = screen.getByDisplayValue('100');
    fireEvent.change(monthlyInput, { target: { value: '120' } });

    const updateButton = screen.getByText('Update Targets');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(adminApi.updateSalesTargets).toHaveBeenCalledWith('sales_001', {
        monthly: 120,
        quarterly: 300,
        yearly: 1200,
        achieved: { monthly: 85, quarterly: 250, yearly: 800 }
      });
    });
  });

  it('displays performance indicators correctly', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      // Check performance percentages
      expect(screen.getByText('85%')).toBeInTheDocument(); // Alice's monthly performance
      expect(screen.getByText('95%')).toBeInTheDocument(); // Bob's monthly performance
      
      // Check customer counts
      expect(screen.getByText('2')).toBeInTheDocument(); // Alice's customers
      expect(screen.getByText('1')).toBeInTheDocument(); // Bob's customers
    });
  });

  it('handles search functionality', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search sales users...');
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });
  });

  it('filters by performance level', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    const performanceFilter = screen.getByDisplayValue('All Performance');
    fireEvent.change(performanceFilter, { target: { value: 'high' } });

    // Bob has >100% performance, so should be visible
    await waitFor(() => {
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  it('validates form inputs', async () => {
    renderWithProviders(<SalesManagement />);
    
    const addSalesUserButton = screen.getByText('Add Sales User');
    fireEvent.click(addSalesUserButton);

    await waitFor(() => {
      expect(screen.getByText('Create Sales User')).toBeInTheDocument();
    });

    // Try to create without required fields
    const createButton = screen.getByText('Create Sales User');
    expect(createButton).toBeDisabled();

    // Fill in name only
    const nameInput = screen.getByDisplayValue('');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    expect(createButton).toBeDisabled();

    // Fill in email as well
    const emailInput = screen.getAllByDisplayValue('')[0]; // After name is filled, this becomes the first empty input
    fireEvent.change(emailInput, { target: { value: 'test@company.com' } });
    
    expect(createButton).not.toBeDisabled();
  });

  it('handles API errors gracefully', async () => {
    (adminApi.getSalesUsers as any).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<SalesManagement />);
    
    await waitFor(() => {
      // The component should handle the error gracefully
      expect(screen.getByText('Sales Management')).toBeInTheDocument();
    });
  });

  it('shows placeholder content for unimplemented tabs', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Customer Assignments'));
    
    await waitFor(() => {
      expect(screen.getByText('Customer assignments interface coming soon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Performance'));
    
    await waitFor(() => {
      expect(screen.getByText('Performance analytics interface coming soon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reports'));
    
    await waitFor(() => {
      expect(screen.getByText('Sales reports interface coming soon')).toBeInTheDocument();
    });
  });

  it('displays commission rates correctly', async () => {
    renderWithProviders(<SalesManagement />);
    
    fireEvent.click(screen.getByText('Sales Team'));
    
    await waitFor(() => {
      expect(screen.getByText('5.5%')).toBeInTheDocument();
      expect(screen.getByText('6%')).toBeInTheDocument();
    });
  });

  it('shows loading overlay when processing requests', async () => {
    // Mock a delayed response
    (adminApi.createSalesUser as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );
    
    renderWithProviders(<SalesManagement />);
    
    const addSalesUserButton = screen.getByText('Add Sales User');
    fireEvent.click(addSalesUserButton);

    await waitFor(() => {
      expect(screen.getByText('Create Sales User')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('');
    const emailInput = screen.getAllByDisplayValue('')[1];

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@company.com' } });

    const createButton = screen.getByText('Create Sales User');
    fireEvent.click(createButton);

    expect(screen.getByText('Processing request...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Processing request...')).not.toBeInTheDocument();
    });
  });
});