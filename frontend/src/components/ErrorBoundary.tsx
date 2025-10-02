import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorReporting } from '../services/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only this boundary's children are affected
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({ 
      errorInfo,
      errorId
    });

    // Report error to error reporting service
    errorReporting.reportError(error, {
      component: 'ErrorBoundary',
      action: 'ComponentError',
      additionalData: {
        errorId,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      }
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/admin';
    }
  };

  private renderDefaultFallback() {
    const { error, errorInfo, errorId, retryCount } = this.state;
    const canRetry = retryCount < this.maxRetries;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
            <p className="mt-2 text-sm text-gray-500">
              We're sorry, but something unexpected happened. This error has been reported to our team.
            </p>
            
            {errorId && (
              <p className="mt-2 text-xs text-gray-400 font-mono">
                Error ID: {errorId}
              </p>
            )}

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Show error details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                  <div className="font-semibold text-red-600">{error.name}: {error.message}</div>
                  {error.stack && (
                    <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="mt-2">
                      <div className="font-semibold">Component Stack:</div>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again {retryCount > 0 && `(${this.maxRetries - retryCount} left)`}
              </button>
            )}
            
            <button
              onClick={this.handleGoBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
            
            <button
              onClick={this.handleReload}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
          </div>

          {!canRetry && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Maximum retry attempts reached. Please reload the page or contact support if the problem persists.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }
}
