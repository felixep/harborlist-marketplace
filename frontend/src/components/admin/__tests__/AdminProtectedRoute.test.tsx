import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminProtectedRoute from '../AdminProtectedRoute';
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

const renderWithContext = (
  component: React.ReactElement,
  contextOverrides = {}
) => {
  const defaultContext = {
    adminUser: mockAdminUser,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    isAuthenticated: true,
    hasPermission: vi.fn((permission: AdminPermission) => 
      mockAdminUser.permissions.includes(permission)
    ),
    hasRole: vi.fn((role: UserRole) => mockAdminUser.role === role),
    ...contextOverrides,
  };

  return render(
    <BrowserRouter>
      <AdminAuthContext.Provider value={defaultContext}>
        {component}
      </AdminAuthContext.Provider>
    </BrowserRouter>
  );
};

describe('AdminProtectedRoute', () => {
  it('shows loading state when loading', () => {
    renderWithContext(
      <AdminProtectedRoute>
        <div>Protected Content</div>
      </AdminProtectedRoute>,
      { loading: true }
    );

    expect(screen.getByText('Verifying admin access...')).toBeInTheDocument();
  });

  it('renders children when authenticated and authorized', () => {
    renderWithContext(
      <AdminProtectedRoute requiredPermission={AdminPermission.USER_MANAGEMENT}>
        <div>Protected Content</div>
      </AdminProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows access denied when user lacks required permission', () => {
    renderWithContext(
      <AdminProtectedRoute requiredPermission={AdminPermission.SYSTEM_CONFIG}>
        <div>Protected Content</div>
      </AdminProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/you don't have the required permission/i)).toBeInTheDocument();
  });

  it('shows access denied when user lacks required role', () => {
    renderWithContext(
      <AdminProtectedRoute requiredRole={UserRole.SUPER_ADMIN}>
        <div>Protected Content</div>
      </AdminProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/you don't have the required role/i)).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    renderWithContext(
      <AdminProtectedRoute>
        <div>Protected Content</div>
      </AdminProtectedRoute>,
      { isAuthenticated: false, adminUser: null }
    );

    // Since we're using Navigate, the component won't render the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});