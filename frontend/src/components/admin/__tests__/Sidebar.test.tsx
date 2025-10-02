import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { AdminAuthContext } from '../AdminAuthProvider';
import { UserRole, AdminPermission, UserStatus } from '../../../../../backend/src/types/common';

const mockAdminUser = {
  id: '1',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: UserRole.SUPER_ADMIN, // Use SUPER_ADMIN to see all menu items
  permissions: [AdminPermission.USER_MANAGEMENT, AdminPermission.CONTENT_MODERATION],
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: false,
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  sessionTimeout: 60,
};

const mockAuthContext = {
  adminUser: mockAdminUser,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
  isAuthenticated: true,
  hasPermission: vi.fn((permission: AdminPermission) => 
    mockAdminUser.role === UserRole.SUPER_ADMIN || mockAdminUser.permissions.includes(permission)
  ),
  hasRole: vi.fn((role: UserRole) => mockAdminUser.role === role || mockAdminUser.role === UserRole.SUPER_ADMIN),
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AdminAuthContext.Provider value={mockAuthContext}>
        {component}
      </AdminAuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Sidebar', () => {
  it('renders sidebar with navigation items', () => {
    renderWithContext(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Content Moderation')).toBeInTheDocument();
  });

  it('shows only permitted menu items', () => {
    // Test with regular admin user (not super admin)
    const regularAdminUser = {
      ...mockAdminUser,
      role: UserRole.ADMIN, // Regular admin, not super admin
      permissions: [AdminPermission.USER_MANAGEMENT, AdminPermission.CONTENT_MODERATION],
    };

    const regularAdminContext = {
      ...mockAuthContext,
      adminUser: regularAdminUser,
      hasPermission: vi.fn((permission: AdminPermission) => 
        regularAdminUser.permissions.includes(permission)
      ),
      hasRole: vi.fn((role: UserRole) => regularAdminUser.role === role),
    };

    render(
      <BrowserRouter>
        <AdminAuthContext.Provider value={regularAdminContext}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </AdminAuthContext.Provider>
      </BrowserRouter>
    );

    // Should show items with permissions user has
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    
    // Should not show items requiring permissions user doesn't have
    expect(screen.queryByText('Platform Settings')).not.toBeInTheDocument();
  });

  it('shows user info at bottom', () => {
    renderWithContext(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Test Admin')).toBeInTheDocument();
    expect(screen.getByText('super admin')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked on mobile', () => {
    const mockClose = vi.fn();
    renderWithContext(<Sidebar isOpen={true} onClose={mockClose} />);

    // Find the overlay (it's the div with bg-gray-600 bg-opacity-75)
    const overlay = document.querySelector('.bg-gray-600.bg-opacity-75');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockClose).toHaveBeenCalledOnce();
    }
  });

  it('applies correct classes when open/closed', () => {
    const { rerender } = renderWithContext(<Sidebar isOpen={false} onClose={vi.fn()} />);
    
    let sidebar = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sidebar).toHaveClass('-translate-x-full');

    rerender(
      <BrowserRouter>
        <AdminAuthContext.Provider value={mockAuthContext}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </AdminAuthContext.Provider>
      </BrowserRouter>
    );

    sidebar = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sidebar).toHaveClass('translate-x-0');
  });
});