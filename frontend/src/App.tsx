/**
 * @fileoverview Main application component for HarborList boat marketplace platform.
 * 
 * This component sets up the complete application structure including:
 * - React Query for server state management
 * - Authentication providers for both user and admin contexts
 * - Routing configuration for public, protected, and admin routes
 * - Global error boundary and toast notifications
 * - Layout components (Header/Footer) for public pages
 * 
 * The application supports two distinct user interfaces:
 * 1. Public marketplace for boat buyers/sellers
 * 2. Admin portal for platform management
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import Header from './components/common/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import Search from './pages/Search';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import Profile from './pages/Profile';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EnhancedRegister } from './pages/EnhancedRegister';
import { Onboarding } from './pages/Onboarding';
import { PremiumUpgrade } from './pages/PremiumUpgrade';
import Sell from './pages/Sell';
import Finance from './pages/Finance';
import SharedCalculation from './pages/SharedCalculation';
import About from './pages/About';
import Valuation from './pages/Valuation';
import Services from './pages/Services';
import Insurance from './pages/Insurance';
import Help from './pages/Help';
import Contact from './pages/Contact';
import Safety from './pages/Safety';
import VerifyEmail from './pages/VerifyEmail';
import RegistrationSuccess from './pages/RegistrationSuccess';
import './styles/globals.css';

// Admin imports
import { AdminAuthProvider } from './components/admin/AdminAuthProvider';
import { AdminLayout, AdminProtectedRoute } from './components/admin';
import { 
  AdminDashboard, 
  AdminLogin, 
  UserManagement, 
  ListingModeration, 
  SystemMonitoring, 
  Analytics, 
  PlatformSettings,
  SupportDashboard,
  AuditLogs
} from './pages/admin';
import { AdminPermission } from '@harborlist/shared-types';

/**
 * React Query client configuration for server state management
 * 
 * Provides caching, synchronization, and background updates for API calls.
 * Default configuration includes:
 * - 5 minute stale time for most queries
 * - Automatic retry on failure
 * - Background refetch on window focus
 */
const queryClient = new QueryClient();

/**
 * 404 Not Found page component with maritime theme
 * 
 * Displays a user-friendly error page when users navigate to non-existent routes.
 * Includes navigation back to the home page with consistent branding.
 * 
 * @returns {JSX.Element} Themed 404 error page
 */
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="mb-8">
        <div className="text-8xl mb-4">🌊</div>
        <h1 className="text-6xl font-bold text-gradient-ocean mb-4">404</h1>
        <p className="text-xl text-navy-600 mb-8">Looks like you're lost at sea!</p>
      </div>
      <Link to="/" className="btn-primary">
        <span className="flex items-center space-x-2">
          <span>⚓</span>
          <span>Navigate Home</span>
        </span>
      </Link>
    </div>
  </div>
);

/**
 * Main application component that orchestrates the entire HarborList platform
 * 
 * Sets up the complete application architecture including:
 * - Global error handling with ErrorBoundary
 * - React Query for server state management
 * - Toast notifications for user feedback
 * - Dual authentication systems (user + admin)
 * - Comprehensive routing with protection levels
 * - Responsive layout structure
 * 
 * Route Structure:
 * - /admin/* - Admin portal with role-based access control
 * - /* - Public marketplace with optional authentication
 * 
 * @returns {JSX.Element} Complete application with all providers and routing
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider position="top-right" maxToasts={5}>
          <AuthProvider>
            <AdminAuthProvider>
              <Router>
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin/*"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout>
                        <Routes>
                          <Route index element={<AdminDashboard />} />
                          <Route 
                            path="users" 
                            element={
                              <AdminProtectedRoute requiredPermission={AdminPermission.USER_MANAGEMENT}>
                                <UserManagement />
                              </AdminProtectedRoute>
                            } 
                          />
                          <Route 
                            path="moderation" 
                            element={
                              <AdminProtectedRoute requiredPermission={AdminPermission.CONTENT_MODERATION}>
                                <ListingModeration />
                              </AdminProtectedRoute>
                            } 
                          />
                          <Route 
                            path="monitoring" 
                            element={<SystemMonitoring />} 
                          />
                          <Route 
                            path="analytics" 
                            element={
                              <AdminProtectedRoute requiredPermission={AdminPermission.ANALYTICS_VIEW}>
                                <Analytics />
                              </AdminProtectedRoute>
                            } 
                          />
                          <Route 
                            path="settings" 
                            element={
                              <AdminProtectedRoute requiredPermission={AdminPermission.SYSTEM_CONFIG}>
                                <PlatformSettings />
                              </AdminProtectedRoute>
                            } 
                          />
                          <Route 
                            path="support" 
                            element={<SupportDashboard />} 
                          />
                          <Route 
                            path="audit-logs" 
                            element={
                              <AdminProtectedRoute requiredPermission={AdminPermission.AUDIT_LOG_VIEW}>
                                <AuditLogs />
                              </AdminProtectedRoute>
                            } 
                          />
                        </Routes>
                      </AdminLayout>
                    </AdminProtectedRoute>
                  }
                />

                {/* Public Routes */}
                <Route
                  path="/*"
                  element={
                    <div className="min-h-screen flex flex-col">
                      <Header />
                      <main className="flex-1">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/listing/:identifier" element={<ListingDetail />} />
                          <Route path="/boat/:slug" element={<ListingDetail />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/register-enhanced" element={<EnhancedRegister />} />
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route path="/upgrade" element={<PremiumUpgrade />} />
                          <Route path="/verify-email" element={<VerifyEmail />} />
                          <Route path="/registration-success" element={<RegistrationSuccess />} />
                          <Route path="/sell" element={<Sell />} />
                          <Route path="/finance" element={<Finance />} />
                          <Route path="/finance/shared/:shareToken" element={<SharedCalculation />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/valuation" element={<Valuation />} />
                          <Route path="/services" element={<Services />} />
                          <Route path="/insurance" element={<Insurance />} />
                          <Route path="/help" element={<Help />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/safety" element={<Safety />} />
                          <Route
                            path="/create"
                            element={
                              <ProtectedRoute>
                                <CreateListing />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/edit/:id"
                            element={
                              <ProtectedRoute>
                                <EditListing />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/profile"
                            element={
                              <ProtectedRoute>
                                <Profile />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  }
                />
              </Routes>
            </Router>
          </AdminAuthProvider>
        </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
