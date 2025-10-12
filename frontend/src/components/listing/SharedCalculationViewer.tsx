import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FinanceCalculation } from '@harborlist/shared-types';
import PaymentSchedule from './PaymentSchedule';

interface SharedCalculationViewerProps {
  shareToken?: string;
  className?: string;
}

const SharedCalculationViewer: React.FC<SharedCalculationViewerProps> = ({
  shareToken: propShareToken,
  className = ''
}) => {
  const { shareToken: paramShareToken } = useParams<{ shareToken: string }>();
  const shareToken = propShareToken || paramShareToken;
  
  const [calculation, setCalculation] = useState<FinanceCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // Load shared calculation when component mounts
  useEffect(() => {
    if (shareToken) {
      loadSharedCalculation();
    }
  }, [shareToken]);

  // Load shared calculation from API
  const loadSharedCalculation = async () => {
    if (!shareToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/calculations/shared/${shareToken}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Shared calculation not found or has expired');
        }
        throw new Error('Failed to load shared calculation');
      }

      const data = await response.json();
      setCalculation(data.calculation);
    } catch (err) {
      console.error('Error loading shared calculation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shared calculation');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy calculation details to clipboard
  const handleCopyCalculation = async () => {
    if (!calculation) return;

    const shareText = `Boat Finance Calculation:
Boat Price: ${formatCurrency(calculation.boatPrice)}
Down Payment: ${formatCurrency(calculation.downPayment)}
Loan Amount: ${formatCurrency(calculation.loanAmount)}
Interest Rate: ${calculation.interestRate}%
Term: ${formatTerm(calculation.termMonths)}
Monthly Payment: ${formatCurrency(calculation.monthlyPayment)}
Total Interest: ${formatCurrency(calculation.totalInterest)}
Total Cost: ${formatCurrency(calculation.totalCost)}

View full details: ${window.location.href}`;

    try {
      await navigator.clipboard.writeText(shareText);
      // You might want to show a toast notification here
      alert('Calculation details copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  };

  // Share calculation using Web Share API or fallback
  const handleShareCalculation = async () => {
    if (!calculation) return;

    const shareData = {
      title: 'Boat Finance Calculator',
      text: `Monthly Payment: ${formatCurrency(calculation.monthlyPayment)} for a ${formatCurrency(calculation.boatPrice)} boat`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href);
        alert('Share link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing calculation:', err);
      alert('Failed to share calculation');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format term in years
  const formatTerm = (months: number) => {
    const years = Math.round(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !calculation) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Calculation Not Found</h3>
          <p className="text-slate-600 mb-6">
            {error || 'The shared calculation you\'re looking for doesn\'t exist or has expired.'}
          </p>
          <Link to="/finance" className="btn-primary">
            Create New Calculation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            <span className="mr-2">🧮</span>Shared Finance Calculation
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleCopyCalculation}
              className="btn-secondary text-sm"
              title="Copy calculation details"
            >
              <span className="flex items-center space-x-2">
                <span>📋</span>
                <span>Copy</span>
              </span>
            </button>
            <button
              onClick={handleShareCalculation}
              className="btn-secondary text-sm"
              title="Share this calculation"
            >
              <span className="flex items-center space-x-2">
                <span>📤</span>
                <span>Share</span>
              </span>
            </button>
          </div>
        </div>
        
        <p className="text-slate-600">
          Shared on {formatDate(calculation.createdAt)}
        </p>
      </div>

      {/* Calculation Results */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">
          <span className="mr-2">💰</span>Loan Details
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Parameters */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 mb-3">Loan Parameters</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Boat Price:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculation.boatPrice)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Down Payment:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculation.downPayment)}
                  <span className="text-sm text-slate-500 ml-1">
                    ({((calculation.downPayment / calculation.boatPrice) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Loan Amount:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculation.loanAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Interest Rate:</span>
                <span className="font-semibold text-slate-900">
                  {calculation.interestRate}%
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Loan Term:</span>
                <span className="font-semibold text-slate-900">
                  {formatTerm(calculation.termMonths)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Results */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Payment Summary</h4>
            
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {formatCurrency(calculation.monthlyPayment)}
              </div>
              <div className="text-slate-600">Monthly Payment</div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Interest:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculation.totalInterest)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600">Total Cost:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculation.totalCost)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600">Total Payments:</span>
                <span className="font-semibold text-slate-900">
                  {calculation.termMonths}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Toggle */}
        {calculation.paymentSchedule && calculation.paymentSchedule.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className="btn-secondary w-full"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>📅</span>
                <span>{showSchedule ? 'Hide' : 'Show'} Payment Schedule</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Payment Schedule */}
      {showSchedule && calculation.paymentSchedule && (
        <PaymentSchedule 
          schedule={calculation.paymentSchedule}
          className="bg-white rounded-xl shadow-lg"
        />
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          <span className="mr-2">🚀</span>Next Steps
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/finance" className="btn-primary text-center">
            <span className="flex items-center justify-center space-x-2">
              <span>🧮</span>
              <span>Create Your Own Calculation</span>
            </span>
          </Link>
          
          <Link to="/search" className="btn-secondary text-center">
            <span className="flex items-center justify-center space-x-2">
              <span>🔍</span>
              <span>Browse Boats</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Disclaimer:</span> This calculation provides estimates only. 
          Actual loan terms, rates, and payments may vary based on creditworthiness, lender requirements, 
          and other factors. Contact a marine financing specialist for personalized quotes and to get pre-approved.
        </p>
      </div>
    </div>
  );
};

export default SharedCalculationViewer;