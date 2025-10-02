import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminAuthProvider } from '../AdminAuthProvider';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { UserRole, UserStatus, AdminPermission } from '../../../types/common';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the admin API
const mockAdminApi = {
  login: vi.fn(),
  validateToken: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../../../services/adminApi', () => ({
  adminApi: mockAdminApi
}));

// Test component to access the context
const TestComponent: React.FC = () => {
  const { 
    adminUser, 
    isAuthenticated, 
    loading, 
    login, 
    logout, 
    hasPermission, 
    hasRole,
    sessionTimeRemaining 
  } = useAdminAuth();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user-email">{adminUser?.email || 'none'}</div>
      <div data-testid="user-role">{adminUser?.role || 'none'}</div>
      <div data-testid="session-time">{sessionTimeRemaining}</div>
      <div data-testid="has-user-mgmt">{hasPermission(AdminPermission.USER_MANAGEMENT).toString()}</div>
      <div data-testid="is-admin">{hasRole(UserRole.ADMIN).toString()}</div>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <AdminAuthProvider>
      <TestComponent />
    </AdminAuthProvider>
  );
};

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('initializes with no user and loading false', async () => {
    // No token in localStorage, should not call validateToken
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });
  });

  it('restores session from valid token', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: [AdminPermission.USER_MANAGEMENT],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    // Mock valid token in localStorage
    const mockToken = btoa(JSON.stringify({
      sub: '1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }));
    localStorage.setItem('adminAuthToken', `header.${mockToken}.signature`);

    mockAdminApi.validateToken.mockResolvedValue({
      valid: true,
      user: mockUser
    });

    renderWithProvider();

    await waitFor(() => {
      expect(mockAdminApi.validateToken).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin@test.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    }, { timeout: 3000 });
  });

  it('clears invalid token on initialization', async () => {
    // Mock expired token
    const expiredToken = btoa(JSON.stringify({
      sub: '1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    }));
    localStorage.setItem('adminAuthToken', `header.${expiredToken}.signature`);

    renderWithProvider();

    await waitFor(() => {
      expect(localStorage.getItem('adminAuthToken')).toBeNull();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('handles successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: [AdminPermission.USER_MANAGEMENT],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(mockAdminApi.login).toHaveBeenCalledWith('test@test.com', 'password');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin@test.com');
      expect(localStorage.getItem('adminAuthToken')).toBe('mock-token');
    }, { timeout: 3000 });
  });

  it('handles login failure', async () => {
    mockAdminApi.login.mockRejectedValue(new Error('Invalid credentials'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Login should throw an error, but we need to catch it in the component
    let loginError: Error | null = null;
    try {
      await act(async () => {
        screen.getByText('Login').click();
      });
    } catch (error) {
      loginError = error as Error;
    }

    await waitFor(() => {
      expect(mockAdminApi.login).toHaveBeenCalled();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('handles logout correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: [AdminPermission.USER_MANAGEMENT],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    // Login first
    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    // Then logout
    act(() => {
      screen.getByText('Logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      expect(localStorage.getItem('adminAuthToken')).toBeNull();
    });
  });

  it('checks permissions correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: [AdminPermission.USER_MANAGEMENT],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('has-user-mgmt')).toHaveTextContent('true');
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    });
  });

  it('gives super admin all permissions', async () => {
    const mockUser = {
      id: '1',
      email: 'superadmin@test.com',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      permissions: [], // Empty permissions array
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      // Super admin should have all permissions even with empty permissions array
      expect(screen.getByTestId('has-user-mgmt')).toHaveTextContent('true');
    });
  });

  it('manages session timeout correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: [AdminPermission.USER_MANAGEMENT],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 1 // 1 minute timeout for testing
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    act(() => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    // Fast forward time to trigger session timeout
    act(() => {
      vi.advanceTimersByTime(61000); // 61 seconds
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('rejects non-admin users', async () => {
    const mockUser = {
      id: '1',
      email: 'user@test.com',
      name: 'Regular User',
      role: UserRole.USER, // Not an admin role
      permissions: [],
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      sessionTimeout: 60
    };

    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: mockUser
    });

    renderWithProvider();

    // Login should throw an error for non-admin users
    let loginError: Error | null = null;
    try {
      await act(async () => {
        screen.getByText('Login').click();
      });
    } catch (error) {
      loginError = error as Error;
    }

    await waitFor(() => {
      expect(mockAdminApi.login).toHaveBeenCalled();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });
});