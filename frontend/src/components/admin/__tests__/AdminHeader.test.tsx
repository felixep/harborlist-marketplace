import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminHeader from '../AdminHeader';
import { AdminAuthContext } from '../AdminAuthProvider';
import { UserRole, AdminPermission, UserStatus } from '../../../types/common';

const mockAdminUser = {
  id: '1',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: UserRole.ADMIN,
  permissions: [AdminPermission.USER_MANAGEMENT],
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
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => true),
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

describe('AdminHeader', () => {
  it('renders admin header with user info', () => {
    renderWithContext(
      <AdminHeader onMenuToggle={vi.fn()} isMobileMenuOpen={false} />
    );

    expect(screen.getByText('HarborList Admin')).toBeInTheDocument();
    expect(screen.getByText('Test Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('calls onMenuToggle when menu button is clicked', () => {
    const mockToggle = vi.fn();
    renderWithContext(
      <AdminHeader onMenuToggle={mockToggle} isMobileMenuOpen={false} />
    );

    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);

    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('shows user dropdown menu when clicked', () => {
    renderWithContext(
      <AdminHeader onMenuToggle={vi.fn()} isMobileMenuOpen={false} />
    );

    const userButton = screen.getByRole('button', { name: /A/i });
    fireEvent.click(userButton);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('calls logout when sign out is clicked', () => {
    renderWithContext(
      <AdminHeader onMenuToggle={vi.fn()} isMobileMenuOpen={false} />
    );

    const userButton = screen.getByRole('button', { name: /A/i });
    fireEvent.click(userButton);

    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    expect(mockAuthContext.logout).toHaveBeenCalledOnce();
  });
});