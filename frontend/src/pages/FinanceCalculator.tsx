/**
 * @fileoverview Standalone finance calculator page
 * 
 * Features:
 * - Loan payment calculations
 * - Scenario comparisons
 * - Saved calculations management
 * - Payment schedule generation
 * - Rate suggestions
 * 
 * @author HarborList Development Team
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { useToast } from '../contexts/ToastContext';
import { financeApi } from '../services/financeApi';
import { FinanceCalculation, PaymentScheduleItem } from '@harborlist/shared-types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

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

const FinanceCalculator: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Form state
  const [params, setParams] = useState<CalculationParams>({
    boatPrice: 100000,
    downPayment: 20000,
    interestRate: 6.5,
    termMonths: 180,
  });

  // Calculation state
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[] | null>(null);
  const [suggestedRates, setSuggestedRates] = useState<number[]>([]);
  const [savedCalculations, setSavedCalculations] = useState<FinanceCalculation[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'calculator' | 'scenarios' | 'saved'>('calculator');
  const [loading, setLoading] = useState(false);
  const [includeSchedule, setIncludeSchedule] = useState(false);
  const [calculationNotes, setCalculationNotes] = useState('');

  // Load initial data
  useEffect(() => {
    calculatePayment();
    loadSuggestedRates();
    if (user) {
      loadSavedCalculations();
    }
  }, []);

  // Recalculate when parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePayment();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [params]);

  const calculatePayment = async () => {
    if (params.boatPrice <= 0 || params.downPayment < 0 || params.interestRate < 0 || params.termMonths <= 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await financeApi.calculateLoanPayment({
        ...params,
        includeSchedule,
      });

      setResult({
        monthlyPayment: response.calculation.monthlyPayment,
        totalInterest: response.calculation.totalInterest,
        totalCost: response.calculation.totalCost,
        loanAmount: response.calculation.loanAmount,
        paymentSchedule: response.calculation.paymentSchedule,
      });

      if (response.calculation.paymentSchedule) {
        setPaymentSchedule(response.calculation.paymentSchedule);
      }
    } catch (error: any) {
      console.error('Calculation error:', error);
      // Fall back to client-side calculation if API fails
      clientSideCalculation();
    } finally {
      setLoading(false);
    }
  };

  const clientSideCalculation = () => {
    const loanAmount = params.boatPrice - params.downPayment;
    const monthlyRate = (params.interestRate / 100) / 12;
    
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / params.termMonths;
    } else {
      const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, params.termMonths);
      const denominator = Math.pow(1 + monthlyRate, params.termMonths) - 1;
      monthlyPayment = numerator / denominator;
    }
    
    const totalPayments = monthlyPayment * params.termMonths;
    const totalInterest = totalPayments - loanAmount;
    const totalCost = params.boatPrice + totalInterest;
    
    setResult({
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      loanAmount,
    });
  };

  const loadSuggestedRates = async () => {
    try {
      const loanAmount = params.boatPrice - params.downPayment;
      const response = await financeApi.getSuggestedRates(loanAmount, params.termMonths);
      setSuggestedRates(response.suggestedRates);
    } catch (error) {
      console.error('Failed to load suggested rates:', error);
    }
  };

  const loadSavedCalculations = async () => {
    if (!user) return;

    try {
      const response = await financeApi.getUserCalculations(user.userId, { limit: 10 });
      setSavedCalculations(response.calculations);
    } catch (error) {
      console.error('Failed to load saved calculations:', error);
    }
  };

  const handleSaveCalculation = async () => {
    if (!user) {
      showError('Authentication Required', 'Please sign in to save calculations');
      return;
    }

    setLoading(true);
    try {
      await financeApi.saveCalculation({
        ...params,
        calculationNotes: calculationNotes || undefined,
      });

      showSuccess('Calculation Saved', 'Your calculation has been saved successfully');
      setCalculationNotes('');
      loadSavedCalculations();
    } catch (error: any) {
      showError('Save Failed', error.message || 'Failed to save calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalculation = async (calculationId: string) => {
    try {
      await financeApi.deleteCalculation(calculationId);
      showSuccess('Calculation Deleted', 'Calculation removed successfully');
      loadSavedCalculations();
    } catch (error: any) {
      showError('Delete Failed', error.message || 'Failed to delete calculation');
    }
  };

  const handleParamChange = (field: keyof CalculationParams, value: number) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const downPaymentPercentage = params.boatPrice > 0 ? (params.downPayment / params.boatPrice * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧮 Boat Finance Calculator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Calculate loan payments, compare scenarios, and plan your boat financing
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8 justify-center">
            {[
              { id: 'calculator', label: 'Calculator', icon: '🧮' },
              { id: 'scenarios', label: 'Compare Scenarios', icon: '📊' },
              { id: 'saved', label: 'Saved Calculations', icon: '💾' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Parameters</h2>
              
              <div className="space-y-6">
                {/* Boat Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Boat Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={params.boatPrice}
                      onChange={(e) => handleParamChange('boatPrice', parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1000"
                      max="10000000"
                    />
                  </div>
                </div>

                {/* Down Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Down Payment ({downPaymentPercentage}%)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={params.downPayment}
                      onChange={(e) => handleParamChange('downPayment', parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max={Math.floor(params.boatPrice * 0.9)}
                    />
                  </div>
                  <div className="mt-2">
                    <input
                      type="range"
                      min="0"
                      max={Math.floor(params.boatPrice * 0.9)}
                      value={params.downPayment}
                      onChange={(e) => handleParamChange('downPayment', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={params.interestRate}
                    onChange={(e) => handleParamChange('interestRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="30"
                  />
                  
                  {/* Suggested Rates */}
                  {suggestedRates.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Suggested rates:</p>
                      <div className="flex space-x-2">
                        {suggestedRates.map((rate) => (
                          <button
                            key={rate}
                            onClick={() => handleParamChange('interestRate', rate)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Loan Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Term
                  </label>
                  <select
                    value={params.termMonths}
                    onChange={(e) => handleParamChange('termMonths', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Advanced Options */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={includeSchedule}
                      onChange={(e) => setIncludeSchedule(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Include payment schedule</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Estimate</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="text-center pb-6 border-b border-gray-200">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {formatCurrency(result.monthlyPayment)}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Payment</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Amount:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(result.loanAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Interest:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(result.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(result.totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {user && (
                    <div className="pt-6 border-t border-gray-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          value={calculationNotes}
                          onChange={(e) => setCalculationNotes(e.target.value)}
                          placeholder="Add notes about this calculation..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <button
                        onClick={handleSaveCalculation}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        💾 Save Calculation
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">🧮</div>
                  <p>Enter loan details to see payment estimate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saved Calculations Tab */}
        {activeTab === 'saved' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Saved Calculations</h2>
              {!user && (
                <p className="text-gray-500">Sign in to save calculations</p>
              )}
            </div>
            
            {user ? (
              savedCalculations.length > 0 ? (
                <div className="space-y-4">
                  {savedCalculations.map((calc) => (
                    <div key={calc.calculationId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Boat Price:</span>
                              <div className="font-medium">{formatCurrency(calc.boatPrice)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Down Payment:</span>
                              <div className="font-medium">{formatCurrency(calc.downPayment)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Rate:</span>
                              <div className="font-medium">{calc.interestRate}%</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Monthly Payment:</span>
                              <div className="font-medium text-blue-600">{formatCurrency(calc.monthlyPayment)}</div>
                            </div>
                          </div>
                          {calc.calculationNotes && (
                            <p className="text-sm text-gray-600 mt-2">{calc.calculationNotes}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Saved {new Date(calc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setParams({
                                boatPrice: calc.boatPrice,
                                downPayment: calc.downPayment,
                                interestRate: calc.interestRate,
                                termMonths: calc.termMonths,
                              });
                              setActiveTab('calculator');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteCalculation(calc.calculationId)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💾</div>
                  <p className="text-gray-500 mb-4">No saved calculations</p>
                  <button
                    onClick={() => setActiveTab('calculator')}
                    className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Calculation
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-gray-500 mb-4">Sign in to save and manage calculations</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Schedule */}
        {paymentSchedule && paymentSchedule.length > 0 && activeTab === 'calculator' && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Schedule</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentSchedule.slice(0, 12).map((payment) => (
                    <tr key={payment.paymentNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paymentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paymentDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.principalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.interestAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.totalPayment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.remainingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentSchedule.length > 12 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Showing first 12 payments of {paymentSchedule.length} total payments
              </p>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Disclaimer:</span> This calculator provides estimates only. 
            Actual loan terms, rates, and payments may vary based on creditworthiness, lender requirements, 
            and other factors. Contact a marine financing specialist for personalized quotes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceCalculator;