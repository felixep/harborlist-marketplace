import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdminLogin from '../../../pages/admin/AdminLogin';
import { AdminAuthProvider } from '../AdminAuthProvider';

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

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const renderAdminLogin = () => {
  return render(
    <BrowserRouter>
      <AdminAuthProvider>
        <AdminLogin />
      </AdminAuthProvider>
    </BrowserRouter>
  );
};

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (global.fetch as any).mockClear();
    mockAdminApi.validateToken.mockResolvedValue({ valid: false, user: null });
    mockAdminApi.login.mockRejectedValue(new Error('Should not be called during validation'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    renderAdminLogin();
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByText('Access the HarborList admin dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to admin dashboard/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderAdminLogin();
    
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    // Mock console.log to see if validation is being called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    renderAdminLogin();
    
    // Wait for the component to be fully loaded
    await waitFor(() => {
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    });
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } }); // Valid password to isolate email validation
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check that login was not called due to validation failure
    expect(mockAdminApi.login).not.toHaveBeenCalled();

    // Wait for the validation to complete and errors to be set
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('shows validation error for short password', async () => {
    renderAdminLogin();
    
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderAdminLogin();
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: '' }); // Password toggle button
    
    expect(passwordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('clears field errors when user starts typing', async () => {
    renderAdminLogin();
    
    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    // Trigger validation error
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    
    // Start typing to clear error
    fireEvent.change(emailInput, { target: { value: 'a' } });
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    mockAdminApi.login.mockResolvedValue({
      token: 'mock-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['user_management'],
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        sessionTimeout: 60
      }
    });

    renderAdminLogin();
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockAdminApi.login).toHaveBeenCalledWith('admin@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    }, { timeout: 3000 });
  });

  it('handles login failure', async () => {
    mockAdminApi.login.mockRejectedValue(new Error('Invalid credentials'));

    renderAdminLogin();
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword123' } }); // Make sure it's 8+ chars
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loading state during login', async () => {
    // Create a promise that we can control
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    
    mockAdminApi.login.mockReturnValue(loginPromise);

    renderAdminLogin();
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveLogin!({
      token: 'mock-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        permissions: [],
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        sessionTimeout: 60
      }
    });

    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
    });
  });

  it('disables form inputs during loading', async () => {
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    
    mockAdminApi.login.mockReturnValue(loginPromise);

    renderAdminLogin();
    
    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in to admin dashboard/i });
    
    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check that inputs are disabled during loading
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    
    // Resolve the promise
    resolveLogin!({
      token: 'mock-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        permissions: [],
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        sessionTimeout: 60
      }
    });

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });
  });
});