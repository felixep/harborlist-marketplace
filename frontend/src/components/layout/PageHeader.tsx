/**
 * @fileoverview Page header component with title, breadcrumbs, and action buttons.
 * 
 * Provides a consistent page header layout with optional breadcrumb navigation,
 * subtitle text, and action buttons. Features a glassmorphism design with
 * backdrop blur and responsive layout.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { ReactNode } from 'react';

/**
 * Breadcrumb item interface for navigation hierarchy
 * 
 * @interface BreadcrumbItem
 * @property {string} label - Display text for the breadcrumb item
 * @property {string} [href] - Optional URL for navigation (if omitted, renders as current page)
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Props interface for the PageHeader component
 * 
 * @interface PageHeaderProps
 * @property {string} title - Main page title displayed prominently
 * @property {string} [subtitle] - Optional subtitle text below the main title
 * @property {ReactNode} [actions] - Optional action buttons or controls (e.g., "Create", "Edit")
 * @property {BreadcrumbItem[]} [breadcrumbs] - Optional breadcrumb navigation array
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<BreadcrumbItem>;
}

/**
 * Page header component with title, breadcrumbs, and actions
 * 
 * Renders a consistent page header with glassmorphism design and responsive layout.
 * Supports hierarchical navigation through breadcrumbs and flexible action buttons.
 * 
 * Features:
 * - Glassmorphism design with backdrop blur effect
 * - Responsive layout with proper spacing
 * - Breadcrumb navigation with arrow separators
 * - Flexible action button placement
 * - Accessibility-compliant navigation structure
 * - Maritime color scheme integration
 * 
 * @param {PageHeaderProps} props - Component props
 * @param {string} props.title - Main page title
 * @param {string} [props.subtitle] - Optional subtitle text
 * @param {ReactNode} [props.actions] - Optional action elements
 * @param {BreadcrumbItem[]} [props.breadcrumbs] - Optional breadcrumb navigation
 * @returns {JSX.Element} Page header with title, navigation, and actions
 * 
 * @example
 * ```tsx
 * // Basic page header
 * <PageHeader title="Boat Listings" />
 * 
 * // With subtitle and actions
 * <PageHeader 
 *   title="Manage Listings"
 *   subtitle="View and edit your boat listings"
 *   actions={
 *     <button className="btn-primary">Create Listing</button>
 *   }
 * />
 * 
 * // With breadcrumb navigation
 * <PageHeader 
 *   title="Edit Listing"
 *   breadcrumbs={[
 *     { label: "Dashboard", href: "/dashboard" },
 *     { label: "Listings", href: "/listings" },
 *     { label: "Edit Listing" }
 *   ]}
 * />
 * ```
 */
export default function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="border-b border-ocean-100 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {breadcrumbs && (
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-navy-600">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-ocean-300">→</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-ocean-600 transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-navy-900 font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy-900">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-lg text-navy-600">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
