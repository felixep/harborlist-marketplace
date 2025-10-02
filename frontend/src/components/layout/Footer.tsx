/**
 * @fileoverview Footer component for the HarborList boat marketplace platform.
 * 
 * Provides comprehensive site navigation, brand information, newsletter signup,
 * and social media links. Features a responsive design with maritime theming
 * and organized content sections for optimal user experience.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { Link } from 'react-router-dom';

/**
 * Main footer component for the HarborList platform
 * 
 * Renders a comprehensive footer with multiple sections:
 * - Brand section with logo and social media links
 * - Browse section with boat type quick links
 * - Services section with platform features
 * - Support section with help and legal links
 * - Newsletter signup section
 * - Bottom bar with copyright and legal links
 * 
 * Features:
 * - Responsive grid layout (1-4 columns based on screen size)
 * - Maritime-themed gradient background
 * - Hover effects and smooth transitions
 * - Accessibility-compliant navigation
 * - Dynamic copyright year
 * 
 * @returns {JSX.Element} Complete footer with all navigation and branding elements
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
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 text-white">
      {/* Main Footer */}
      <div className="container-wide py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                <span className="text-white font-bold text-2xl">⚓</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">MarineMarket</h3>
                <p className="text-secondary-300 text-sm">Premium Boat Marketplace</p>
              </div>
            </div>
            <p className="text-secondary-300 mb-6 leading-relaxed">
              The most trusted platform for buying and selling boats. Connect with serious buyers and sellers in the marine community.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                <span className="text-lg">📘</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                <span className="text-lg">📷</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                <span className="text-lg">🐦</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                <span className="text-lg">💼</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Browse</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/search?type=sailboat" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>⛵</span>
                  <span>Sailboats</span>
                </Link>
              </li>
              <li>
                <Link to="/search?type=motor" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🛥️</span>
                  <span>Motor Yachts</span>
                </Link>
              </li>
              <li>
                <Link to="/search?type=fishing" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🎣</span>
                  <span>Fishing Boats</span>
                </Link>
              </li>
              <li>
                <Link to="/search?type=pontoon" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🚤</span>
                  <span>Pontoons</span>
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Advanced Search</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Services</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/create" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>📝</span>
                  <span>List Your Boat</span>
                </Link>
              </li>
              <li>
                <Link to="/valuation" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>📊</span>
                  <span>Boat Valuation</span>
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🔧</span>
                  <span>Marine Services</span>
                </Link>
              </li>
              <li>
                <Link to="/finance" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>💰</span>
                  <span>Financing</span>
                </Link>
              </li>
              <li>
                <Link to="/insurance" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Insurance</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>❓</span>
                  <span>Help Center</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>💬</span>
                  <span>Contact Us</span>
                </Link>
              </li>
              <li>
                <Link to="/safety" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Safety Tips</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-secondary-300 hover:text-white transition-colors duration-200 flex items-center space-x-2">
                  <span>🔒</span>
                  <span>Privacy Policy</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="border-t border-white/10">
        <div className="container-wide py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Stay Updated</h3>
            <p className="text-secondary-300 mb-8">
              Get the latest boat listings and marine industry news delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
              <button className="btn-primary whitespace-nowrap">
                <span className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>Subscribe</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container-wide py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-secondary-300 text-sm">
              © {currentYear} MarineMarket. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link to="/terms" className="text-secondary-300 hover:text-white transition-colors duration-200">
                Terms
              </Link>
              <Link to="/privacy" className="text-secondary-300 hover:text-white transition-colors duration-200">
                Privacy
              </Link>
              <a href="#" className="text-secondary-300 hover:text-white transition-colors duration-200">
                Cookies
              </a>
              <div className="flex items-center space-x-2 text-secondary-300">
                <span>🌍</span>
                <span>English (US)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}