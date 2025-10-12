import React, { useState, useEffect, useCallback } from 'react';
import { FinanceCalculation, PaymentScheduleItem } from '@harborlist/shared-types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import SavedCalculations from './SavedCalculations';
import LoanScenarioComparison from './LoanScenarioComparison';
import PaymentSchedule from './PaymentSchedule';

interface FinanceCalculatorProps {
  boatPrice: number;
  listingId?: string;
  onCalculationSave?: (calculation: FinanceCalculation) => void;
  onCalculationShare?: (calculation: FinanceCalculation) => void;
  className?: string;
}

interface CalculationParams {
  boatPrice: number;
  downPayment: number;
  interestRate: number;
  termMonths: number;
}

interface CalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  loanAmount: number;
  paymentSchedule?: PaymentScheduleItem[];
}

const FinanceCalculator: React.FC<FinanceCalculatorProps> = ({
  boatPrice,
  listingId,
  onCalculationSave,
  onCalculationShare,
  className = ''
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Form state
  const [downPayment, setDownPayment] = useState(Math.round(boatPrice * 0.2)); // Default 20%
  const [interestRate, setInterestRate] = useState(6.5);
  const [termMonths, setTermMonths] = useState(180); // Default 15 years
  const [includeSchedule, setIncludeSchedule] = useState(false);
  
  // Calculation state
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculator' | 'scenarios' | 'saved'>('calculator');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[] | null>(null);

  // Update down payment when boat price changes
  useEffect(() => {
    setDownPayment(Math.round(boatPrice * 0.2));
  }, [boatPrice]);

  // Calculate loan payment using standard amortization formula
  const calculatePayment = useCallback((params: CalculationParams): CalculationResult => {
    const { boatPrice, downPayment, interestRate, termMonths } = params;
    
    const loanAmount = boatPrice - downPayment;
    const monthlyRate = (interestRate / 100) / 12;
    
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / termMonths;
    } else {
      const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths);
      const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
      monthlyPayment = numerator / denominator;
    }
    
    const totalPayments = monthlyPayment * termMonths;
    const totalInterest = totalPayments - loanAmount;
    const totalCost = boatPrice + totalInterest;
    
    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      loanAmount
    };
  }, []);

  // Real-time calculation updates
  useEffect(() => {
    if (boatPrice > 0 && downPayment >= 0 && interestRate >= 0 && termMonths > 0) {
      try {
        const result = calculatePayment({
          boatPrice,
          downPayment,
          interestRate,
          termMonths
        });
        setCalculation(result);
        setError(null);
      } catch (err) {
        setError('Invalid calculation parameters');
        setCalculation(null);
      }
    }
  }, [boatPrice, downPayment, interestRate, termMonths, calculatePayment]);

  // Validate inputs
  const validateInputs = (): string | null => {
    if (boatPrice < 1000 || boatPrice > 10000000) {
      return 'Boat price must be between $1,000 and $10,000,000';
    }
    if (downPayment < 0 || downPayment > boatPrice * 0.9) {
      return 'Down payment must be between $0 and 90% of boat price';
    }
    if (interestRate < 0 || interestRate > 30) {
      return 'Interest rate must be between 0% and 30%';
    }
    if (termMonths < 12 || termMonths > 360) {
      return 'Loan term must be between 1 and 30 years';
    }
    if (boatPrice - downPayment < 1000) {
      return 'Loan amount must be at least $1,000';
    }
    return null;
  };

  // Handle save calculation
  const handleSaveCalculation = async () => {
    if (!user) {
      showToast('Please log in to save calculations', 'error');
      return;
    }

    if (!calculation) {
      showToast('No calculation to save', 'error');
      return;
    }

    const validationError = validateInputs();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/finance/calculate/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          boatPrice,
          downPayment,
          interestRate,
          termMonths,
          listingId,
          includeSchedule: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save calculation');
      }

      const data = await response.json();
      showToast('Calculation saved successfully', 'success');
      
      if (onCalculationSave) {
        onCalculationSave(data.calculation);
      }
    } catch (err) {
      console.error('Error saving calculation:', err);
      showToast('Failed to save calculation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle share calculation
  const handleShareCalculation = async () => {
    if (!calculation) {
      showToast('No calculation to share', 'error');
      return;
    }

    const validationError = validateInputs();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setIsSharing(true);
    try {
      // Create a temporary calculation for sharing
      const tempCalculation: FinanceCalculation = {
        calculationId: 'temp-' + Date.now(),
        listingId: listingId || '',
        boatPrice,
        downPayment,
        loanAmount: calculation.loanAmount,
        interestRate,
        termMonths,
        monthlyPayment: calculation.monthlyPayment,
        totalInterest: calculation.totalInterest,
        totalCost: calculation.totalCost,
        saved: false,
        shared: true,
        createdAt: Date.now()
      };

      // Use Web Share API if available, otherwise copy to clipboard
      if (navigator.share) {
        await navigator.share({
          title: 'Boat Finance Calculator',
          text: `Monthly Payment: $${calculation.monthlyPayment.toLocaleString()} for a $${boatPrice.toLocaleString()} boat`,
          url: window.location.href
        });
      } else {
        // Copy calculation details to clipboard
        const shareText = `Boat Finance Calculation:
Boat Price: $${boatPrice.toLocaleString()}
Down Payment: $${downPayment.toLocaleString()}
Loan Amount: $${calculation.loanAmount.toLocaleString()}
Interest Rate: ${interestRate}%
Term: ${Math.round(termMonths / 12)} years
Monthly Payment: $${calculation.monthlyPayment.toLocaleString()}
Total Interest: $${calculation.totalInterest.toLocaleString()}
Total Cost: $${calculation.totalCost.toLocaleString()}`;

        await navigator.clipboard.writeText(shareText);
        showToast('Calculation copied to clipboard', 'success');
      }

      if (onCalculationShare) {
        onCalculationShare(tempCalculation);
      }
    } catch (err) {
      console.error('Error sharing calculation:', err);
      showToast('Failed to share calculation', 'error');
    } finally {
      setIsSharing(false);
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

  // Handle scenario selection
  const handleScenarioSelect = (scenario: any) => {
    setDownPayment(scenario.params.downPayment);
    setInterestRate(scenario.params.interestRate);
    setTermMonths(scenario.params.termMonths);
    setActiveTab('calculator');
  };

  // Handle saved calculation selection
  const handleSavedCalculationSelect = (savedCalculation: FinanceCalculation) => {
    setDownPayment(savedCalculation.downPayment);
    setInterestRate(savedCalculation.interestRate);
    setTermMonths(savedCalculation.termMonths);
    setPaymentSchedule(savedCalculation.paymentSchedule || null);
    setActiveTab('calculator');
  };

  // Format percentage for down payment
  const downPaymentPercentage = boatPrice > 0 ? (downPayment / boatPrice * 100).toFixed(1) : '0';

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 px-6 pt-6">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'calculator'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>🧮</span>
              <span>Calculator</span>
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>📊</span>
              <span>Compare Scenarios</span>
            </span>
          </button>
          
          {user && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'saved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>💾</span>
                <span>Saved</span>
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'calculator' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">
              <span className="mr-2">🧮</span>Finance Calculator
            </h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showAdvanced ? 'Simple View' : 'Advanced Options'}
            </button>
          </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          {/* Boat Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Boat Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={boatPrice}
                readOnly
                className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Down Payment ({downPaymentPercentage}%)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={Math.floor(boatPrice * 0.9)}
              />
            </div>
            <div className="mt-2">
              <input
                type="range"
                min="0"
                max={Math.floor(boatPrice * 0.9)}
                value={downPayment}
                onChange={(e) => setDownPayment(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="30"
            />
          </div>

          {/* Loan Term */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Loan Term
            </label>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={60}>5 years</option>
              <option value={84}>7 years</option>
              <option value={120}>10 years</option>
              <option value={180}>15 years</option>
              <option value={240}>20 years</option>
              <option value={300}>25 years</option>
              <option value={360}>30 years</option>
            </select>
          </div>

          {showAdvanced && (
            <div className="pt-4 border-t border-slate-200">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeSchedule}
                  onChange={(e) => setIncludeSchedule(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Include payment schedule</span>
              </label>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-slate-50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Payment Estimate</h4>
          
          {calculation ? (
            <div className="space-y-4">
              <div className="text-center pb-4 border-b border-slate-200">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {formatCurrency(calculation.monthlyPayment)}
                </div>
                <div className="text-sm text-slate-600">Monthly Payment</div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Loan Amount:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(calculation.loanAmount)}
                  </span>
                </div>
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
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                {user && (
                  <button
                    onClick={handleSaveCalculation}
                    disabled={isSaving}
                    className="w-full btn-secondary text-sm"
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>💾</span>
                        <span>Save Calculation</span>
                      </span>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleShareCalculation}
                  disabled={isSharing}
                  className="w-full btn-ghost text-sm"
                >
                  {isSharing ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                      <span>Sharing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>📤</span>
                      <span>Share Calculation</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">🧮</div>
              <p>Enter loan details to see payment estimate</p>
            </div>
          )}
        </div>
      </div>

          {/* Payment Schedule */}
          {paymentSchedule && paymentSchedule.length > 0 && showAdvanced && (
            <div className="mt-6">
              <PaymentSchedule schedule={paymentSchedule} />
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Disclaimer:</span> This calculator provides estimates only. 
              Actual loan terms, rates, and payments may vary based on creditworthiness, lender requirements, 
              and other factors. Contact a marine financing specialist for personalized quotes.
            </p>
          </div>
        </div>
      )}

      {/* Scenario Comparison Tab */}
      {activeTab === 'scenarios' && (
        <div className="p-6">
          <LoanScenarioComparison
            baseBoatPrice={boatPrice}
            onScenarioSelect={handleScenarioSelect}
          />
        </div>
      )}

      {/* Saved Calculations Tab */}
      {activeTab === 'saved' && user && (
        <div className="p-6">
          <SavedCalculations
            onCalculationSelect={handleSavedCalculationSelect}
          />
        </div>
      )}
    </div>
  );
};

export default FinanceCalculator;