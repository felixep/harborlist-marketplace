import { 
  Transaction, 
  BillingAccount, 
  FinanceCalculation, 
  PaymentScheduleItem,
  DisputeCase,
  DisputeEvidence,
  PaymentProcessor,
  FinancialReport,
  ExportOptions
} from '../common';

describe('Financial Management Types', () => {
  describe('Transaction Interface', () => {
    it('should validate Transaction structure', () => {
      const transaction: Transaction = {
        id: 'txn-123',
        transactionId: 'txn-123', // Alternative ID
        type: 'payment',
        amount: 150.00,
        currency: 'USD',
        status: 'completed',
        userId: 'user-456',
        userName: 'John Buyer',
        userEmail: 'john@example.com',
        listingId: 'listing-789',
        listingTitle: 'Beautiful Yacht',
        paymentMethod: 'credit_card',
        processorTransactionId: 'pi_1234567890',
        createdAt: '2023-10-01T10:00:00Z',
        completedAt: '2023-10-01T10:05:00Z',
        description: 'Premium membership payment',
        fees: 4.50,
        netAmount: 145.50,
        metadata: {
          plan: 'premium_individual',
          billingCycle: 'monthly'
        }
      };

      expect(transaction.id).toBe('txn-123');
      expect(transaction.transactionId).toBe('txn-123');
      expect(transaction.type).toBe('payment');
      expect(transaction.amount).toBe(150.00);
      expect(transaction.fees).toBe(4.50);
      expect(transaction.netAmount).toBe(145.50);
    });

    it('should validate Transaction type enum values', () => {
      const validTypes: Transaction['type'][] = [
        'payment',
        'refund',
        'commission',
        'payout',
        'membership',
        'subscription'
      ];

      validTypes.forEach(type => {
        const transaction: Transaction = {
          id: 'test',
          transactionId: 'test',
          type,
          amount: 100,
          currency: 'USD',
          status: 'completed',
          userId: 'user-test',
          userName: 'Test User',
          userEmail: 'test@example.com',
          paymentMethod: 'credit_card',
          processorTransactionId: 'test-123',
          createdAt: '2023-10-01T10:00:00Z',
          description: 'Test transaction',
          fees: 3,
          netAmount: 97
        };
        expect(transaction.type).toBe(type);
      });
    });

    it('should validate Transaction status enum values', () => {
      const validStatuses: Transaction['status'][] = [
        'pending',
        'completed',
        'failed',
        'disputed',
        'cancelled'
      ];

      validStatuses.forEach(status => {
        const transaction: Transaction = {
          id: 'test',
          transactionId: 'test',
          type: 'payment',
          amount: 100,
          currency: 'USD',
          status,
          userId: 'user-test',
          userName: 'Test User',
          userEmail: 'test@example.com',
          paymentMethod: 'credit_card',
          processorTransactionId: 'test-123',
          createdAt: '2023-10-01T10:00:00Z',
          description: 'Test transaction',
          fees: 3,
          netAmount: 97
        };
        expect(transaction.status).toBe(status);
      });
    });
  });

  describe('BillingAccount Interface', () => {
    it('should validate BillingAccount structure', () => {
      const billingAccount: BillingAccount = {
        billingId: 'bill-123',
        userId: 'user-456',
        customerId: 'cus_stripe123',
        paymentMethodId: 'pm_card456',
        subscriptionId: 'sub_789',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        status: 'active',
        nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        paymentHistory: [],
        billingAddress: {
          street: '123 Main St',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'US'
        },
        taxInfo: {
          taxId: 'TAX123456',
          taxExempt: false,
          taxRate: 0.08
        },
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now()
      };

      expect(billingAccount.billingId).toBe('bill-123');
      expect(billingAccount.plan).toBe('premium_individual');
      expect(billingAccount.amount).toBe(29.99);
      expect(billingAccount.status).toBe('active');
      expect(billingAccount.billingAddress?.city).toBe('Miami');
      expect(billingAccount.taxInfo?.taxRate).toBe(0.08);
    });

    it('should validate BillingAccount status enum values', () => {
      const validStatuses: BillingAccount['status'][] = [
        'active',
        'past_due',
        'canceled',
        'suspended',
        'trialing'
      ];

      validStatuses.forEach(status => {
        const account: BillingAccount = {
          billingId: 'test',
          userId: 'user-test',
          plan: 'basic',
          amount: 10,
          currency: 'USD',
          status,
          paymentHistory: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        expect(account.status).toBe(status);
      });
    });

    it('should support trial accounts', () => {
      const trialAccount: BillingAccount = {
        billingId: 'trial-123',
        userId: 'user-trial',
        plan: 'premium_trial',
        amount: 0,
        currency: 'USD',
        status: 'trialing',
        trialEndsAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
        paymentHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(trialAccount.status).toBe('trialing');
      expect(trialAccount.amount).toBe(0);
      expect(typeof trialAccount.trialEndsAt).toBe('number');
    });
  });

  describe('FinanceCalculation Interface', () => {
    it('should validate FinanceCalculation structure', () => {
      const calculation: FinanceCalculation = {
        calculationId: 'calc-123',
        listingId: 'listing-456',
        userId: 'user-789',
        boatPrice: 150000,
        downPayment: 30000,
        loanAmount: 120000,
        interestRate: 0.065,
        termMonths: 240,
        monthlyPayment: 892.45,
        totalInterest: 94188,
        totalCost: 244188,
        paymentSchedule: [
          {
            paymentNumber: 1,
            paymentDate: '2023-11-01',
            principalAmount: 242.45,
            interestAmount: 650.00,
            totalPayment: 892.45,
            remainingBalance: 119757.55
          }
        ],
        saved: true,
        shared: false,
        calculationNotes: 'Conservative estimate with good credit',
        lenderInfo: {
          name: 'Marine Finance Corp',
          rate: 6.5,
          terms: '20 years, fixed rate'
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(calculation.calculationId).toBe('calc-123');
      expect(calculation.boatPrice).toBe(150000);
      expect(calculation.loanAmount).toBe(120000);
      expect(calculation.monthlyPayment).toBe(892.45);
      expect(calculation.paymentSchedule).toHaveLength(1);
      expect(calculation.lenderInfo?.name).toBe('Marine Finance Corp');
    });

    it('should support shared calculations', () => {
      const sharedCalculation: FinanceCalculation = {
        calculationId: 'calc-shared',
        listingId: 'listing-123',
        boatPrice: 75000,
        downPayment: 15000,
        loanAmount: 60000,
        interestRate: 0.07,
        termMonths: 180,
        monthlyPayment: 542.33,
        totalInterest: 37619.4,
        totalCost: 112619.4,
        saved: true,
        shared: true,
        shareToken: 'share_abc123def456',
        createdAt: Date.now()
      };

      expect(sharedCalculation.shared).toBe(true);
      expect(sharedCalculation.shareToken).toBe('share_abc123def456');
    });
  });

  describe('PaymentScheduleItem Interface', () => {
    it('should validate PaymentScheduleItem structure', () => {
      const scheduleItem: PaymentScheduleItem = {
        paymentNumber: 12,
        paymentDate: '2024-10-01',
        principalAmount: 456.78,
        interestAmount: 435.67,
        totalPayment: 892.45,
        remainingBalance: 115432.22
      };

      expect(scheduleItem.paymentNumber).toBe(12);
      expect(scheduleItem.principalAmount).toBe(456.78);
      expect(scheduleItem.interestAmount).toBe(435.67);
      expect(scheduleItem.totalPayment).toBe(892.45);
      expect(scheduleItem.remainingBalance).toBe(115432.22);
    });
  });

  describe('DisputeCase Interface', () => {
    it('should validate DisputeCase structure', () => {
      const disputeCase: DisputeCase = {
        // DisputedTransaction properties
        id: 'dispute-123',
        transactionId: 'txn-456',
        type: 'payment',
        amount: 500,
        currency: 'USD',
        status: 'disputed',
        userId: 'user-789',
        userName: 'John Disputed',
        userEmail: 'john@example.com',
        paymentMethod: 'credit_card',
        processorTransactionId: 'pi_disputed123',
        createdAt: '2023-10-01T10:00:00Z',
        description: 'Disputed premium membership',
        fees: 15,
        netAmount: 485,
        disputeReason: 'Service not provided as described',
        disputeDate: '2023-10-05T14:30:00Z',
        disputeStatus: 'under_review',
        // DisputeCase specific properties
        disputeId: 'dispute-123',
        caseNumber: 'CASE-2023-001',
        disputeType: 'chargeback',
        disputeAmount: 500,
        evidenceRequired: ['receipt', 'communication', 'refund'],
        evidenceSubmitted: [
          {
            evidenceId: 'evidence-1',
            type: 'receipt',
            description: 'Original payment receipt',
            fileUrl: 'https://example.com/receipt.pdf',
            submittedAt: '2023-10-06T09:00:00Z',
            submittedBy: 'admin-123'
          }
        ],
        respondByDate: '2023-10-15T23:59:59Z',
        assignedTo: 'dispute-specialist-456',
        priority: 'high'
      };

      expect(disputeCase.disputeId).toBe('dispute-123');
      expect(disputeCase.caseNumber).toBe('CASE-2023-001');
      expect(disputeCase.disputeType).toBe('chargeback');
      expect(disputeCase.evidenceSubmitted).toHaveLength(1);
      expect(disputeCase.priority).toBe('high');
    });

    it('should validate DisputeCase disputeType enum values', () => {
      const validDisputeTypes: DisputeCase['disputeType'][] = [
        'chargeback',
        'inquiry',
        'fraud',
        'authorization',
        'processing_error'
      ];

      validDisputeTypes.forEach(disputeType => {
        const dispute: Partial<DisputeCase> = {
          disputeType,
          disputeAmount: 100,
          evidenceRequired: [],
          evidenceSubmitted: [],
          respondByDate: '2023-12-01T00:00:00Z',
          priority: 'medium'
        };
        expect(dispute.disputeType).toBe(disputeType);
      });
    });

    it('should support resolved disputes', () => {
      const resolvedDispute: Partial<DisputeCase> = {
        disputeStatus: 'resolved',
        resolution: {
          outcome: 'won',
          resolvedAt: '2023-10-20T15:30:00Z',
          resolvedBy: 'dispute-manager-789',
          notes: 'Provided sufficient evidence to win the case'
        }
      };

      expect(resolvedDispute.resolution?.outcome).toBe('won');
      expect(resolvedDispute.resolution?.resolvedBy).toBe('dispute-manager-789');
    });
  });

  describe('DisputeEvidence Interface', () => {
    it('should validate DisputeEvidence structure', () => {
      const evidence: DisputeEvidence = {
        evidenceId: 'evidence-456',
        type: 'communication',
        description: 'Email correspondence with customer',
        fileUrl: 'https://example.com/emails.pdf',
        submittedAt: '2023-10-07T11:30:00Z',
        submittedBy: 'support-agent-123'
      };

      expect(evidence.evidenceId).toBe('evidence-456');
      expect(evidence.type).toBe('communication');
      expect(evidence.description).toBe('Email correspondence with customer');
      expect(evidence.submittedBy).toBe('support-agent-123');
    });

    it('should validate DisputeEvidence type enum values', () => {
      const validTypes: DisputeEvidence['type'][] = [
        'receipt',
        'communication',
        'shipping',
        'refund',
        'other'
      ];

      validTypes.forEach(type => {
        const evidence: DisputeEvidence = {
          evidenceId: 'test',
          type,
          description: 'Test evidence',
          submittedAt: '2023-10-01T10:00:00Z',
          submittedBy: 'admin-test'
        };
        expect(evidence.type).toBe(type);
      });
    });
  });

  describe('PaymentProcessor Interface', () => {
    it('should validate PaymentProcessor structure', () => {
      const processor: PaymentProcessor = {
        name: 'Stripe',
        type: 'stripe',
        isActive: true,
        configuration: {
          apiKey: 'sk_test_123456789',
          webhookSecret: 'whsec_abcdefghijk',
          environment: 'sandbox'
        },
        supportedFeatures: {
          payments: true,
          refunds: true,
          disputes: true,
          payouts: true,
          subscriptions: true
        }
      };

      expect(processor.name).toBe('Stripe');
      expect(processor.type).toBe('stripe');
      expect(processor.isActive).toBe(true);
      expect(processor.configuration.environment).toBe('sandbox');
      expect(processor.supportedFeatures.payments).toBe(true);
    });

    it('should validate PaymentProcessor type enum values', () => {
      const validTypes: PaymentProcessor['type'][] = [
        'stripe',
        'paypal',
        'square',
        'other'
      ];

      validTypes.forEach(type => {
        const processor: PaymentProcessor = {
          name: 'Test Processor',
          type,
          isActive: true,
          configuration: {
            environment: 'production'
          },
          supportedFeatures: {
            payments: true,
            refunds: false,
            disputes: false,
            payouts: false,
            subscriptions: false
          }
        };
        expect(processor.type).toBe(type);
      });
    });
  });

  describe('FinancialReport Interface', () => {
    it('should validate FinancialReport structure', () => {
      const report: FinancialReport = {
        id: 'report-123',
        reportId: 'report-123', // Alternative ID
        type: 'revenue',
        title: 'Monthly Revenue Report - October 2023',
        description: 'Comprehensive revenue analysis for October',
        dateRange: {
          startDate: '2023-10-01',
          endDate: '2023-10-31'
        },
        generatedAt: '2023-11-01T09:00:00Z',
        generatedBy: 'admin-456',
        format: 'pdf',
        downloadUrl: 'https://example.com/reports/revenue-oct-2023.pdf',
        status: 'completed',
        filters: {
          userType: 'premium',
          paymentMethod: 'credit_card'
        },
        summary: {
          totalRevenue: 45678.90,
          totalTransactions: 234,
          averageTransactionValue: 195.25,
          topPaymentMethods: [
            { method: 'credit_card', count: 180, amount: 35123.45 },
            { method: 'paypal', count: 54, amount: 10555.45 }
          ]
        }
      };

      expect(report.id).toBe('report-123');
      expect(report.type).toBe('revenue');
      expect(report.status).toBe('completed');
      expect(report.summary?.totalRevenue).toBe(45678.90);
      expect(report.summary?.topPaymentMethods).toHaveLength(2);
    });

    it('should validate FinancialReport type enum values', () => {
      const validTypes: FinancialReport['type'][] = [
        'revenue',
        'commission',
        'payout',
        'dispute',
        'subscription',
        'membership'
      ];

      validTypes.forEach(type => {
        const report: FinancialReport = {
          id: 'test',
          type,
          title: 'Test Report',
          description: 'Test description',
          dateRange: {
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          },
          generatedAt: '2023-11-01T09:00:00Z',
          generatedBy: 'admin-test',
          format: 'csv',
          status: 'generating'
        };
        expect(report.type).toBe(type);
      });
    });

    it('should validate FinancialReport format enum values', () => {
      const validFormats: FinancialReport['format'][] = [
        'csv',
        'pdf',
        'excel',
        'json'
      ];

      validFormats.forEach(format => {
        const report: FinancialReport = {
          id: 'test',
          type: 'revenue',
          title: 'Test Report',
          description: 'Test description',
          dateRange: {
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          },
          generatedAt: '2023-11-01T09:00:00Z',
          generatedBy: 'admin-test',
          format,
          status: 'completed'
        };
        expect(report.format).toBe(format);
      });
    });
  });

  describe('ExportOptions Interface', () => {
    it('should validate ExportOptions structure', () => {
      const exportOptions: ExportOptions = {
        format: 'csv',
        dateRange: {
          startDate: '2023-10-01',
          endDate: '2023-10-31'
        },
        metrics: ['revenue', 'transactions', 'users'],
        includeCharts: false
      };

      expect(exportOptions.format).toBe('csv');
      expect(exportOptions.dateRange.startDate).toBe('2023-10-01');
      expect(exportOptions.metrics).toContain('revenue');
      expect(exportOptions.includeCharts).toBe(false);
    });

    it('should validate ExportOptions format enum values', () => {
      const validFormats: ExportOptions['format'][] = ['csv', 'pdf'];

      validFormats.forEach(format => {
        const options: ExportOptions = {
          format,
          dateRange: {
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          },
          metrics: ['revenue'],
          includeCharts: true
        };
        expect(options.format).toBe(format);
      });
    });
  });
});