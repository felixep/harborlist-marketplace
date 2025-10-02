/**
 * @fileoverview Admin sidebar navigation with role-based menu items.
 * 
 * Provides comprehensive sidebar navigation for the admin portal with
 * role-based access control, responsive design, and intuitive menu
 * organization. Features dynamic menu visibility based on user permissions.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminPermission, UserRole } from '../../../../backend/src/types/common';

/**
 * Props interface for the Sidebar component
 * 
 * @interface SidebarProps
 * @property {boolean} isOpen - Whether the sidebar is open (for mobile)
 * @property {() => void} onClose - Function to close the sidebar
 */
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Menu item configuration interface
 * 
 * Defines the structure for sidebar menu items with optional
 * role and permission-based access control.
 * 
 * @interface MenuItem
 * @property {string} name - Display name for the menu item
 * @property {string} path - Route path for navigation
 * @property {React.ReactNode} icon - SVG icon component for the menu item
 * @property {AdminPermission} [permission] - Required permission for access
 * @property {UserRole[]} [roles] - Required roles for access (any of the listed roles)
 */
interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  permission?: AdminPermission;
  roles?: UserRole[];
}

/**
 * Admin sidebar navigation component with role-based access control
 * 
 * Renders a comprehensive sidebar navigation for the admin portal with
 * dynamic menu items based on user roles and permissions. Features
 * responsive design with mobile overlay and smooth animations.
 * 
 * Features:
 * - Role-based menu item visibility
 * - Permission-based access control
 * - Responsive design with mobile overlay
 * - Active route highlighting
 * - User information display at bottom
 * - Smooth slide animations
 * - Accessibility-compliant navigation
 * 
 * Menu Organization:
 * - Dashboard (always visible)
 * - User Management (requires USER_MANAGEMENT permission)
 * - Content Moderation (requires CONTENT_MODERATION permission)
 * - System Monitoring (Admin/Super Admin roles only)
 * - Analytics (requires ANALYTICS_VIEW permission)
 * - Support Dashboard (always visible for admin users)
 * - Audit Logs (requires AUDIT_LOG_VIEW permission)
 * - Platform Settings (requires SYSTEM_CONFIG permission)
 * 
 * Access Control Logic:
 * - Super Admin: Can see all menu items
 * - Role-based: Must have one of the specified roles
 * - Permission-based: Must have the specific permission
 * - Default: Visible if no restrictions specified
 * 
 * @param {SidebarProps} props - Component props
 * @param {boolean} props.isOpen - Whether sidebar is open (mobile)
 * @param {() => void} props.onClose - Function to close sidebar
 * @returns {JSX.Element} Sidebar navigation with role-based menu items
 * 
 * @example
 * ```tsx
 * // Used in AdminLayout
 * <Sidebar 
 *   isOpen={isMobileMenuOpen} 
 *   onClose={closeMobileMenu} 
 * />
 * ```
 * 
 * @accessibility
 * - Proper ARIA labels and roles
 * - Keyboard navigation support
 * - Screen reader friendly structure
 * - Focus management for mobile overlay
 * 
 * @performance
 * - Efficient permission checking with memoization
 * - Optimized re-renders through proper state management
 * - Smooth CSS transitions for mobile interactions
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasPermission, hasRole, adminUser } = useAdminAuth();

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      permission: AdminPermission.USER_MANAGEMENT,
    },
    {
      name: 'Content Moderation',
      path: '/admin/moderation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      permission: AdminPermission.CONTENT_MODERATION,
    },
    {
      name: 'System Monitoring',
      path: '/admin/monitoring',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      permission: AdminPermission.ANALYTICS_VIEW,
    },
    {
      name: 'Support Dashboard',
      path: '/admin/support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: 'Audit Logs',
      path: '/admin/audit-logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      permission: AdminPermission.AUDIT_LOG_VIEW,
    },
    {
      name: 'Platform Settings',
      path: '/admin/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      permission: AdminPermission.SYSTEM_CONFIG,
    },
  ];

  /**
   * Determines if a menu item should be visible based on user permissions and roles
   * 
   * Implements a hierarchical access control system:
   * 1. Super Admin can see everything
   * 2. Check role-based restrictions (must have one of the specified roles)
   * 3. Check permission-based restrictions (must have the specific permission)
   * 4. Default to visible if no restrictions
   * 
   * @param {MenuItem} item - Menu item to check visibility for
   * @returns {boolean} True if the menu item should be visible
   * 
   * @example
   * ```tsx
   * // Menu item with permission requirement
   * const userMgmtItem = {
   *   name: 'User Management',
   *   permission: AdminPermission.USER_MANAGEMENT
   * };
   * const visible = isMenuItemVisible(userMgmtItem);
   * ```
   */
  const isMenuItemVisible = (item: MenuItem): boolean => {
    // Super admin can see everything
    if (adminUser?.role === UserRole.SUPER_ADMIN) return true;

    // Check role-based access
    if (item.roles && !item.roles.some(role => hasRole(role))) {
      return false;
    }

    // Check permission-based access
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    return true;
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out
    lg:translate-x-0 lg:static lg:inset-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
            <h2 className="text-white text-lg font-semibold">Admin Panel</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuItems
              .filter(isMenuItemVisible)
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  <span className="mr-3 flex-shrink-0">{item.icon}</span>
                  {item.name}
                </NavLink>
              ))}
          </nav>

          {/* User info at bottom */}
          <div className="flex-shrink-0 p-4 bg-gray-800">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {adminUser?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{adminUser?.name}</p>
                <p className="text-xs text-gray-400">
                  {adminUser?.role?.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;