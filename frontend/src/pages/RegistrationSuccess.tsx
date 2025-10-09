/**
 * @fileoverview Registration success page with email verification instructions.
 * 
 * Displayed after successful user registration to inform users about
 * the email verification requirement and provide helpful guidance.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';

/**
 * Registration success page component
 * 
 * Provides clear instructions for email verification after successful
 * registration and includes functionality to resend verification emails.
 * 
 * Features:
 * - Clear email verification instructions
 * - Resend verification email functionality
 * - Professional design with maritime theming
 * - Navigation options for different user scenarios
 * 
 * @returns {JSX.Element} Registration success page with verification instructions
 */
export const RegistrationSuccess: React.FC = () => {
  const location = useLocation();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  // Get user email from location state (passed from registration)
  const userEmail = location.state?.email || '';
  const userName = location.state?.name || '';

  /**
   * Handle resending verification email
   */
  const handleResendVerification = async () => {
    if (!userEmail) {
      setResendMessage('Unable to resend verification email. Please try registering again.');
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage('');
      await api.resendVerification(userEmail);
      setResendMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendMessage('Failed to send verification email. Please try again in a few minutes.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to HarborList{userName && `, ${userName}`}!</h1>
          <p className="text-xl text-slate-600">Check your email to verify your account</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">What happens next?</h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mr-3 mt-0.5">1</span>
              <p>We've sent a verification email to <strong>{userEmail || 'your email address'}</strong></p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mr-3 mt-0.5">2</span>
              <p>Click the verification link in the email to activate your account</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mr-3 mt-0.5">3</span>
              <p>Once verified, you can sign in and start exploring boats!</p>
            </div>
          </div>
        </div>

        {/* Email Tips */}
        <div className="bg-amber-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">Don't see the email?</h3>
          <ul className="space-y-2 text-amber-800">
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Check your spam or junk folder
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Wait a few minutes - emails can take time to arrive
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Make sure you entered the correct email address
            </li>
          </ul>
        </div>

        {/* Resend Email Section */}
        {userEmail && (
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Need another email?</h3>
            <p className="text-slate-600 mb-4">
              If you still don't see the verification email, we can send you a new one.
            </p>
            {resendMessage && (
              <div className={`p-3 rounded-md mb-4 ${
                resendMessage.includes('sent') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {resendMessage}
              </div>
            )}
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="bg-slate-600 text-white px-6 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        {/* Navigation Options */}
        <div className="text-center space-y-4">
          <div className="text-sm text-slate-600">
            Already verified your email?
          </div>
          <div className="space-x-4">
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In to Your Account
            </Link>
            <Link
              to="/"
              className="inline-block text-slate-600 hover:text-slate-700 px-6 py-3 transition-colors"
            >
              Browse Boats as Guest
            </Link>
          </div>
        </div>

        {/* Support Information */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Having trouble? <Link to="/contact" className="text-blue-600 hover:text-blue-700">Contact our support team</Link> for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;