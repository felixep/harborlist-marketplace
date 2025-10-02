import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLayout from '../AdminLayout';
import { AdminAuthContext } from '../AdminAuthProvider';
import { UserRole, AdminPermission, UserStatus } from '../../../../../backend/src/types/common';

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

describe('AdminLayout', () => {
  it('renders loading state when loading', () => {
    const loadingContext = { ...mockAuthContext, loading: true };
    
    render(
      <BrowserRouter>
        <AdminAuthContext.Provider value={loadingContext}>
          <AdminLayout>
            <div>Test Content</div>
          </AdminLayout>
        </AdminAuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument();
  });

  it('renders admin layout with header, sidebar, and content', () => {
    renderWithContext(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('HarborList Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders children content in main area', () => {
    renderWithContext(
      <AdminLayout>
        <div data-testid="test-content">Custom Admin Content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Admin Content')).toBeInTheDocument();
  });
});