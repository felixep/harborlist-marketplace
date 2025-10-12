/**
 * @fileoverview Payment failure and dispute handling service for HarborList billing system.
 * 
 * Handles payment failures, retry mechanisms, and dispute resolution:
 * - Payment retry mechanisms and dunning management
 * - Dispute resolution workflow and communication
 * - Payment failure notification and recovery systems
 * - Automated recovery processes and grace periods
 * 
 * Business Rules:
 * - 3 retry attempts with exponential backoff
 * - 7-day grace period for failed payments
 * - Automatic subscription suspension after grace period
 * - Dispute evidence collection and submission
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { db } from '../shared/database';
import { PaymentProcessor } from './payment-processors/stripe';
import { BillingAccount, Transaction, DisputeCase, DisputeEvidence } from '@harborlist/shared-types';
import { generateId } from '../shared/utils';

/**
 * Payment failure reason codes
 */
export enum PaymentFailureReason {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INVALID_CARD = 'invalid_card',
  PROCESSING_ERROR = 'processing_error',
  FRAUD_SUSPECTED = 'fraud_suspected',
  AUTHENTICATION_REQUIRED = 'authentication_required',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

/**
 * Payment retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  gracePeriodDays: number;
}

/**
 * Payment failure record
 */
export interface PaymentFailure {
  failureId: string;
  transactionId: string;
  subscriptionId?: string;
  billingAccountId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: PaymentFailureReason;
  reasonDetails?: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt?: number;
  gracePeriodEnds: number;
  resolved: boolean;
  resolvedAt?: number;
  resolutionMethod?: 'retry_success' | 'manual_payment' | 'plan_change' | 'cancellation';
  createdAt: number;
  updatedAt: number;
}

/**
 * Dunning campaign configuration
 */
export interface DunningCampaign {
  campaignId: string;
  name: string;
  triggers: {
    failureReasons: PaymentFailureReason[];
    subscriptionTypes: string[];
    customerSegments: string[];
  };
  steps: DunningStep[];
  active: boolean;
}

/**
 * Dunning step configuration
 */
export interface DunningStep {
  stepId: string;
  delayDays: number;
  action: 'email' | 'sms' | 'retry_payment' | 'suspend_service' | 'cancel_subscription';
  template?: string;
  conditions?: {
    minFailureCount?: number;
    maxFailureCount?: number;
    customerTier?: string[];
  };
}

/**
 * Dispute resolution workflow
 */
export interface DisputeWorkflow {
  workflowId: string;
  disputeId: string;
  currentStep: string;
  steps: DisputeWorkflowStep[];
  assignedTo?: string;
  dueDate: number;
  status: 'pending' | 'in_progress' | 'evidence_submitted' | 'resolved' | 'lost';
  createdAt: number;
  updatedAt: number;
}

/**
 * Dispute workflow step
 */
export interface DisputeWorkflowStep {
  stepId: string;
  name: string;
  description: string;
  dueDate: number;
  completed: boolean;
  completedAt?: number;
  completedBy?: string;
  evidence?: DisputeEvidence[];
  notes?: string;
}

/**
 * Payment failure and dispute handler
 */
export class PaymentFailureHandler {
  private paymentProcessor: PaymentProcessor;
  private retryConfig: RetryConfig;
  private dunningCampaigns: Map<string, DunningCampaign>;

  constructor(paymentProcessor: PaymentProcessor) {
    this.paymentProcessor = paymentProcessor;
    this.retryConfig = {
      maxAttempts: 3,
      baseDelayMs: 24 * 60 * 60 * 1000, // 24 hours
      maxDelayMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      backoffMultiplier: 2,
      gracePeriodDays: 7,
    };
    this.dunningCampaigns = new Map();
    this.initializeDunningCampaigns();
  }

