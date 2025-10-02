import { useState, useEffect } from 'react';
import { 
  Transaction, 
  FinancialSummary, 
  DisputedTransaction, 
  RefundRequest,
  PayoutSchedule,
  FinancialReport 
} from '@harborlist/shared-types';

interface UseFinancialDataReturn {
  // Data
  summary: FinancialSummary | null;
  transactions: Transaction[];
  disputes: DisputedTransaction[];
  refundRequests: RefundRequest[];
  payoutSchedule: PayoutSchedule[];
  reports: FinancialReport[];
  
  // Loading states
  isLoading: boolean;
  isLoadingTransactions: boolean;
  isLoadingDisputes: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  fetchSummary: () => Promise<void>;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  fetchDisputes: () => Promise<void>;
  processRefund: (transactionId: string, amount: number, reason: string) => Promise<void>;
  resolveDispute: (disputeId: string, resolution: string, notes?: string) => Promise<void>;
  generateReport: (type: string, dateRange: { start: string; end: string }) => Promise<void>;
  exportData: (format: 'csv' | 'pdf', filters?: any) => Promise<void>;
}

interface TransactionFilters {
  status?: string;
  type?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  userId?: string;
  search?: string;
}

export const useFinancialData = (): UseFinancialDataReturn => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<DisputedTransaction[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for placeholder implementation
  const mockSummary: FinancialSummary = {
    totalRevenue: 125000,
    totalTransactions: 1250,
    pendingPayouts: 15000,
    disputedTransactions: 5,
    commissionEarned: 12500,
    refundsProcessed: 2500
  };

  const mockTransactions: Transaction[] = [
    {
      id: 'txn_001',
      type: 'payment',
      amount: 50000,
      currency: 'USD',
      status: 'completed',
      userId: 'user_123',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      listingId: 'listing_456',
      listingTitle: '2020 Sea Ray Sundancer',
      paymentMethod: 'Credit Card',
      processorTransactionId: 'stripe_ch_123456',
      createdAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:31:00Z',
      description: 'Boat listing purchase',
      fees: 1500,
      netAmount: 48500
    },
    {
      id: 'txn_002',
      type: 'commission',
      amount: 2500,
      currency: 'USD',
      status: 'completed',
      userId: 'platform',
      userName: 'Platform Commission',
      userEmail: 'admin@harborlist.com',
      listingId: 'listing_456',
      listingTitle: '2020 Sea Ray Sundancer',
      paymentMethod: 'Automatic',
      processorTransactionId: 'commission_123456',
      createdAt: '2024-01-15T10:31:00Z',
      completedAt: '2024-01-15T10:31:00Z',
      description: 'Platform commission (5%)',
      fees: 0,
      netAmount: 2500
    }
  ];

  const mockDisputes: DisputedTransaction[] = [
    {
      ...mockTransactions[0],
      disputeReason: 'Item not as described',
      disputeDate: '2024-01-20T14:00:00Z',
      disputeStatus: 'under_review',
      disputeNotes: 'Customer claims boat condition differs from listing'
    }
  ];

  const fetchSummary = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await adminApi.getFinancialSummary();
      // setSummary(response.data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSummary(mockSummary);
    } catch (err) {
      setError('Failed to fetch financial summary');
      console.error('Error fetching financial summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (filters?: TransactionFilters): Promise<void> => {
    setIsLoadingTransactions(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await adminApi.getTransactions(filters);
      // setTransactions(response.data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Apply mock filtering
      let filteredTransactions = [...mockTransactions];
      if (filters?.status && filters.status !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.status === filters.status);
      }
      if (filters?.type && filters.type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
      }
      
      setTransactions(filteredTransactions);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchDisputes = async (): Promise<void> => {
    setIsLoadingDisputes(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await adminApi.getDisputes();
      // setDisputes(response.data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      setDisputes(mockDisputes);
    } catch (err) {
      setError('Failed to fetch disputes');
      console.error('Error fetching disputes:', err);
    } finally {
      setIsLoadingDisputes(false);
    }
  };

  const processRefund = async (transactionId: string, amount: number, reason: string): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // await adminApi.processRefund({ transactionId, amount, reason });
      
      console.log('Processing refund:', { transactionId, amount, reason });
      
      // Update local state to reflect refund processing
      setTransactions(prev => 
        prev.map(t => 
          t.id === transactionId 
            ? { ...t, status: 'pending' as const }
            : t
        )
      );
      
      // Show success message (in real implementation, this would be handled by a toast system)
      alert('Refund request submitted successfully');
    } catch (err) {
      setError('Failed to process refund');
      console.error('Error processing refund:', err);
    }
  };

  const resolveDispute = async (disputeId: string, resolution: string, notes?: string): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // await adminApi.resolveDispute({ disputeId, resolution, notes });
      
      console.log('Resolving dispute:', { disputeId, resolution, notes });
      
      // Update local state
      setDisputes(prev => 
        prev.map(d => 
          d.id === disputeId 
            ? { ...d, disputeStatus: 'resolved' as const, disputeNotes: notes }
            : d
        )
      );
      
      alert('Dispute resolved successfully');
    } catch (err) {
      setError('Failed to resolve dispute');
      console.error('Error resolving dispute:', err);
    }
  };

  const generateReport = async (type: string, dateRange: { start: string; end: string }): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // const response = await adminApi.generateFinancialReport({ type, dateRange });
      
      console.log('Generating report:', { type, dateRange });
      
      // Mock report generation
      const newReport: FinancialReport = {
        id: `report_${Date.now()}`,
        type: type as any,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        description: `Financial report for ${dateRange.start} to ${dateRange.end}`,
        dateRange: {
          startDate: dateRange.start,
          endDate: dateRange.end
        },
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@harborlist.com',
        format: 'pdf',
        status: 'generating'
      };
      
      setReports(prev => [newReport, ...prev]);
      
      // Simulate report generation completion
      setTimeout(() => {
        setReports(prev => 
          prev.map(r => 
            r.id === newReport.id 
              ? { ...r, status: 'completed' as const, downloadUrl: '/api/reports/download/' + r.id }
              : r
          )
        );
      }, 3000);
      
      alert('Report generation started');
    } catch (err) {
      setError('Failed to generate report');
      console.error('Error generating report:', err);
    }
  };

  const exportData = async (format: 'csv' | 'pdf', filters?: any): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // const response = await adminApi.exportFinancialData({ format, filters });
      
      console.log('Exporting data:', { format, filters });
      
      // Mock data export
      const blob = new Blob(['Mock financial data export'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Data export completed');
    } catch (err) {
      setError('Failed to export data');
      console.error('Error exporting data:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchSummary();
    fetchTransactions();
    fetchDisputes();
  }, []);

  return {
    // Data
    summary,
    transactions,
    disputes,
    refundRequests,
    payoutSchedule,
    reports,
    
    // Loading states
    isLoading,
    isLoadingTransactions,
    isLoadingDisputes,
    
    // Error states
    error,
    
    // Actions
    fetchSummary,
    fetchTransactions,
    fetchDisputes,
    processRefund,
    resolveDispute,
    generateReport,
    exportData
  };
};