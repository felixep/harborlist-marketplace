/**
 * @fileoverview Protected route component for authentication-required pages.
 * 
 * Provides route-level authentication protection by checking user authentication
 * status and redirecting to login page if not authenticated. Preserves the
 * intended destination for post-login redirection.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Props interface for the ProtectedRoute component
 * 
 * @interface ProtectedRouteProps
 * @property {React.ReactNode} children - Components to render if user is authenticated
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route component for authentication-required pages
 * 
 * Wraps components that require user authentication, automatically redirecting
 * unauthenticated users to the login page while preserving their intended
 * destination for post-login redirection.
 * 
 * Features:
 * - Automatic authentication status checking
 * - Graceful loading state handling
 * - Intended destination preservation for post-login redirect
 * - Clean navigation with replace flag to avoid back button issues
 * - Responsive loading spinner with maritime theming
 * 
 * Authentication Flow:
 * 1. Check if authentication is still loading
 * 2. Show loading spinner during authentication check
 * 3. Redirect to login if not authenticated (with return URL)
 * 4. Render protected content if authenticated
 * 
 * @param {ProtectedRouteProps} props - Component props
 * @param {React.ReactNode} props.children - Content to render for authenticated users
 * @returns {JSX.Element} Protected content, loading spinner, or redirect to login
 * 
 * @example
 * ```tsx
 * // Protect a route that requires authentication
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 * 
 * // Protect multiple nested routes
 * <Route path="/profile/*" element={
 *   <ProtectedRoute>
 *     <Routes>
 *       <Route path="settings" element={<Settings />} />
 *       <Route path="listings" element={<MyListings />} />
 *     </Routes>
 *   </ProtectedRoute>
 * } />
 * ```
 * 
 * @security
 * - Prevents unauthorized access to protected content
 * - Preserves intended destination securely in navigation state
 * - Uses replace navigation to prevent back button bypass
 * - Integrates with secure authentication context
 * 
 * @performance
 * - Minimal re-renders through efficient authentication checking
 * - Fast loading state transitions
 * - Optimized navigation with replace flag
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Store the intended destination in state so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
