/**
 * @fileoverview Protected route component for admin pages with role-based access control.
 * 
 * Provides comprehensive route protection for admin pages with support for
 * role-based and permission-based access control. Handles authentication
 * checking, loading states, and user-friendly error messages.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminPermission, UserRole } from '@harborlist/shared-types';

/**
 * Props interface for the AdminProtectedRoute component
 * 
 * @interface AdminProtectedRouteProps
 * @property {React.ReactNode} children - Components to render if access is granted
 * @property {AdminPermission} [requiredPermission] - Specific permission required for access
 * @property {UserRole} [requiredRole] - Specific role required for access
 * @property {string} [fallbackPath='/admin/login'] - Path to redirect to if not authenticated
 */
interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: AdminPermission;
  requiredRole?: UserRole;
  fallbackPath?: string;
}

/**
 * Protected route component for admin pages with role-based access control
 * 
 * Provides comprehensive route protection with multiple layers of security:
 * - Authentication verification (admin login required)
 * - Role-based access control (Admin, Super Admin, Moderator, Support)
 * - Permission-based access control (granular permissions)
 * - User-friendly error messages for access denial
 * - Loading states during authentication checks
 * 
 * Access Control Hierarchy:
 * 1. Authentication check (must be logged in as admin)
 * 2. Role check (if requiredRole specified)
 * 3. Permission check (if requiredPermission specified)
 * 4. Grant access if all checks pass
 * 
 * Features:
 * - Flexible role and permission requirements
 * - Graceful loading states with branded spinner
 * - Informative access denied messages
 * - Automatic redirection to login for unauthenticated users
 * - Preservation of intended destination for post-login redirect
 * - Responsive design for error states
 * 
 * @param {AdminProtectedRouteProps} props - Component props
 * @param {React.ReactNode} props.children - Content to render if access is granted
 * @param {AdminPermission} [props.requiredPermission] - Required permission for access
 * @param {UserRole} [props.requiredRole] - Required role for access
 * @param {string} [props.fallbackPath='/admin/login'] - Redirect path for unauthenticated users
 * @returns {JSX.Element} Protected content, loading spinner, error message, or redirect
 * 
 * @example
 * ```tsx
 * // Basic admin route protection
 * <AdminProtectedRoute>
 *   <AdminDashboard />
 * </AdminProtectedRoute>
 * 
 * // Role-based protection
 * <AdminProtectedRoute requiredRole={UserRole.SUPER_ADMIN}>
 *   <SystemSettings />
 * </AdminProtectedRoute>
 * 
 * // Permission-based protection
 * <AdminProtectedRoute requiredPermission={AdminPermission.USER_MANAGEMENT}>
 *   <UserManagement />
 * </AdminProtectedRoute>
 * 
 * // Combined role and permission protection
 * <AdminProtectedRoute 
 *   requiredRole={UserRole.ADMIN}
 *   requiredPermission={AdminPermission.CONTENT_MODERATION}
 * >
 *   <ContentModeration />
 * </AdminProtectedRoute>
 * ```
 * 
 * @security
 * - Multi-layer access control (auth + role + permission)
 * - Secure redirection with state preservation
 * - Protection against privilege escalation
 * - Clear access denial feedback
 * 
 * @accessibility
 * - Screen reader friendly error messages
 * - Proper loading state announcements
 * - Clear visual feedback for access status
 * - Keyboard navigation support
 */
const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallbackPath = '/admin/login',
}) => {
  const { isAuthenticated, hasPermission, hasRole, loading, adminUser } = useAdminAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="loading-spinner">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="role-denied">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have the required role to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required: {requiredRole?.replace('_', ' ').toLowerCase()} | 
            Your role: {adminUser?.role?.replace('_', ' ').toLowerCase()}
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="permission-denied">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have the required permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required permission: {requiredPermission?.replace('_', ' ').toLowerCase()}
          </p>
        </div>
      </div>
    );
  }

  // Render the protected content
  return <>{children}</>;
};

export default AdminProtectedRoute;