  /**
   * Initialize dunning campaigns
   */
  private initializeDunningCampaigns(): void {
    const campaigns: DunningCampaign[] = [
      {
        campaignId: 'standard_dunning',
        name: 'Standard Dunning Campaign',
        triggers: {
          failureReasons: [
            PaymentFailureReason.INSUFFICIENT_FUNDS,
            PaymentFailureReason.CARD_DECLINED,
            PaymentFailureReason.EXPIRED_CARD
          ],
          subscriptionTypes: ['premium_individual', 'premium_dealer'],
          customerSegments: ['standard', 'premium']
        },
        steps: [
          {
            stepId: 'immediate_email',
            delayDays: 0,
            action: 'email',
            template: 'payment_failed_immediate',
          },
          {
            stepId: 'retry_payment_1',
            delayDays: 1,
            action: 'retry_payment',
          },
          {
            stepId: 'reminder_email_1',
            delayDays: 2,
            action: 'email',
            template: 'payment_failed_reminder_1',
          },
          {
            stepId: 'retry_payment_2',
            delayDays: 3,
            action: 'retry_payment',
          },
          {
            stepId: 'final_notice',
            delayDays: 5,
            action: 'email',
            template: 'payment_failed_final_notice',
          },
          {
            stepId: 'retry_payment_3',
            delayDays: 6,
            action: 'retry_payment',
          },
          {
            stepId: 'suspend_service',
            delayDays: 7,
            action: 'suspend_service',
          },
        ],
        active: true,
      },
      {
        campaignId: 'fraud_dunning',
        name: 'Fraud Suspected Dunning',
        triggers: {
          failureReasons: [PaymentFailureReason.FRAUD_SUSPECTED],
          subscriptionTypes: ['premium_individual', 'premium_dealer'],
          customerSegments: ['standard', 'premium']
        },
        steps: [
          {
            stepId: 'fraud_alert_email',
            delayDays: 0,
            action: 'email',
            template: 'fraud_alert',
          },
          {
            stepId: 'suspend_immediate',
            delayDays: 0,
            action: 'suspend_service',
          },
        ],
        active: true,
      },
    ];

    campaigns.forEach(campaign => {
      this.dunningCampaigns.set(campaign.campaignId, campaign);
    });
  }

