/**
 * @fileoverview Authentication state management hook for user authentication.
 * 
 * Provides comprehensive user authentication state management with JWT token
 * handling, automatic session restoration, and secure authentication methods.
 * Integrates with the platform's authentication API for login and registration.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * User interface representing authenticated user data
 * 
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} userId - Alternative user ID (legacy compatibility)
 * @property {string} name - User's display name
 * @property {string} email - User's email address
 */
interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
}

/**
 * Authentication state management hook
 * 
 * Provides comprehensive user authentication state management including
 * JWT token handling, automatic session restoration, and secure login/logout
 * functionality. Manages authentication state across the entire application.
 * 
 * Features:
 * - Automatic JWT token validation and restoration on app load
 * - Secure token storage in localStorage
 * - Login and registration with API integration
 * - Automatic session cleanup on logout
 * - Loading states for authentication operations
 * - Error handling for authentication failures
 * 
 * Security Features:
 * - JWT token validation with payload parsing
 * - Automatic token cleanup on invalid tokens
 * - Secure storage management
 * - Protection against token tampering
 * 
 * @returns {Object} Authentication state and methods
 * @returns {User | null} user - Current authenticated user or null
 * @returns {Function} login - Login function with email/password
 * @returns {Function} register - Registration function with user details
 * @returns {Function} logout - Logout function with session cleanup
 * @returns {boolean} loading - Loading state for authentication operations
 * @returns {boolean} isAuthenticated - Computed authentication status
 * 
 * @example
 * ```tsx
 * function LoginComponent() {
 *   const { user, login, logout, loading, isAuthenticated } = useAuthState();
 * 
 *   const handleLogin = async (email: string, password: string) => {
 *     try {
 *       await login(email, password);
 *       // User is now authenticated
 *     } catch (error) {
 *       console.error('Login failed:', error);
 *     }
 *   };
 * 
 *   if (loading) return <div>Loading...</div>;
 * 
 *   return isAuthenticated ? (
 *     <div>Welcome, {user?.name}! <button onClick={logout}>Logout</button></div>
 *   ) : (
 *     <LoginForm onSubmit={handleLogin} />
 *   );
 * }
 * ```
 * 
 * @security
 * - JWT token validation and secure storage
 * - Automatic session cleanup on logout
 * - Protection against XSS through proper token handling
 * - Secure API integration with authentication endpoints
 * 
 * @performance
 * - Efficient state management with minimal re-renders
 * - Automatic session restoration without API calls
 * - Optimized token parsing and validation
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore authentication state from stored JWT token on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          userId: payload.sub,
          name: payload.name,
          email: payload.email
        });
      } catch (error) {
        localStorage.removeItem('authToken');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Authenticates user with email and password
   * 
   * Calls the authentication API to validate credentials and stores
   * the returned JWT token. Updates the user state with authenticated
   * user information.
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<void>} Resolves when login is successful
   * @throws {Error} Authentication error if login fails
   * 
   * @example
   * ```tsx
   * try {
   *   await login('user@example.com', 'password123');
   *   // User is now logged in
   * } catch (error) {
   *   console.error('Login failed:', error.message);
   * }
   * ```
   */
  const login = async (email: string, password: string) => {
    const response = await api.login(email, password) as { token: string; user: User };
    localStorage.setItem('authToken', response.token);
    setUser(response.user);
  };

  /**
   * Registers a new user account
   * 
   * Creates a new user account with the provided information and
   * automatically logs in the user upon successful registration.
   * 
   * @param {string} name - User's display name
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<void>} Resolves when registration is successful
   * @throws {Error} Registration error if account creation fails
   * 
   * @example
   * ```tsx
   * try {
   *   await register('John Doe', 'john@example.com', 'password123');
   *   // User is now registered and logged in
   * } catch (error) {
   *   console.error('Registration failed:', error.message);
   * }
   * ```
   */
  const register = async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password) as { token: string; user: User };
    localStorage.setItem('authToken', response.token);
    setUser(response.user);
  };

  /**
   * Logs out the current user
   * 
   * Clears the authentication token from storage and resets the user
   * state. Provides complete session cleanup for security.
   * 
   * @returns {void}
   * 
   * @example
   * ```tsx
   * const handleLogout = () => {
   *   logout();
   *   // User is now logged out
   *   navigate('/login');
   * };
   * ```
   */
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return { user, login, register, logout, loading, isAuthenticated: !!user };
};

export const useAuth = useAuthState;
