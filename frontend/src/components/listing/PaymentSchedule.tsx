import React, { useState } from 'react';
import { PaymentScheduleItem } from '@harborlist/shared-types';

interface PaymentScheduleProps {
  schedule: PaymentScheduleItem[];
  className?: string;
}

const PaymentSchedule: React.FC<PaymentScheduleProps> = ({ schedule, className = '' }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  if (!schedule || schedule.length === 0) {
    return null;
  }

  // Group payments by year for summary view
  const paymentsByYear = schedule.reduce((acc, payment) => {
    const year = new Date(payment.paymentDate).getFullYear();
    if (!acc[year]) {
      acc[year] = {
        year,
        payments: [],
        totalPrincipal: 0,
        totalInterest: 0,
        totalPayments: 0,
        endingBalance: 0
      };
    }
    acc[year].payments.push(payment);
    acc[year].totalPrincipal += payment.principalAmount;
    acc[year].totalInterest += payment.interestAmount;
    acc[year].totalPayments += payment.totalPayment;
    acc[year].endingBalance = payment.remainingBalance;
    return acc;
  }, {} as Record<number, {
    year: number;
    payments: PaymentScheduleItem[];
    totalPrincipal: number;
    totalInterest: number;
    totalPayments: number;
    endingBalance: number;
  }>);

  const yearSummaries = Object.values(paymentsByYear).sort((a, b) => a.year - b.year);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const displaySchedule = showAll ? schedule : schedule.slice(0, 12);

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            <span className="mr-2">📅</span>Payment Schedule
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedYear === null
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedYear(0)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedYear === 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {selectedYear === 0 ? (
          // Yearly Summary View
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-xs font-medium text-slate-600 uppercase tracking-wide pb-2 border-b border-slate-200">
              <div>Year</div>
              <div className="text-right">Principal</div>
              <div className="text-right">Interest</div>
              <div className="text-right">Total Paid</div>
              <div className="text-right">Balance</div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {yearSummaries.map((yearData) => (
                <div
                  key={yearData.year}
                  className="grid grid-cols-5 gap-4 py-2 text-sm hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => setSelectedYear(yearData.year)}
                >
                  <div className="font-medium text-slate-900">{yearData.year}</div>
                  <div className="text-right text-green-600 font-medium">
                    {formatCurrency(yearData.totalPrincipal)}
                  </div>
                  <div className="text-right text-orange-600">
                    {formatCurrency(yearData.totalInterest)}
                  </div>
                  <div className="text-right text-slate-900 font-medium">
                    {formatCurrency(yearData.totalPayments)}
                  </div>
                  <div className="text-right text-slate-600">
                    {formatCurrency(yearData.endingBalance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedYear && selectedYear > 0 ? (
          // Specific Year Detail View
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-slate-900">{selectedYear} Payment Details</h4>
              <button
                onClick={() => setSelectedYear(0)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Summary
              </button>
            </div>
            
            <div className="grid grid-cols-6 gap-4 text-xs font-medium text-slate-600 uppercase tracking-wide pb-2 border-b border-slate-200">
              <div>Payment #</div>
              <div>Date</div>
              <div className="text-right">Principal</div>
              <div className="text-right">Interest</div>
              <div className="text-right">Payment</div>
              <div className="text-right">Balance</div>
            </div>
            
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {paymentsByYear[selectedYear]?.payments.map((payment) => (
                <div
                  key={payment.paymentNumber}
                  className="grid grid-cols-6 gap-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-slate-900">#{payment.paymentNumber}</div>
                  <div className="text-slate-600">{formatDate(payment.paymentDate)}</div>
                  <div className="text-right text-green-600 font-medium">
                    {formatCurrency(payment.principalAmount)}
                  </div>
                  <div className="text-right text-orange-600">
                    {formatCurrency(payment.interestAmount)}
                  </div>
                  <div className="text-right text-slate-900 font-medium">
                    {formatCurrency(payment.totalPayment)}
                  </div>
                  <div className="text-right text-slate-600">
                    {formatCurrency(payment.remainingBalance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Monthly Detail View
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4 text-xs font-medium text-slate-600 uppercase tracking-wide pb-2 border-b border-slate-200">
              <div>Payment #</div>
              <div>Date</div>
              <div className="text-right">Principal</div>
              <div className="text-right">Interest</div>
              <div className="text-right">Payment</div>
              <div className="text-right">Balance</div>
            </div>
            
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {displaySchedule.map((payment) => (
                <div
                  key={payment.paymentNumber}
                  className="grid grid-cols-6 gap-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-slate-900">#{payment.paymentNumber}</div>
                  <div className="text-slate-600">{formatDate(payment.paymentDate)}</div>
                  <div className="text-right text-green-600 font-medium">
                    {formatCurrency(payment.principalAmount)}
                  </div>
                  <div className="text-right text-orange-600">
                    {formatCurrency(payment.interestAmount)}
                  </div>
                  <div className="text-right text-slate-900 font-medium">
                    {formatCurrency(payment.totalPayment)}
                  </div>
                  <div className="text-right text-slate-600">
                    {formatCurrency(payment.remainingBalance)}
                  </div>
                </div>
              ))}
            </div>

            {!showAll && schedule.length > 12 && (
              <div className="text-center pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Show All {schedule.length} Payments
                </button>
              </div>
            )}

            {showAll && schedule.length > 12 && (
              <div className="text-center pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Show Less
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {schedule.length}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wide">Payments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(schedule.reduce((sum, p) => sum + p.principalAmount, 0))}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wide">Total Principal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(schedule.reduce((sum, p) => sum + p.interestAmount, 0))}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wide">Total Interest</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(schedule.reduce((sum, p) => sum + p.totalPayment, 0))}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wide">Total Paid</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSchedule;