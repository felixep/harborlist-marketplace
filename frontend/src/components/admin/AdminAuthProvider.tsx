/**
 * @fileoverview Admin authentication provider with role-based access control.
 * 
 * Provides comprehensive admin authentication with JWT token management,
 * role-based permissions, session timeout handling, and activity tracking.
 * Supports multiple admin roles with granular permission checking.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { AdminUser, AdminPermission, UserRole, UserStatus } from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';
import { config } from '../../config/env';

/**
 * Admin authentication context type definition
 * 
 * Defines the complete interface for admin authentication state and methods,
 * including role-based access control and session management.
 * 
 * @interface AdminAuthContextType
 * @property {AdminUser | null} adminUser - Current authenticated admin user or null
 * @property {(email: string, password: string) => Promise<void>} login - Admin login function
 * @property {() => void} logout - Admin logout function with session cleanup
 * @property {boolean} loading - Loading state for authentication operations
 * @property {boolean} isAuthenticated - Computed boolean indicating admin authentication status
 * @property {(permission: AdminPermission) => boolean} hasPermission - Permission checking function
 * @property {(role: UserRole) => boolean} hasRole - Role checking function
 * @property {() => Promise<void>} refreshSession - Session refresh function
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
  handleMFAChallenge?: (mfaCode: string) => Promise<void>;
  requiresMFA: boolean;
}

/**
 * React Context for admin authentication state management
 * 
 * Provides admin authentication state and methods to all child components
 * within the admin portal. Separate from regular user authentication.
 */
export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

/** Local storage key for admin JWT token */
const ADMIN_TOKEN_KEY = 'adminAuthToken';

/** Interval for checking session timeout (1 minute) */
const SESSION_CHECK_INTERVAL = 60000;

/** Staff session timeout in minutes (8 hours) */
const STAFF_SESSION_TIMEOUT_MINUTES = 8 * 60;

/** DOM events that indicate user activity for session management */
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

/**
 * Admin authentication provider component props
 * 
 * @interface AdminAuthProviderProps
 * @property {React.ReactNode} children - Child components that need admin auth context
 */
interface AdminAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Admin authentication provider component for the HarborList admin portal
 * 
 * Provides comprehensive admin authentication with advanced features:
 * - JWT token management with automatic validation
 * - Role-based access control (Admin, Super Admin, Moderator, Support)
 * - Granular permission checking system
 * - Session timeout with activity tracking
 * - Automatic session refresh
 * - Secure token storage and cleanup
 * 
 * Security Features:
 * - Separate admin token storage from user tokens
 * - Role validation on login and token refresh
 * - Activity-based session management
 * - Automatic logout on session expiry
 * - Token validation with server-side verification
 * - Protection against privilege escalation
 * 
 * Session Management:
 * - Tracks user activity across multiple DOM events
 * - Configurable session timeout per admin user
 * - Real-time session time remaining display
 * - Automatic cleanup on logout or expiry
 * - Background session validation
 * 
 * @param {AdminAuthProviderProps} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with admin auth context
 * @returns {JSX.Element} Provider component with admin authentication context
 * 
 * @example
 * ```tsx
 * // Wrap admin routes with AdminAuthProvider
 * function AdminApp() {
 *   return (
 *     <AdminAuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/admin/login" element={<AdminLogin />} />
 *           <Route path="/admin/*" element={
 *             <AdminProtectedRoute>
 *               <AdminLayout>
 *                 <AdminRoutes />
 *               </AdminLayout>
 *             </AdminProtectedRoute>
 *           } />
 *         </Routes>
 *       </Router>
 *     </AdminAuthProvider>
 *   );
 * }
 * ```
 * 
 * @security
 * - Role-based authentication with permission granularity
 * - Secure JWT token handling with validation
 * - Activity tracking for session security
 * - Automatic session cleanup and logout
 * - Protection against unauthorized access
 * 
 * @performance
 * - Efficient activity tracking with event delegation
 * - Optimized session checking intervals
 * - Minimal re-renders through careful state management
 * - Background token validation
 */
export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const sessionCheckInterval = useRef<number | null>(null);
  const lastActivityTime = useRef<number>(Date.now());
  const sessionRefreshInterval = useRef<number | null>(null);

  // Track user activity for session management
  const updateLastActivity = useCallback(() => {
    lastActivityTime.current = Date.now();
  }, []);

  // Set up activity listeners
  useEffect(() => {
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, updateLastActivity, true);
      });
    };
  }, [updateLastActivity]);

  // Validate and restore session from token using Staff User Pool
  const validateAndRestoreSession = useCallback(async (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }
      
      // Verify this is a staff token from Staff User Pool
      const expectedIssuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${config.cognitoStaffPoolId}`;
      if (payload.iss !== expectedIssuer) {
        console.warn('Token is not from Staff User Pool, removing token');
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      // Verify staff role from cognito:groups
      const groups = payload['cognito:groups'] || [];
      const validStaffRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR, UserRole.SUPPORT];
      const hasValidRole = groups.some((group: string) => validStaffRoles.includes(group as UserRole));
      
      if (!hasValidRole) {
        console.warn('Token does not contain valid staff role, removing token');
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      // Validate token with auth service staff endpoint
      const validationResult = await adminApi.validateStaffToken(token);

      if (!validationResult.valid) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      const userData = validationResult.user;
      
      // Map staff data to AdminUser format for backward compatibility
      setAdminUser({
        id: userData.id || payload.sub,
        email: userData.email || payload.email,
        name: userData.name || payload.name,
        role: userData.role || determineRoleFromGroups(groups),
        permissions: userData.permissions || getPermissionsFromRole(userData.role),
        status: userData.status || UserStatus.ACTIVE,
        emailVerified: userData.emailVerified || payload.email_verified || false,
        phoneVerified: userData.phoneVerified || payload.phone_number_verified || false,
        mfaEnabled: userData.mfaEnabled || false,
        loginAttempts: userData.loginAttempts || 0,
        createdAt: userData.createdAt || payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
        sessionTimeout: STAFF_SESSION_TIMEOUT_MINUTES, // 8 hours for staff users (in minutes)
        phone: userData.phone || payload.phone_number,
        location: userData.location,
        lastLogin: userData.lastLogin || new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Staff session validation failed:', error);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return false;
    }
  }, []);

  // Helper function to determine role from Cognito groups
  const determineRoleFromGroups = useCallback((groups: string[]): UserRole => {
    // Check for roles in order of precedence
    if (groups.includes('super-admin')) return UserRole.SUPER_ADMIN;
    if (groups.includes('admin')) return UserRole.ADMIN;
    if (groups.includes('manager')) return UserRole.MODERATOR; // Map manager to moderator for compatibility
    if (groups.includes('team-member')) return UserRole.SUPPORT; // Map team-member to support for compatibility
    return UserRole.SUPPORT; // Default fallback
  }, []);

  // Helper function to get permissions based on role
  const getPermissionsFromRole = useCallback((role: UserRole): AdminPermission[] => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return Object.values(AdminPermission);
      case UserRole.ADMIN:
        return [
          AdminPermission.USER_MANAGEMENT,
          AdminPermission.CONTENT_MODERATION,
          AdminPermission.SYSTEM_CONFIG,
          AdminPermission.ANALYTICS_VIEW,
          AdminPermission.AUDIT_LOG_VIEW,
          AdminPermission.TIER_MANAGEMENT,
          AdminPermission.BILLING_MANAGEMENT
        ];
      case UserRole.MODERATOR:
        return [
          AdminPermission.USER_MANAGEMENT,
          AdminPermission.CONTENT_MODERATION,
          AdminPermission.ANALYTICS_VIEW,
          AdminPermission.AUDIT_LOG_VIEW,
          AdminPermission.SALES_MANAGEMENT
        ];
      case UserRole.SUPPORT:
        return [
          AdminPermission.CONTENT_MODERATION,
          AdminPermission.ANALYTICS_VIEW
        ];
      default:
        return [];
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token) {
        await validateAndRestoreSession(token);
      }
      setLoading(false);
    };

    initializeSession();
  }, [validateAndRestoreSession]);

  // Define logout function first to avoid hoisting issues
  const logout = useCallback(() => {
    // Clear tokens
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(`${ADMIN_TOKEN_KEY}_refresh`);
    
    // Reset state
    setAdminUser(null);
    setSessionTimeRemaining(0);
    setRequiresMFA(false);
    setMfaToken(null);
    
    // Clear intervals
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
    
    if (sessionRefreshInterval.current) {
      clearInterval(sessionRefreshInterval.current);
      sessionRefreshInterval.current = null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      logout();
      return;
    }

    try {
      // Extract refresh token from stored token or use the access token for staff refresh
      const payload = JSON.parse(atob(token.split('.')[1]));
      const refreshToken = localStorage.getItem(`${ADMIN_TOKEN_KEY}_refresh`) || token;
      
      const data = await adminApi.staffRefreshToken(refreshToken);
      
      // Store new access token
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(`${ADMIN_TOKEN_KEY}_refresh`, data.refreshToken);
      }
      
      // Validate and restore session with new token
      await validateAndRestoreSession(data.accessToken);
      lastActivityTime.current = Date.now();
    } catch (error) {
      console.error('Staff session refresh failed:', error);
      logout();
    }
  }, [logout, validateAndRestoreSession]);

  // Enhanced session timeout management for staff users (8 hours)
  useEffect(() => {
    if (adminUser && adminUser.sessionTimeout) {
      const checkSession = () => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityTime.current;
        const sessionTimeoutMs = STAFF_SESSION_TIMEOUT_MINUTES * 60 * 1000; // 8 hours in ms
        const remaining = Math.max(0, sessionTimeoutMs - timeSinceActivity);
        
        setSessionTimeRemaining(Math.floor(remaining / 1000)); // Convert to seconds
        
        // Warn user when 15 minutes remaining
        if (remaining <= 15 * 60 * 1000 && remaining > 14 * 60 * 1000) {
          console.warn('Staff session will expire in 15 minutes');
          // Could trigger a toast notification here
        }
        
        // Auto-refresh session when 5 minutes remaining
        if (remaining <= 5 * 60 * 1000 && remaining > 4 * 60 * 1000) {
          refreshSession().catch(error => {
            console.error('Auto session refresh failed:', error);
          });
        }
        
        if (remaining <= 0) {
          console.warn('Staff session expired due to inactivity');
          logout();
        }
      };

      // Initial check
      checkSession();
      
      // Set up interval
      sessionCheckInterval.current = setInterval(checkSession, SESSION_CHECK_INTERVAL) as unknown as number;

      return () => {
        if (sessionCheckInterval.current) {
          clearInterval(sessionCheckInterval.current);
        }
      };
    }
  }, [adminUser, logout, refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      // Use staff login endpoint for Cognito Staff User Pool
      const response = await adminApi.staffLogin(email, password);
      
      // Handle different response formats
      const data = (response as any).data || response;
      
      if (!data.success) {
        // Handle MFA challenge
        if (data.requiresMFA) {
          setRequiresMFA(true);
          setMfaToken(data.mfaToken);
          throw new Error('MFA verification required');
        }
        throw new Error(data.error || 'Staff login failed');
      }

      const tokens = data.tokens;
      const staffUser = data.staff;
      
      // Verify staff role from Cognito groups
      if (!staffUser.role || ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR, UserRole.SUPPORT].includes(staffUser.role)) {
        throw new Error('Insufficient staff privileges');
      }

      // Store the access token and refresh token
      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;
      
      localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
      localStorage.setItem(`${ADMIN_TOKEN_KEY}_refresh`, refreshToken);
      
      // Map staff user to AdminUser format for backward compatibility
      const adminUser: AdminUser = {
        id: staffUser.id,
        email: staffUser.email,
        name: staffUser.name,
        role: staffUser.role,
        permissions: staffUser.permissions,
        status: UserStatus.ACTIVE,
        emailVerified: true, // Staff users are pre-verified
        phoneVerified: false,
        mfaEnabled: staffUser.mfaEnabled,
        loginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionTimeout: STAFF_SESSION_TIMEOUT_MINUTES, // 8 hours for staff users (in minutes)
        phone: undefined,
        location: undefined,
        lastLogin: new Date().toISOString()
      };

      setAdminUser(adminUser);
      setRequiresMFA(false);
      setMfaToken(null);
      lastActivityTime.current = Date.now(); // Reset activity timer
      
      // Set up automatic session refresh (every 30 minutes)
      setupSessionRefresh();
    } catch (error) {
      console.error('Staff login error:', error);
      throw error;
    }
  };

  // Handle MFA challenge for staff login
  const handleMFAChallenge = useCallback(async (mfaCode: string) => {
    if (!mfaToken) {
      throw new Error('No MFA token available');
    }

    try {
      const response = await adminApi.staffVerifyMFA(mfaToken, mfaCode);
      const data = (response as any).data || response;
      
      if (!data.success) {
        throw new Error(data.error || 'MFA verification failed');
      }

      const tokens = data.tokens;
      const staffUser = data.staff;
      
      // Store tokens and set user
      localStorage.setItem(ADMIN_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(`${ADMIN_TOKEN_KEY}_refresh`, tokens.refreshToken);
      
      const adminUser: AdminUser = {
        id: staffUser.id,
        email: staffUser.email,
        name: staffUser.name,
        role: staffUser.role,
        permissions: staffUser.permissions,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: staffUser.mfaEnabled,
        loginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionTimeout: STAFF_SESSION_TIMEOUT_MINUTES,
        phone: undefined,
        location: undefined,
        lastLogin: new Date().toISOString()
      };

      setAdminUser(adminUser);
      setRequiresMFA(false);
      setMfaToken(null);
      lastActivityTime.current = Date.now();
      
      // Set up automatic session refresh
      setupSessionRefresh();
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }, [mfaToken]);

  // Set up automatic session refresh
  const setupSessionRefresh = useCallback(() => {
    // Clear existing interval
    if (sessionRefreshInterval.current) {
      clearInterval(sessionRefreshInterval.current);
    }

    // Refresh session every 30 minutes
    sessionRefreshInterval.current = setInterval(async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error('Automatic session refresh failed:', error);
        logout();
      }
    }, 30 * 60 * 1000) as unknown as number; // 30 minutes
  }, [logout, refreshSession]);

  const hasPermission = useCallback((permission: AdminPermission): boolean => {
    if (!adminUser) return false;
    
    // Super admin has all permissions
    if (adminUser.role === UserRole.SUPER_ADMIN) return true;
    
    return adminUser.permissions?.includes(permission) || false;
  }, [adminUser]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!adminUser) return false;
    return adminUser.role === role;
  }, [adminUser]);

  const auth: AdminAuthContextType = {
    adminUser,
    login,
    logout,
    loading,
    isAuthenticated: !!adminUser,
    hasPermission,
    hasRole,
    refreshSession,
    sessionTimeRemaining,
    handleMFAChallenge,
    requiresMFA,
  };
  
  return (
    <AdminAuthContext.Provider value={auth}>
      {children}
    </AdminAuthContext.Provider>
  );
};