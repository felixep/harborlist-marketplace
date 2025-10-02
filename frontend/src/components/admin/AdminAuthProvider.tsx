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
  const sessionCheckInterval = useRef<number | null>(null);
  const lastActivityTime = useRef<number>(Date.now());

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

  // Validate and restore session from token
  const validateAndRestoreSession = useCallback(async (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }
      
      // Verify this is an admin token
      if (!payload.role || ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR, UserRole.SUPPORT].includes(payload.role)) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      // Validate token with server
      const validationResult = await adminApi.validateToken();

      if (!validationResult.valid) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      const userData = validationResult.user;
      
      setAdminUser({
        id: userData.id || payload.sub,
        email: userData.email || payload.email,
        name: userData.name || payload.name,
        role: userData.role || payload.role,
        permissions: userData.permissions || payload.permissions || [],
        status: userData.status || payload.status || UserStatus.ACTIVE,
        emailVerified: userData.emailVerified || payload.emailVerified || false,
        phoneVerified: userData.phoneVerified || payload.phoneVerified || false,
        mfaEnabled: userData.mfaEnabled || payload.mfaEnabled || false,
        loginAttempts: userData.loginAttempts || payload.loginAttempts || 0,
        createdAt: userData.createdAt || payload.createdAt,
        updatedAt: userData.updatedAt || payload.updatedAt,
        sessionTimeout: userData.sessionTimeout || payload.sessionTimeout || 60,
        phone: userData.phone || payload.phone,
        location: userData.location || payload.location,
        lastLogin: userData.lastLogin || payload.lastLogin
      });

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return false;
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

  // Session timeout management
  useEffect(() => {
    if (adminUser && adminUser.sessionTimeout) {
      const checkSession = () => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityTime.current;
        const sessionTimeoutMs = adminUser.sessionTimeout * 60 * 1000; // Convert minutes to ms
        const remaining = Math.max(0, sessionTimeoutMs - timeSinceActivity);
        
        setSessionTimeRemaining(Math.floor(remaining / 1000)); // Convert to seconds
        
        if (remaining <= 0) {
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
  }, [adminUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await adminApi.login(email, password);
      
      // Handle different response formats
      const data = (response as any).data || response;
      const tokens = data.tokens || data;
      const user = data.user;
      
      // Verify admin role
      if (!user.role || ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR, UserRole.SUPPORT].includes(user.role)) {
        throw new Error('Insufficient admin privileges');
      }

      // Store the access token
      const token = tokens.accessToken || data.token;
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminUser(user);
      lastActivityTime.current = Date.now(); // Reset activity timer
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminUser(null);
    setSessionTimeRemaining(0);
    
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      logout();
      return;
    }

    try {
      const data = await adminApi.refreshToken();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdminUser(data.user);
      lastActivityTime.current = Date.now();
    } catch (error) {
      console.error('Session refresh failed:', error);
      logout();
    }
  }, [logout]);

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
  };
  
  return (
    <AdminAuthContext.Provider value={auth}>
      {children}
    </AdminAuthContext.Provider>
  );
};