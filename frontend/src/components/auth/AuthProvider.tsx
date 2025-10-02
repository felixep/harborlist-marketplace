/**
 * @fileoverview Authentication provider and context for the HarborList platform.
 * 
 * Provides centralized authentication state management using React Context.
 * Handles user login, registration, logout, and authentication status across
 * the entire application with secure JWT token management.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { createContext, useContext } from 'react';
import { useAuthState } from '../../hooks/useAuth';

/**
 * User interface representing authenticated user data
 * 
 * @interface User
 * @property {string} id - Unique user identifier from the database
 * @property {string} userId - Alternative user ID (legacy compatibility)
 * @property {string} name - User's display name
 * @property {string} email - User's email address (unique)
 */
interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
}

/**
 * Authentication context type definition
 * 
 * Defines the shape of the authentication context value that will be
 * provided to all child components through React Context.
 * 
 * @interface AuthContextType
 * @property {User | null} user - Current authenticated user or null if not logged in
 * @property {(email: string, password: string) => Promise<void>} login - Login function with email/password
 * @property {(name: string, email: string, password: string) => Promise<void>} register - Registration function
 * @property {() => void} logout - Logout function that clears user session
 * @property {boolean} loading - Loading state for authentication operations
 * @property {boolean} isAuthenticated - Computed boolean indicating if user is logged in
 */
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * React Context for authentication state management
 * 
 * Provides authentication state and methods to all child components.
 * Initialized as undefined to enforce proper provider usage.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to access authentication context
 * 
 * Provides a safe way to access authentication state and methods from any
 * component within the AuthProvider tree. Includes runtime validation to
 * ensure the hook is used within the proper context.
 * 
 * @returns {AuthContextType} Authentication context with user state and methods
 * @throws {Error} When used outside of AuthProvider component tree
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, login, logout, isAuthenticated } = useAuth();
 *   
 *   if (isAuthenticated) {
 *     return <div>Welcome, {user?.name}!</div>;
 *   }
 *   
 *   return <button onClick={() => login(email, password)}>Login</button>;
 * }
 * ```
 * 
 * @security
 * - Validates context availability to prevent runtime errors
 * - Ensures authentication state is properly initialized
 * - Provides type-safe access to authentication methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication provider component props
 * 
 * @interface AuthProviderProps
 * @property {React.ReactNode} children - Child components that need access to auth context
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication provider component for the HarborList platform
 * 
 * Wraps the application with authentication context, providing centralized
 * user state management and authentication methods to all child components.
 * Integrates with the useAuthState hook for actual authentication logic.
 * 
 * Features:
 * - Centralized authentication state management
 * - JWT token handling and persistence
 * - Automatic token refresh and validation
 * - Secure logout with token cleanup
 * - Loading states for authentication operations
 * - Error handling for authentication failures
 * 
 * @param {AuthProviderProps} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with auth context
 * @returns {JSX.Element} Provider component with authentication context
 * 
 * @example
 * ```tsx
 * // Wrap your app with AuthProvider
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/login" element={<LoginPage />} />
 *           <Route path="/dashboard" element={
 *             <ProtectedRoute>
 *               <Dashboard />
 *             </ProtectedRoute>
 *           } />
 *         </Routes>
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 * ```
 * 
 * @security
 * - Secure JWT token storage and management
 * - Automatic token validation on app initialization
 * - Secure logout with complete session cleanup
 * - Protection against XSS and CSRF attacks
 * 
 * @performance
 * - Minimal re-renders through optimized context value
 * - Efficient token refresh mechanism
 * - Lazy loading of authentication state
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuthState();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
