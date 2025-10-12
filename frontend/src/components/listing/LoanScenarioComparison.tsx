import React, { useState, useEffect } from 'react';
import { FinanceCalculation } from '@harborlist/shared-types';

interface LoanScenario {
  scenarioId: string;
  name: string;
  params: {
    boatPrice: number;
    downPayment: number;
    interestRate: number;
    termMonths: number;
  };
  result: FinanceCalculation;
}

interface LoanScenarioComparisonProps {
  baseBoatPrice: number;
  onScenarioSelect?: (scenario: LoanScenario) => void;
  className?: string;
}

const LoanScenarioComparison: React.FC<LoanScenarioComparisonProps> = ({
  baseBoatPrice,
  onScenarioSelect,
  className = ''
}) => {
  const [scenarios, setScenarios] = useState<LoanScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Generate default scenarios when component mounts
  useEffect(() => {
    generateDefaultScenarios();
  }, [baseBoatPrice]);

  // Calculate loan payment using standard amortization formula
  const calculatePayment = (params: {
    boatPrice: number;
    downPayment: number;
    interestRate: number;
    termMonths: number;
  }): Omit<FinanceCalculation, 'calculationId' | 'listingId' | 'userId' | 'saved' | 'shared' | 'createdAt'> => {
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
      boatPrice,
      downPayment,
      loanAmount,
      interestRate,
      termMonths,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  };

  // Generate default comparison scenarios
  const generateDefaultScenarios = () => {
    if (baseBoatPrice <= 0) return;

    const baseParams = {
      boatPrice: baseBoatPrice,
      downPayment: Math.round(baseBoatPrice * 0.2), // 20%
      interestRate: 6.5,
      termMonths: 180 // 15 years
    };

    const scenarioVariations = [
      {
        name: 'Conservative (20% down, 15 years)',
        params: baseParams
      },
      {
        name: 'Lower Down Payment (10% down, 15 years)',
        params: {
          ...baseParams,
          downPayment: Math.round(baseBoatPrice * 0.1)
        }
      },
      {
        name: 'Shorter Term (20% down, 10 years)',
        params: {
          ...baseParams,
          termMonths: 120
        }
      },
      {
        name: 'Longer Term (20% down, 20 years)',
        params: {
          ...baseParams,
          termMonths: 240
        }
      },
      {
        name: 'Higher Down Payment (30% down, 15 years)',
        params: {
          ...baseParams,
          downPayment: Math.round(baseBoatPrice * 0.3)
        }
      },
      {
        name: 'Premium Rate (20% down, 7.5%, 15 years)',
        params: {
          ...baseParams,
          interestRate: 7.5
        }
      }
    ];

    const calculatedScenarios: LoanScenario[] = scenarioVariations.map((scenario, index) => {
      const result = calculatePayment(scenario.params);
      
      return {
        scenarioId: `scenario-${index}`,
        name: scenario.name,
        params: scenario.params,
        result: {
          calculationId: `calc-${index}`,
          listingId: '',
          saved: false,
          shared: false,
          createdAt: Date.now(),
          ...result,
        }
      };
    });

    setScenarios(calculatedScenarios);
    setSelectedScenario(calculatedScenarios[0]?.scenarioId || null);
  };

  // Handle scenario selection
  const handleScenarioSelect = (scenario: LoanScenario) => {
    setSelectedScenario(scenario.scenarioId);
    if (onScenarioSelect) {
      onScenarioSelect(scenario);
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

  // Calculate savings compared to base scenario
  const getComparisonData = (scenario: LoanScenario) => {
    const baseScenario = scenarios[0];
    if (!baseScenario || scenario.scenarioId === baseScenario.scenarioId) {
      return null;
    }

    const monthlySavings = baseScenario.result.monthlyPayment - scenario.result.monthlyPayment;
    const totalSavings = baseScenario.result.totalCost - scenario.result.totalCost;

    return {
      monthlySavings,
      totalSavings,
      isLower: monthlySavings > 0
    };
  };

  if (scenarios.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-900">
          <span className="mr-2">📊</span>Loan Scenario Comparison
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Compare different financing options to find the best fit for your budget
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenario === scenario.scenarioId;
            const comparison = getComparisonData(scenario);
            
            return (
              <div
                key={scenario.scenarioId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                onClick={() => handleScenarioSelect(scenario)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{scenario.name}</h4>
                      {isSelected && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Selected
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-slate-600">Down Payment</div>
                        <div className="font-medium text-slate-900">
                          {formatCurrency(scenario.params.downPayment)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {((scenario.params.downPayment / scenario.params.boatPrice) * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-slate-600">Interest Rate</div>
                        <div className="font-medium text-slate-900">
                          {scenario.params.interestRate}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-slate-600">Term</div>
                        <div className="font-medium text-slate-900">
                          {formatTerm(scenario.params.termMonths)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-slate-600">Loan Amount</div>
                        <div className="font-medium text-slate-900">
                          {formatCurrency(scenario.result.loanAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {formatCurrency(scenario.result.monthlyPayment)}
                    </div>
                    <div className="text-xs text-slate-600">Monthly Payment</div>
                    
                    {comparison && (
                      <div className={`text-xs mt-1 ${
                        comparison.isLower ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {comparison.isLower ? '↓' : '↑'} {formatCurrency(Math.abs(comparison.monthlySavings))}/mo
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded details for selected scenario */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-lg font-bold text-slate-900">
                          {formatCurrency(scenario.result.totalInterest)}
                        </div>
                        <div className="text-slate-600">Total Interest</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-lg font-bold text-slate-900">
                          {formatCurrency(scenario.result.totalCost)}
                        </div>
                        <div className="text-slate-600">Total Cost</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-lg font-bold text-slate-900">
                          {scenario.params.termMonths}
                        </div>
                        <div className="text-slate-600">Total Payments</div>
                      </div>
                    </div>

                    {comparison && (
                      <div className="mt-3 p-3 bg-white rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">Compared to Conservative scenario:</div>
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${
                            comparison.isLower ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {comparison.isLower ? 'Save' : 'Pay'} {formatCurrency(Math.abs(comparison.monthlySavings))} per month
                          </span>
                          <span className={`font-medium ${
                            comparison.totalSavings > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {comparison.totalSavings > 0 ? 'Save' : 'Pay'} {formatCurrency(Math.abs(comparison.totalSavings))} total
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const selected = scenarios.find(s => s.scenarioId === selectedScenario);
                if (selected && onScenarioSelect) {
                  onScenarioSelect(selected);
                }
              }}
              className="btn-primary flex-1"
              disabled={!selectedScenario}
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🧮</span>
                <span>Use This Scenario</span>
              </span>
            </button>
            
            <button
              onClick={generateDefaultScenarios}
              className="btn-secondary"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🔄</span>
                <span>Refresh Scenarios</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 pb-6">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Note:</span> These scenarios use estimated interest rates. 
            Actual rates may vary based on credit score, loan amount, and lender requirements. 
            Contact a marine financing specialist for personalized quotes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanScenarioComparison;