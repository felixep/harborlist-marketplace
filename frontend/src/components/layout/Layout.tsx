/**
 * @fileoverview Flexible layout container component for consistent page structure.
 * 
 * Provides a reusable layout wrapper with configurable max-width, padding,
 * and responsive design. Used throughout the application for consistent
 * content alignment and spacing.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { ReactNode } from 'react';

/**
 * Props interface for the Layout component
 * 
 * @interface LayoutProps
 * @property {ReactNode} children - Content to be rendered within the layout container
 * @property {'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'} [maxWidth='7xl'] - Maximum width constraint for the container
 * @property {'none' | 'sm' | 'md' | 'lg'} [padding='md'] - Padding size for the container
 * @property {string} [className=''] - Additional CSS classes to apply to the container
 */
interface LayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Mapping of max-width prop values to Tailwind CSS classes
 * 
 * Provides consistent width constraints across different screen sizes:
 * - sm: 384px (24rem)
 * - md: 448px (28rem)  
 * - lg: 512px (32rem)
 * - xl: 576px (36rem)
 * - 2xl: 672px (42rem)
 * - 7xl: 1280px (80rem) - Default for most content
 * - full: 100% width
 */
const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
};

/**
 * Mapping of padding prop values to Tailwind CSS classes
 * 
 * Provides responsive padding with consistent spacing:
 * - none: No padding
 * - sm: 16px padding on all sides
 * - md: Responsive horizontal padding (16px-32px) + 24px vertical
 * - lg: Responsive horizontal padding (16px-32px) + 32px vertical
 */
const paddingClasses = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-4 sm:px-6 lg:px-8 py-6',
  lg: 'px-4 sm:px-6 lg:px-8 py-8'
};

/**
 * Flexible layout container component for consistent page structure
 * 
 * Provides a centered container with configurable maximum width and padding.
 * Automatically centers content horizontally and applies responsive spacing.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Configurable max-width constraints
 * - Consistent padding options
 * - Extensible with additional CSS classes
 * - Automatic horizontal centering
 * 
 * @param {LayoutProps} props - Component props
 * @param {ReactNode} props.children - Content to render within the layout
 * @param {'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'} [props.maxWidth='7xl'] - Maximum width constraint
 * @param {'none' | 'sm' | 'md' | 'lg'} [props.padding='md'] - Padding size
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Layout container with specified constraints and content
 * 
 * @example
 * ```tsx
 * // Basic usage with default settings
 * <Layout>
 *   <h1>Page Content</h1>
 * </Layout>
 * 
 * // Custom width and padding
 * <Layout maxWidth="2xl" padding="lg">
 *   <ArticleContent />
 * </Layout>
 * 
 * // No padding for full-width content
 * <Layout padding="none" className="bg-gray-100">
 *   <HeroSection />
 * </Layout>
 * ```
 */
export default function Layout({ 
  children, 
  maxWidth = '7xl', 
  padding = 'md',
  className = '' 
}: LayoutProps) {
  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
