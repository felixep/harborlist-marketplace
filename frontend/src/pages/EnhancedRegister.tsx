/**
 * @fileoverview Enhanced registration page with user type selection and premium membership options.
 * 
 * Provides comprehensive registration experience with:
 * - Multi-step registration process
 * - User type selection (individual/dealer)
 * - Premium membership options
 * - Payment processing integration
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { EnhancedRegisterForm } from '../components/auth/EnhancedRegisterForm';
import { useAuth } from '../components/auth/AuthProvider';

/**
 * Enhanced registration page component
 */
export const EnhancedRegister: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  
  // Get the intended destination from state, default to home
  const from = location.state?.from?.pathname || '/';

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is already authenticated, redirect to intended destination
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="text-4xl">🚤</div>
          <h1 className="text-3xl font-bold text-gray-900">HarborList</h1>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-gray-900">
          Join the Premier Boat Marketplace
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ from: location.state?.from }}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in here
          </Link>
        </p>
      </div>

      {/* Registration Form */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <EnhancedRegisterForm />
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900">
            Why Choose HarborList?
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <div className="text-center">
            <div className="text-3xl mb-4">🎯</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Targeted Audience
            </h4>
            <p className="text-gray-600">
              Connect with serious boat buyers and sellers in your area
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl mb-4">🔧</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Professional Tools
            </h4>
            <p className="text-gray-600">
              Advanced listing tools, analytics, and inventory management
            </p>
          </div>
          
          <div className="text-3xl mb-4">💎</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Premium Features
            </h4>
            <p className="text-gray-600">
              Priority placement, enhanced photos, and premium support
            </p>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Trusted by Boat Enthusiasts Nationwide
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">10,000+</div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">50,000+</div>
              <div className="text-sm text-gray-600">Registered Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">98%</div>
              <div className="text-sm text-gray-600">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">24/7</div>
              <div className="text-sm text-gray-600">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="text-center text-xs text-gray-500">
          <p className="mb-2">
            🔒 Your information is secure and protected with industry-standard encryption
          </p>
          <p>
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};