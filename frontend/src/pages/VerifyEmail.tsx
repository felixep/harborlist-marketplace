/**
 * @fileoverview Email verification page for user account activation.
 * 
 * Handles email verification via URL token parameter and provides
 * a complete verification experience with success/error states.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

/**
 * Email verification page component
 * 
 * Processes email verification tokens from URL parameters and provides
 * appropriate feedback to users during the verification process.
 * 
 * Features:
 * - Automatic verification on page load
 * - Success and error state handling
 * - Resend verification email functionality
 * - Clear navigation back to login
 * - Professional maritime-themed design
 * 
 * @returns {JSX.Element} Email verification page with status feedback
 */
export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please check your email for the correct verification link.');
      return;
    }

    verifyEmail();
  }, [token]);

  /**
   * Verify email address using the provided token
   */
  const verifyEmail = async () => {
    try {
      setStatus('loading');
      const response = await api.verifyEmail(token!) as { message: string };
      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');
      
      // Auto-redirect to login after success
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email verified! Please log in to access your account.',
            type: 'success'
          }
        });
      }, 3000);
    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          setStatus('expired');
          setMessage('Your verification link has expired. Please request a new one below.');
        } else if (error.message.includes('invalid')) {
          setMessage('Invalid verification token. Please check your email for the correct verification link.');
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage('Verification failed. Please try again.');
      }
    }
  };

  /**
   * Handle resending verification email
   */
  const handleResendVerification = async () => {
    if (!userEmail) {
      alert('Please enter your email address to resend verification.');
      return;
    }

    try {
      setResendLoading(true);
      await api.resendVerification(userEmail);
      alert('Verification email sent! Please check your inbox.');
      setUserEmail('');
    } catch (error) {
      console.error('Resend verification error:', error);
      alert('Failed to send verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  /**
   * Render loading state
   */
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Verifying Your Email</h1>
          <p className="text-slate-600">Please wait while we verify your account...</p>
        </div>
      </div>
    );
  }

  /**
   * Render success state
   */
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Email Verified!</h1>
          <p className="text-slate-600 mb-6">{message}</p>
          <p className="text-sm text-slate-500 mb-6">
            You'll be redirected to the login page automatically, or you can click below.
          </p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Render error or expired state
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          {status === 'expired' ? 'Link Expired' : 'Verification Failed'}
        </h1>
        <p className="text-slate-600 mb-6">{message}</p>

        {status === 'expired' && (
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-slate-900 mb-3">Request New Verification Email</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleResendVerification}
                disabled={resendLoading || !userEmail}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading ? 'Sending...' : 'Send New Verification Email'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/login"
            className="block text-blue-600 hover:text-blue-700 transition-colors"
          >
            Back to Login
          </Link>
          <Link
            to="/register"
            className="block text-slate-600 hover:text-slate-700 transition-colors"
          >
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;