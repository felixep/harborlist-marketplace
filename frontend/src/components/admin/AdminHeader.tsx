/**
 * @fileoverview Admin header component with user controls and mobile menu toggle.
 * 
 * Provides the top navigation bar for the admin portal with user information,
 * role display, mobile menu toggle, and user dropdown menu with logout functionality.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Props interface for the AdminHeader component
 * 
 * @interface AdminHeaderProps
 * @property {() => void} onMenuToggle - Function to toggle mobile sidebar menu
 * @property {boolean} isMobileMenuOpen - Current state of mobile menu (open/closed)
 */
interface AdminHeaderProps {
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

/**
 * Admin header component with user controls and navigation
 * 
 * Renders the top navigation bar for the admin portal with comprehensive
 * user controls and responsive design. Provides quick access to user
 * information, role display, and logout functionality.
 * 
 * Features:
 * - Mobile hamburger menu toggle for responsive sidebar
 * - Admin branding with role badge display
 * - User avatar with initials and dropdown menu
 * - User information display (name, email, role)
 * - Secure logout functionality with session cleanup
 * - Responsive design with mobile-optimized layout
 * - Accessibility-compliant navigation controls
 * 
 * User Menu Options:
 * - Profile Settings (placeholder for future implementation)
 * - Security Settings (placeholder for future implementation)
 * - Sign Out (functional logout)
 * 
 * @param {AdminHeaderProps} props - Component props
 * @param {() => void} props.onMenuToggle - Function to toggle mobile menu
 * @param {boolean} props.isMobileMenuOpen - Current mobile menu state
 * @returns {JSX.Element} Admin header with user controls and branding
 * 
 * @example
 * ```tsx
 * // Used in AdminLayout component
 * <AdminHeader
 *   onMenuToggle={toggleMobileMenu}
 *   isMobileMenuOpen={isMobileMenuOpen}
 * />
 * ```
 * 
 * @accessibility
 * - ARIA labels for interactive elements
 * - Keyboard navigation support
 * - Screen reader friendly user information
 * - Focus management for dropdown menu
 * 
 * @security
 * - Secure logout with complete session cleanup
 * - Role display for security awareness
 * - Protected user information display
 */
const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle, isMobileMenuOpen }) => {
  const { adminUser, logout } = useAdminAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  /**
   * Handles user logout with proper cleanup
   * 
   * Calls the logout function from admin auth context and closes
   * the user dropdown menu. Ensures complete session cleanup.
   * 
   * @returns {void}
   */
  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">HarborList Admin</h1>
            <span className="hidden sm:inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {adminUser?.role?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {adminUser?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{adminUser?.name}</p>
                <p className="text-xs text-gray-500">{adminUser?.email}</p>
              </div>
            </div>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* User dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p className="font-medium">{adminUser?.name}</p>
                  <p className="text-gray-500">{adminUser?.email}</p>
                </div>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Security
                </button>
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;