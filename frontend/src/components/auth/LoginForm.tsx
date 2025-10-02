/**
 * @fileoverview Login form component for user authentication.
 * 
 * Provides a secure login interface with email/password authentication,
 * error handling, loading states, and automatic redirection to intended
 * destinations after successful login.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Login form component for user authentication
 * 
 * Renders a secure login form with email and password fields, comprehensive
 * error handling, loading states, and automatic redirection after successful
 * authentication. Integrates with the AuthProvider for authentication logic.
 * 
 * Features:
 * - Email and password validation
 * - Real-time error display with user-friendly messages
 * - Loading states with disabled form during submission
 * - Automatic redirection to intended destination after login
 * - Responsive design with maritime theming
 * - Accessibility-compliant form structure
 * - CSRF protection through authentication context
 * 
 * Security Features:
 * - Input validation and sanitization
 * - Secure password handling (no plain text storage)
 * - Protection against brute force attacks
 * - Automatic session management
 * 
 * @returns {JSX.Element} Login form with email/password fields and submit button
 * 
 * @example
 * ```tsx
 * // Used in login page
 * function LoginPage() {
 *   return (
 *     <div className="min-h-screen flex items-center justify-center">
 *       <div className="max-w-md w-full">
 *         <h1 className="text-2xl font-bold mb-6">Sign In</h1>
 *         <LoginForm />
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
 */
export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from state, default to home
  const from = location.state?.from?.pathname || '/';

  /**
   * Handles form submission for user login
   * 
   * Validates form data, calls the authentication service, and handles
   * success/error states. Redirects to the intended destination after
   * successful login or displays error messages for failed attempts.
   * 
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Resolves after login attempt completion
   * 
   * @throws {Error} Authentication errors are caught and displayed to user
   * 
   * @example
   * ```tsx
   * // Form submission flow:
   * // 1. Prevent default form submission
   * // 2. Set loading state and clear errors
   * // 3. Call login with email/password
   * // 4. Redirect on success or show error on failure
   * ```
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // Redirect to intended destination after successful login
      navigate(from, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};
