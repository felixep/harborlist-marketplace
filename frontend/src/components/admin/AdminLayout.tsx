/**
 * @fileoverview Admin layout component providing the main structure for admin pages.
 * 
 * Provides a comprehensive admin interface layout with responsive sidebar navigation,
 * header with user controls, and main content area. Features mobile-responsive design
 * with collapsible sidebar and loading states.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import AdminHeader from './AdminHeader';
import Sidebar from './Sidebar';

/**
 * Props interface for the AdminLayout component
 * 
 * @interface AdminLayoutProps
 * @property {React.ReactNode} children - Admin page content to render in the main area
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin layout component providing the main structure for admin pages
 * 
 * Renders a comprehensive admin interface with responsive design, including:
 * - Collapsible sidebar navigation with admin menu items
 * - Header with user controls and mobile menu toggle
 * - Main content area with proper scrolling and padding
 * - Loading states during authentication checks
 * - Mobile-responsive design with overlay sidebar
 * 
 * Features:
 * - Responsive sidebar that collapses on mobile devices
 * - Mobile menu toggle functionality
 * - Loading state with branded spinner
 * - Proper focus management for accessibility
 * - Consistent spacing and layout structure
 * - Integration with admin authentication system
 * 
 * Layout Structure:
 * ```
 * ┌─────────────────────────────────────┐
 * │ Sidebar │ Header                    │
 * │         ├───────────────────────────┤
 * │         │ Main Content Area         │
 * │         │                           │
 * │         │ {children}                │
 * │         │                           │
 * └─────────────────────────────────────┘
 * ```
 * 
 * @param {AdminLayoutProps} props - Component props
 * @param {React.ReactNode} props.children - Content to render in the main area
 * @returns {JSX.Element} Complete admin layout with sidebar, header, and content area
 * 
 * @example
 * ```tsx
 * // Used to wrap admin pages
 * <AdminLayout>
 *   <AdminDashboard />
 * </AdminLayout>
 * 
 * // Automatically handles responsive behavior
 * <AdminLayout>
 *   <UserManagement />
 * </AdminLayout>
 * ```
 * 
 * @accessibility
 * - Proper focus management for sidebar navigation
 * - Keyboard navigation support
 * - Screen reader friendly structure
 * - ARIA labels for interactive elements
 * 
 * @performance
 * - Efficient state management for mobile menu
 * - Optimized re-renders through proper state structure
 * - Lazy loading support for admin content
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { loading } = useAdminAuth();

  /**
   * Toggles the mobile sidebar menu open/closed state
   * 
   * Used by the mobile menu button in the header to show/hide
   * the sidebar navigation on mobile devices.
   * 
   * @returns {void}
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  /**
   * Closes the mobile sidebar menu
   * 
   * Used when user clicks outside the sidebar or navigates to
   * a new page to automatically close the mobile menu.
   * 
   * @returns {void}
   */
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <AdminHeader
          onMenuToggle={toggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;