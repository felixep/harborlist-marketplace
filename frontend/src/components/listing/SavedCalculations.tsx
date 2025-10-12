import React, { useState, useEffect } from 'react';
import { FinanceCalculation } from '@harborlist/shared-types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

interface SavedCalculationsProps {
  onCalculationSelect?: (calculation: FinanceCalculation) => void;
  onCalculationDelete?: (calculationId: string) => void;
  className?: string;
}

const SavedCalculations: React.FC<SavedCalculationsProps> = ({
  onCalculationSelect,
  onCalculationDelete,
  className = ''
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [calculations, setCalculations] = useState<FinanceCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalculation, setSelectedCalculation] = useState<string | null>(null);

  // Load saved calculations when component mounts
  useEffect(() => {
    if (user) {
      loadSavedCalculations();
    }
  }, [user]);

  // Load saved calculations from API
  const loadSavedCalculations = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/calculations/${user.userId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load saved calculations');
      }

      const data = await response.json();
      setCalculations(data.calculations || []);
    } catch (err) {
      console.error('Error loading saved calculations:', err);
      setError('Failed to load saved calculations');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a saved calculation
  const handleDeleteCalculation = async (calculationId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this calculation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/finance/calculations/${calculationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete calculation');
      }

      // Remove from local state
      setCalculations(prev => prev.filter(calc => calc.calculationId !== calculationId));
      
      if (selectedCalculation === calculationId) {
        setSelectedCalculation(null);
      }

      showToast('Calculation deleted successfully', 'success');

      if (onCalculationDelete) {
        onCalculationDelete(calculationId);
      }
    } catch (err) {
      console.error('Error deleting calculation:', err);
      showToast('Failed to delete calculation', 'error');
    }
  };

  // Share a calculation
  const handleShareCalculation = async (calculation: FinanceCalculation) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/finance/share/${calculation.calculationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to share calculation');
      }

      const data = await response.json();
      
      // Copy share URL to clipboard
      await navigator.clipboard.writeText(data.shareUrl);
      showToast('Share link copied to clipboard', 'success');

      // Update local state to mark as shared
      setCalculations(prev => 
        prev.map(calc => 
          calc.calculationId === calculation.calculationId 
            ? { ...calc, shared: true, shareToken: data.shareToken }
            : calc
        )
      );
    } catch (err) {
      console.error('Error sharing calculation:', err);
      showToast('Failed to share calculation', 'error');
    }
  };

  // Select a calculation
  const handleSelectCalculation = (calculation: FinanceCalculation) => {
    setSelectedCalculation(calculation.calculationId);
    if (onCalculationSelect) {
      onCalculationSelect(calculation);
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

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format term in years
  const formatTerm = (months: number) => {
    const years = Math.round(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  if (!user) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Login Required</h3>
          <p className="text-slate-600 mb-4">
            Please log in to save and manage your finance calculations
          </p>
          <button className="btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            <span className="mr-2">💾</span>Saved Calculations
          </h3>
          <button
            onClick={loadSavedCalculations}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : calculations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">No Saved Calculations</h4>
            <p className="text-slate-600">
              Save your finance calculations to compare different scenarios and access them later
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {calculations.map((calculation) => {
              const isSelected = selectedCalculation === calculation.calculationId;
              
              return (
                <div
                  key={calculation.calculationId}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleSelectCalculation(calculation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-slate-900">
                          {formatCurrency(calculation.boatPrice)} Boat
                        </h4>
                        {calculation.shared && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            Shared
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Selected
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-slate-600">Down Payment</div>
                          <div className="font-medium text-slate-900">
                            {formatCurrency(calculation.downPayment)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Interest Rate</div>
                          <div className="font-medium text-slate-900">
                            {calculation.interestRate}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Term</div>
                          <div className="font-medium text-slate-900">
                            {formatTerm(calculation.termMonths)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-600">Monthly Payment</div>
                          <div className="font-medium text-blue-600">
                            {formatCurrency(calculation.monthlyPayment)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Saved {formatDate(calculation.createdAt)}</span>
                        {calculation.calculationNotes && (
                          <span className="flex items-center">
                            <span className="mr-1">📝</span>
                            Has notes
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareCalculation(calculation);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Share calculation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCalculation(calculation.calculationId);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete calculation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details for selected calculation */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-slate-900">
                            {formatCurrency(calculation.totalInterest)}
                          </div>
                          <div className="text-slate-600">Total Interest</div>
                        </div>
                        
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-slate-900">
                            {formatCurrency(calculation.totalCost)}
                          </div>
                          <div className="text-slate-600">Total Cost</div>
                        </div>
                        
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-slate-900">
                            {formatCurrency(calculation.loanAmount)}
                          </div>
                          <div className="text-slate-600">Loan Amount</div>
                        </div>
                      </div>

                      {calculation.calculationNotes && (
                        <div className="mt-3 p-3 bg-white rounded-lg">
                          <div className="text-sm text-slate-600 mb-1">Notes:</div>
                          <div className="text-sm text-slate-900">{calculation.calculationNotes}</div>
                        </div>
                      )}

                      {calculation.lenderInfo && (
                        <div className="mt-3 p-3 bg-white rounded-lg">
                          <div className="text-sm text-slate-600 mb-1">Lender Information:</div>
                          <div className="text-sm text-slate-900">
                            {calculation.lenderInfo.name && (
                              <div><strong>Lender:</strong> {calculation.lenderInfo.name}</div>
                            )}
                            {calculation.lenderInfo.rate && (
                              <div><strong>Quoted Rate:</strong> {calculation.lenderInfo.rate}%</div>
                            )}
                            {calculation.lenderInfo.terms && (
                              <div><strong>Terms:</strong> {calculation.lenderInfo.terms}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {calculations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const selected = calculations.find(c => c.calculationId === selectedCalculation);
                  if (selected && onCalculationSelect) {
                    onCalculationSelect(selected);
                  }
                }}
                className="btn-primary flex-1"
                disabled={!selectedCalculation}
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🧮</span>
                  <span>Use This Calculation</span>
                </span>
              </button>
              
              <button
                onClick={loadSavedCalculations}
                className="btn-secondary"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🔄</span>
                  <span>Refresh</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCalculations;