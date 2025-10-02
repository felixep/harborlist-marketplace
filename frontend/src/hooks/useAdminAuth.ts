/**
 * @fileoverview Admin authentication hook with role-based access control.
 * 
 * Provides access to admin authentication context with comprehensive
 * role and permission checking capabilities. Integrates with the
 * AdminAuthProvider for centralized admin authentication management.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useContext } from 'react';
import { AdminUser, UserRole, AdminPermission } from '../../../backend/src/types/common';
import { AdminAuthContext } from '../components/admin/AdminAuthProvider';

/**
 * Admin authentication context type definition
 * 
 * @interface AdminAuthContextType
 * @property {AdminUser | null} adminUser - Current authenticated admin user
 * @property {Function} login - Admin login function
 * @property {Function} logout - Admin logout function
 * @property {boolean} loading - Loading state for authentication operations
 * @property {boolean} isAuthenticated - Authentication status
 * @property {Function} hasPermission - Permission checking function
 * @property {Function} hasRole - Role checking function
 * @property {Function} refreshSession - Session refresh function
 * @property {number} sessionTimeRemaining - Remaining session time in seconds
 */
interface AdminAuthContextType {
  adminUser: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: AdminPermission) => boolean;
  hasRole: (role: UserRole) => boolean;
  refreshSession: () => Promise<void>;
  sessionTimeRemaining: number;
}

/**
 * Admin authentication hook with role-based access control
 * 
 * Provides access to admin authentication state and methods with comprehensive
 * role and permission checking capabilities. Must be used within an
 * AdminAuthProvider component tree.
 * 
 * Features:
 * - Admin user authentication state
 * - Role-based access control (Admin, Super Admin, Moderator, Support)
 * - Granular permission checking system
 * - Session management with timeout tracking
 * - Automatic session refresh capabilities
 * - Secure logout with complete cleanup
 * 
 * Permission System:
 * - USER_MANAGEMENT: Manage platform users
 * - CONTENT_MODERATION: Moderate listings and content
 * - ANALYTICS_VIEW: Access analytics and reports
 * - SYSTEM_CONFIG: Configure platform settings
 * - AUDIT_LOG_VIEW: View audit logs and system events
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN: Full access to all features and permissions
 * - ADMIN: Administrative access with most permissions
 * - MODERATOR: Content moderation and user management
 * - SUPPORT: Customer support and basic admin functions
 * 
 * @returns {AdminAuthContextType} Admin authentication context with state and methods
 * @throws {Error} When used outside of AdminAuthProvider
 * 
 * @example
 * ```tsx
 * function AdminComponent() {
 *   const { 
 *     adminUser, 
 *     isAuthenticated, 
 *     hasPermission, 
 *     hasRole,
 *     sessionTimeRemaining 
 *   } = useAdminAuth();
 * 
 *   if (!isAuthenticated) {
 *     return <Navigate to="/admin/login" />;
 *   }
 * 
 *   return (
 *     <div>
 *       <h1>Welcome, {adminUser?.name}</h1>
 *       <p>Role: {adminUser?.role}</p>
 *       <p>Session expires in: {sessionTimeRemaining}s</p>
 *       
 *       {hasPermission(AdminPermission.USER_MANAGEMENT) && (
 *         <UserManagementPanel />
 *       )}
 *       
 *       {hasRole(UserRole.SUPER_ADMIN) && (
 *         <SystemConfigPanel />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @security
 * - Role-based access control with permission granularity
 * - Session timeout management with activity tracking
 * - Secure token handling and validation
 * - Protection against privilege escalation
 * 
 * @performance
 * - Efficient permission checking with memoization
 * - Optimized context access with minimal re-renders
 * - Background session management
 */
export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  
  return context;
};