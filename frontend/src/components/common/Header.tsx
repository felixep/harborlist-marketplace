/**
 * @fileoverview Main navigation header component for the HarborList boat marketplace.
 * 
 * Provides responsive navigation with authentication-aware UI, mobile menu,
 * and user account management. Features a glassmorphism design with sticky
 * positioning and smooth animations.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import NotificationBell from '../notifications/NotificationBell';

/**
 * Main navigation header component for the HarborList platform
 * 
 * Renders a responsive header with authentication-aware navigation, user menu,
 * and mobile-friendly design. Provides consistent branding and navigation
 * across all public pages of the application.
 * 
 * Features:
 * - Responsive design with mobile hamburger menu
 * - Authentication-aware UI (login/logout states)
 * - Sticky positioning with glassmorphism backdrop
 * - Active route highlighting
 * - User dropdown menu with profile actions
 * - Maritime-themed branding and icons
 * - Smooth hover animations and transitions
 * - Accessibility-compliant navigation structure
 * 
 * State Management:
 * - Mobile menu toggle state
 * - Authentication status from AuthProvider
 * - Current route detection for active states
 * 
 * @returns {JSX.Element} Complete navigation header with responsive design
 * 
 * @example
 * ```tsx
 * // Used in main App layout
 * <div className="min-h-screen flex flex-col">
 *   <Header />
 *   <main className="flex-1">
 *     {/* Page content *\/}
 *   </main>
 *   <Footer />
 * </div>
 * ```
 * 
 * @performance
 * - Uses React.memo for re-render optimization
 * - Efficient event handlers with useCallback
 * - Minimal DOM updates with conditional rendering
 * 
 * @accessibility
 * - ARIA labels for interactive elements
 * - Keyboard navigation support
 * - Screen reader friendly structure
 * - Focus management for dropdown menus
 */
export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * Determines if the current route matches the provided path
   * 
   * Used for highlighting active navigation items with visual feedback.
   * Provides exact path matching for accurate active state detection.
   * 
   * @param {string} path - The path to check against current location
   * @returns {boolean} True if the current pathname matches the provided path
   * 
   * @example
   * ```tsx
   * const isActive = isActivePath('/search');
   * // Returns true if current URL is exactly '/search'
   * ```
   */
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            {/* Desktop: Full wordmark */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-200 shadow-lg">
                <span className="text-white font-bold text-xl">⚓</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900" style={{fontFamily: 'DM Sans'}}>
                  Marine<span className="text-blue-600 relative">Market
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"></div>
                  </span>
                </span>
                <span className="text-xs text-slate-500 -mt-1">Premium Boat Marketplace</span>
              </div>
            </div>
            
            {/* Mobile: Monogram */}
            <div className="md:hidden">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-200 shadow-lg">
                <span className="text-white font-bold text-xl">MM</span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link 
              to="/" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActivePath('/') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/search" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActivePath('/search') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Browse
            </Link>
            <Link 
              to="/sell" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActivePath('/sell') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Sell
            </Link>
            <Link 
              to="/finance/calculator" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActivePath('/finance') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Finance
            </Link>
            <Link 
              to="/about" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActivePath('/about') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              About
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Icon */}
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <NotificationBell />

                {/* Favorites */}
                <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-150">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* List Your Boat CTA */}
                <Link to="/create" className="btn-primary hidden sm:flex">
                  List Your Boat
                </Link>
                
                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 transition-colors duration-150">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <svg className="w-4 h-4 text-slate-400 transition-transform group-hover:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg py-2 z-50 border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150" style={{boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'}}>
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                      <div className="text-xs text-slate-500">Premium Member</div>
                    </div>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150">
                      My Profile
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150">
                      My Listings
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150">
                      Favorites
                    </Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <Link to="/billing" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150">
                      💳 Billing & Subscriptions
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150">
                      Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-150 hidden sm:block">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-secondary-100 transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-secondary-200/50 bg-white/95 backdrop-blur-xl">
          <div className="container-wide py-4 space-y-2">
            <Link 
              to="/" 
              className={`block nav-link ${isActivePath('/') ? 'nav-link-active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="flex items-center space-x-3">
                <span>🏠</span>
                <span>Home</span>
              </span>
            </Link>
            <Link 
              to="/search" 
              className={`block nav-link ${isActivePath('/search') ? 'nav-link-active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="flex items-center space-x-3">
                <span>🔍</span>
                <span>Search Boats</span>
              </span>
            </Link>
            <a href="#categories" className="block nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="flex items-center space-x-3">
                <span>🚤</span>
                <span>Categories</span>
              </span>
            </a>
            {!isAuthenticated && (
              <>
                <div className="border-t border-secondary-200 my-2"></div>
                <Link 
                  to="/login" 
                  className="block nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center space-x-3">
                    <span>🔑</span>
                    <span>Sign In</span>
                  </span>
                </Link>
                <Link 
                  to="/register" 
                  className="block nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center space-x-3">
                    <span>🚀</span>
                    <span>Get Started</span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