  /**
   * Handles a payment failure
   */
  async handlePaymentFailure(
    transactionId: string,
    billingAccountId: string,
    reason: PaymentFailureReason,
    reasonDetails?: string
  ): Promise<PaymentFailure> {
    try {
      const billingAccount = await db.getBillingAccount(billingAccountId);
      if (!billingAccount) {
        throw new Error('Billing account not found');
      }

      // Create payment failure record
      const paymentFailure: PaymentFailure = {
        failureId: generateId(),
        transactionId,
        subscriptionId: billingAccount.subscriptionId,
        billingAccountId,
        userId: billingAccount.userId,
        amount: billingAccount.amount,
        currency: billingAccount.currency,
        reason,
        reasonDetails,
        attemptNumber: 1,
        maxAttempts: this.retryConfig.maxAttempts,
        nextRetryAt: Date.now() + this.retryConfig.baseDelayMs,
        gracePeriodEnds: Date.now() + (this.retryConfig.gracePeriodDays * 24 * 60 * 60 * 1000),
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Save payment failure record
      await db.createPaymentFailure(paymentFailure);

      // Update billing account status
      await db.updateBillingAccount(billingAccountId, {
        status: 'past_due',
        updatedAt: Date.now(),
      });

      // Start dunning campaign
      await this.startDunningCampaign(paymentFailure);

      // Schedule retry attempt
      await this.scheduleRetryAttempt(paymentFailure);

      return paymentFailure;
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Processes payment retry attempts
   */
  async processRetryAttempts(): Promise<void> {
    try {
      // Get payment failures due for retry
      const failuresDueForRetry = await db.getPaymentFailuresDueForRetry(Date.now());

      for (const failure of failuresDueForRetry) {
        try {
          await this.attemptPaymentRetry(failure);
        } catch (error) {
          console.error(`Error retrying payment for failure ${failure.failureId}:`, error);
          // Continue processing other failures
        }
      }
    } catch (error) {
      console.error('Error processing retry attempts:', error);
      throw error;
    }
  }

  /**
   * Attempts to retry a failed payment
   */
  private async attemptPaymentRetry(failure: PaymentFailure): Promise<void> {
    try {
      const billingAccount = await db.getBillingAccount(failure.billingAccountId);
      if (!billingAccount) {
        throw new Error('Billing account not found');
      }

      // Attempt payment retry
      const paymentResult = await this.paymentProcessor.processPayment(
        failure.amount,
        failure.currency,
        billingAccount.paymentMethodId!,
        {
          retryAttempt: failure.attemptNumber.toString(),
          originalFailureId: failure.failureId,
          subscriptionId: failure.subscriptionId || '',
        }
      );

      if (paymentResult.status === 'succeeded' || paymentResult.status === 'completed') {
        // Payment succeeded - resolve failure
        await this.resolvePaymentFailure(failure.failureId, 'retry_success');
        
        // Update billing account status
        await db.updateBillingAccount(failure.billingAccountId, {
          status: 'active',
          updatedAt: Date.now(),
        });

        // Create successful transaction record
        await this.createRetryTransaction(failure, paymentResult.transactionId, 'completed');
      } else {
        // Payment failed again
        await this.handleRetryFailure(failure);
      }
    } catch (error) {
      console.error('Error attempting payment retry:', error);
      await this.handleRetryFailure(failure);
    }
  }

  /**
   * Handles retry failure
   */
  private async handleRetryFailure(failure: PaymentFailure): Promise<void> {
    const nextAttempt = failure.attemptNumber + 1;
    
    if (nextAttempt <= failure.maxAttempts) {
      // Schedule next retry
      const nextRetryDelay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, nextAttempt - 1),
        this.retryConfig.maxDelayMs
      );

      await db.updatePaymentFailure(failure.failureId, {
        attemptNumber: nextAttempt,
        nextRetryAt: Date.now() + nextRetryDelay,
        updatedAt: Date.now(),
      });
    } else {
      // Max attempts reached - suspend service
      await this.suspendService(failure);
    }
  }

  /**
   * Starts dunning campaign for payment failure
   */
  private async startDunningCampaign(failure: PaymentFailure): Promise<void> {
    // Find appropriate dunning campaign
    const campaign = this.findDunningCampaign(failure);
    if (!campaign) {
      console.log(`No dunning campaign found for failure ${failure.failureId}`);
      return;
    }

    // Execute immediate steps (delay = 0)
    const immediateSteps = campaign.steps.filter(step => step.delayDays === 0);
    for (const step of immediateSteps) {
      await this.executeDunningStep(failure, step);
    }

    // Schedule future steps
    const futureSteps = campaign.steps.filter(step => step.delayDays > 0);
    for (const step of futureSteps) {
      await this.scheduleDunningStep(failure, step);
    }
  }

  /**
   * Finds appropriate dunning campaign for failure
   */
  private findDunningCampaign(failure: PaymentFailure): DunningCampaign | undefined {
    for (const campaign of this.dunningCampaigns.values()) {
      if (!campaign.active) continue;

      // Check if failure reason matches
      if (!campaign.triggers.failureReasons.includes(failure.reason)) continue;

      // Additional matching logic would go here
      return campaign;
    }

    return undefined;
  }

  /**
   * Executes a dunning step
   */
  private async executeDunningStep(failure: PaymentFailure, step: DunningStep): Promise<void> {
    try {
      switch (step.action) {
        case 'email':
          await this.sendDunningEmail(failure, step.template!);
          break;
        case 'sms':
          await this.sendDunningSMS(failure, step.template!);
          break;
        case 'suspend_service':
          await this.suspendService(failure);
          break;
        case 'cancel_subscription':
          await this.cancelSubscription(failure);
          break;
        default:
          console.log(`Unknown dunning action: ${step.action}`);
      }
    } catch (error) {
      console.error(`Error executing dunning step ${step.stepId}:`, error);
    }
  }

  /**
   * Schedules a dunning step for future execution
   */
  private async scheduleDunningStep(failure: PaymentFailure, step: DunningStep): Promise<void> {
    const executeAt = failure.createdAt + (step.delayDays * 24 * 60 * 60 * 1000);
    
    // In a real implementation, you'd use a job queue or scheduler
    console.log(`Scheduling dunning step ${step.stepId} for ${new Date(executeAt)}`);
    
    // For now, we'll use setTimeout (not recommended for production)
    setTimeout(async () => {
      const currentFailure = await db.getPaymentFailure(failure.failureId);
      if (currentFailure && !currentFailure.resolved) {
        await this.executeDunningStep(currentFailure, step);
      }
    }, executeAt - Date.now());
  }

  /**
   * Creates a dispute case
   */
  async createDisputeCase(
    transactionId: string,
    disputeType: 'chargeback' | 'inquiry' | 'fraud' | 'authorization' | 'processing_error',
    disputeAmount: number,
    evidenceRequired: string[],
    respondByDate: number
  ): Promise<DisputeCase> {
    try {
      const transaction = await db.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const disputeCase: DisputeCase = {
        disputeId: generateId(),
        caseNumber: `DISP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        transactionId,
        type: 'dispute',
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'disputed',
        userId: transaction.userId,
        userName: transaction.userName,
        userEmail: transaction.userEmail,
        paymentMethod: transaction.paymentMethod,
        processorTransactionId: transaction.processorTransactionId,
        createdAt: transaction.createdAt,
        description: `Dispute for transaction ${transactionId}`,
        fees: transaction.fees,
        netAmount: transaction.netAmount,
        disputeReason: `${disputeType} dispute`,
        disputeDate: new Date().toISOString(),
        disputeStatus: 'open',
        disputeType,
        disputeAmount,
        evidenceRequired,
        evidenceSubmitted: [],
        respondByDate: new Date(respondByDate).toISOString(),
        priority: disputeAmount > 1000 ? 'high' : disputeAmount > 500 ? 'medium' : 'low',
      };

      await db.createDisputeCase(disputeCase);

      // Create dispute workflow
      await this.createDisputeWorkflow(disputeCase);

      return disputeCase;
    } catch (error) {
      console.error('Error creating dispute case:', error);
      throw error;
    }
  }

  /**
   * Creates dispute workflow
   */
  private async createDisputeWorkflow(disputeCase: DisputeCase): Promise<void> {
    const workflow: DisputeWorkflow = {
      workflowId: generateId(),
      disputeId: disputeCase.disputeId,
      currentStep: 'evidence_collection',
      steps: [
        {
          stepId: 'evidence_collection',
          name: 'Collect Evidence',
          description: 'Gather all required evidence for the dispute',
          dueDate: new Date(disputeCase.respondByDate).getTime() - (24 * 60 * 60 * 1000), // 1 day before deadline
          completed: false,
          evidence: [],
        },
        {
          stepId: 'evidence_review',
          name: 'Review Evidence',
          description: 'Review collected evidence for completeness',
          dueDate: new Date(disputeCase.respondByDate).getTime() - (12 * 60 * 60 * 1000), // 12 hours before deadline
          completed: false,
        },
        {
          stepId: 'evidence_submission',
          name: 'Submit Evidence',
          description: 'Submit evidence to payment processor',
          dueDate: new Date(disputeCase.respondByDate).getTime(),
          completed: false,
        },
      ],
      status: 'pending',
      dueDate: new Date(disputeCase.respondByDate).getTime(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.createDisputeWorkflow(workflow);
  }

  /**
   * Submits evidence for dispute
   */
  async submitDisputeEvidence(
    disputeId: string,
    evidence: Omit<DisputeEvidence, 'evidenceId' | 'submittedAt' | 'submittedBy'>
  ): Promise<DisputeEvidence> {
    try {
      const disputeEvidence: DisputeEvidence = {
        evidenceId: generateId(),
        type: evidence.type,
        description: evidence.description,
        fileUrl: evidence.fileUrl,
        submittedAt: new Date().toISOString(),
        submittedBy: 'system', // This would be the actual user ID
      };

      await db.addDisputeEvidence(disputeId, disputeEvidence);

      return disputeEvidence;
    } catch (error) {
      console.error('Error submitting dispute evidence:', error);
      throw error;
    }
  }

  /**
   * Resolves a payment failure
   */
  private async resolvePaymentFailure(
    failureId: string,
    resolutionMethod: 'retry_success' | 'manual_payment' | 'plan_change' | 'cancellation'
  ): Promise<void> {
    await db.updatePaymentFailure(failureId, {
      resolved: true,
      resolvedAt: Date.now(),
      resolutionMethod,
      updatedAt: Date.now(),
    });
  }

  /**
   * Suspends service for payment failure
   */
  private async suspendService(failure: PaymentFailure): Promise<void> {
    // Update billing account
    await db.updateBillingAccount(failure.billingAccountId, {
      status: 'suspended',
      updatedAt: Date.now(),
    });

    // Downgrade user to basic plan
    await db.updateUser(failure.userId, {
      premiumActive: false,
      premiumPlan: undefined,
      premiumExpiresAt: undefined,
      updatedAt: Date.now(),
    });

    // Send suspension notification
    await this.sendServiceSuspensionNotification(failure);
  }

  /**
   * Cancels subscription for payment failure
   */
  private async cancelSubscription(failure: PaymentFailure): Promise<void> {
    if (failure.subscriptionId) {
      await this.paymentProcessor.cancelSubscription(failure.subscriptionId);
    }

    await db.updateBillingAccount(failure.billingAccountId, {
      status: 'canceled',
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    await this.resolvePaymentFailure(failure.failureId, 'cancellation');
  }

  /**
   * Schedules retry attempt
   */
  private async scheduleRetryAttempt(failure: PaymentFailure): Promise<void> {
    // In a real implementation, you'd use a job queue
    console.log(`Scheduling retry attempt for ${new Date(failure.nextRetryAt!)}`);
  }

  /**
   * Creates retry transaction record
   */
  private async createRetryTransaction(
    failure: PaymentFailure,
    processorTransactionId: string,
    status: string
  ): Promise<void> {
    const transaction: Transaction = {
      id: generateId(),
      transactionId: generateId(),
      type: 'payment',
      amount: failure.amount,
      currency: failure.currency,
      status: status === 'completed' ? 'completed' : 'failed',
      userId: failure.userId,
      userName: '', // Would be populated from user data
      userEmail: '', // Would be populated from user data
      paymentMethod: 'card',
      processorTransactionId,
      createdAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      description: `Payment retry attempt ${failure.attemptNumber}`,
      fees: failure.amount * 0.029 + 0.30,
      netAmount: failure.amount - (failure.amount * 0.029 + 0.30),
      metadata: {
        originalFailureId: failure.failureId,
        retryAttempt: failure.attemptNumber.toString(),
      },
      billingAccountId: failure.billingAccountId,
    };

    await db.createTransaction(transaction);
  }

  /**
   * Sends dunning email
   */
  private async sendDunningEmail(failure: PaymentFailure, template: string): Promise<void> {
    // In a real implementation, you'd integrate with email service
    console.log(`Sending dunning email with template ${template} to user ${failure.userId}`);
  }

  /**
   * Sends dunning SMS
   */
  private async sendDunningSMS(failure: PaymentFailure, template: string): Promise<void> {
    // In a real implementation, you'd integrate with SMS service
    console.log(`Sending dunning SMS with template ${template} to user ${failure.userId}`);
  }

  /**
   * Sends service suspension notification
   */
  private async sendServiceSuspensionNotification(failure: PaymentFailure): Promise<void> {
    // In a real implementation, you'd send email/SMS notification
    console.log(`Sending service suspension notification to user ${failure.userId}`);
  }
}