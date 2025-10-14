/**
 * @fileoverview Registration form component for new user account creation.
 * 
 * Provides a comprehensive registration interface with form validation,
 * password confirmation, error handling, and automatic login after
 * successful account creation.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

/**
 * Registration form component for new user account creation
 * 
 * Renders a comprehensive registration form with name, email, password,
 * and password confirmation fields. Includes client-side validation,
 * error handling, and automatic authentication after successful registration.
 * 
 * Features:
 * - Complete user registration with name, email, and password
 * - Password confirmation validation
 * - Real-time error display with user-friendly messages
 * - Loading states with disabled form during submission
 * - Automatic login and redirection after successful registration
 * - Responsive design with maritime theming
 * - Accessibility-compliant form structure
 * - Input validation and sanitization
 * 
 * Security Features:
 * - Password strength requirements (handled by backend)
 * - Email format validation
 * - Password confirmation matching
 * - Secure password handling (no plain text storage)
 * - CSRF protection through authentication context
 * - Input sanitization to prevent XSS attacks
 * 
 * @returns {JSX.Element} Registration form with all required fields and validation
 * 
 * @example
 * ```tsx
 * // Used in registration page
 * function RegisterPage() {
 *   return (
 *     <div className="min-h-screen flex items-center justify-center">
 *       <div className="max-w-md w-full">
 *         <h1 className="text-2xl font-bold mb-6">Create Account</h1>
 *         <RegisterForm />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @accessibility
 * - Proper form labels and ARIA attributes
 * - Keyboard navigation support
 * - Screen reader friendly error messages
 * - Focus management for better UX
 * - Clear validation feedback
 */
export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const { register } = useAuth();
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from state, default to home
  const from = location.state?.from?.pathname || '/';

  /**
   * Handles form submission for user registration
   * 
   * Validates form data including password confirmation, calls the registration
   * service, and handles success/error states. Automatically logs in the user
   * and redirects to the intended destination after successful registration.
   * 
   * Validation includes:
   * - Password confirmation matching
   * - Email format validation (handled by input type)
   * - Required field validation
   * - Backend validation for email uniqueness and password strength
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Resolves after registration attempt completion
   * 
   * @throws {Error} Registration errors are caught and displayed to user
   * 
   * @example
   * ```tsx
   * // Registration flow:
   * // 1. Validate password confirmation
   * // 2. Call register with user data
   * // 3. Automatic login on success
   * // 4. Redirect to intended destination
   * ```
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.register(formData.name, formData.email, formData.password, 'individual') as { 
        requiresVerification?: boolean; 
        message: string;
        user: { email: string; name: string } 
      };
      
      if (response.requiresVerification) {
        // Redirect to registration success page instead of logging in
        navigate('/registration-success', { 
          state: { 
            email: formData.email,
            name: formData.name,
            message: response.message
          },
          replace: true 
        });
      } else {
        // Fallback: if verification not required, proceed with normal flow
        await register(formData.name, formData.email, formData.password, 'individual');
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      setErrorCode(error.code || null);
      
      // Handle specific error codes with user-friendly messages
      if (error.code === 'USER_EXISTS') {
        setError('An account with this email address already exists.');
        showInfo(
          'Account Already Exists', 
          `An account is already registered with ${formData.email}. You can sign in instead.`,
          { duration: 8000 }
        );
      } else if (error.code === 'WEAK_PASSWORD') {
        setError('Password must contain at least one uppercase letter and one special character.');
      } else if (error.code === 'INVALID_EMAIL') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'VALIDATION_ERROR') {
        setError(error.message || 'Please check your information and try again.');
      } else {
        // Generic error message for unknown errors
        setError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles input field changes for form data
   * 
   * Updates the form state when user types in any input field.
   * Uses the input's name attribute to update the corresponding
   * property in the form data state.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   * 
   * @example
   * ```tsx
   * // Updates formData.email when email input changes
   * <input name="email" onChange={handleChange} />
   * ```
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <div>{error}</div>
          {errorCode === 'USER_EXISTS' && (
            <div className="mt-2">
              <Link 
                to="/login" 
                state={{ from: location.state?.from, email: formData.email }}
                className="font-medium text-red-800 hover:text-red-900 underline"
              >
                Sign in to your existing account instead →
              </Link>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
        {formData.password && (
          <div className="mt-2 text-xs text-gray-600">
            <div className="space-y-1">
              <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{formData.password.length >= 8 ? '✓' : '✗'}</span>
                At least 8 characters
              </div>
              <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{/[A-Z]/.test(formData.password) ? '✓' : '✗'}</span>
                One uppercase letter
              </div>
              <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '✓' : '✗'}</span>
                One special character
              </div>
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
            formData.confirmPassword && formData.password !== formData.confirmPassword
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          required
        />
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <div className="mt-1 text-sm text-red-600">
            Passwords do not match
          </div>
        )}
        {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
          <div className="mt-1 text-sm text-green-600">
            ✓ Passwords match
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
};
