/**
 * @fileoverview Webhook handler for payment processor events in HarborList billing system.
 * 
 * Handles webhook events from payment processors (Stripe, PayPal) including:
 * - Payment success and failure events
 * - Subscription lifecycle events
 * - Dispute and chargeback notifications
 * - Invoice payment events
 * 
 * Security Features:
 * - Webhook signature verification
 * - Idempotency handling
 * - Event deduplication
 * - Secure event processing
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PaymentProcessor } from './payment-processors/stripe';
import { PaymentFailureHandler, PaymentFailureReason } from './payment-failure-handler';
import { SubscriptionManager } from './subscription-manager';
import { db } from '../shared/database';
import { createResponse, createErrorResponse } from '../shared/utils';
import { Transaction, BillingAccount } from '@harborlist/shared-types';

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PROCESSING = 'payment.processing',
  
  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_DELETED = 'subscription.deleted',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  
  // Invoice events
  INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_FINALIZED = 'invoice.finalized',
  
  // Dispute events
  DISPUTE_CREATED = 'dispute.created',
  DISPUTE_UPDATED = 'dispute.updated',
  DISPUTE_CLOSED = 'dispute.closed',
  
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
}

/**
 * Processed webhook event record
 */
export interface ProcessedWebhookEvent {
  eventId: string;
  processorType: 'stripe' | 'paypal';
  eventType: string;
  processed: boolean;
  processedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

/**
 * Webhook handler class
 */
export class WebhookHandler {
  private paymentProcessor: PaymentProcessor;
  private paymentFailureHandler: PaymentFailureHandler;
  private subscriptionManager: SubscriptionManager;
  private processedEvents: Map<string, ProcessedWebhookEvent>;

  constructor(
    paymentProcessor: PaymentProcessor,
    paymentFailureHandler: PaymentFailureHandler,
    subscriptionManager: SubscriptionManager
  ) {
    this.paymentProcessor = paymentProcessor;
    this.paymentFailureHandler = paymentFailureHandler;
    this.subscriptionManager = subscriptionManager;
    this.processedEvents = new Map();
  }

  /**
   * Handles incoming webhook events
   */
  async handleWebhook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const requestId = event.requestContext.requestId;

    try {
      // Get webhook payload and signature
      const payload = event.body || '';
      const signature = event.headers['stripe-signature'] || event.headers['paypal-auth-algo'] || '';
      
      if (!payload || !signature) {
        return createErrorResponse(400, 'INVALID_WEBHOOK', 'Missing payload or signature', requestId);
      }

      // Determine processor type from headers or path
      const processorType = this.determineProcessorType(event);
      
      // Construct and verify webhook event
      const webhookEvent = await this.constructWebhookEvent(payload, signature, processorType);
      
      // Check for duplicate events
      if (await this.isDuplicateEvent(webhookEvent.id, processorType)) {
        console.log(`Duplicate webhook event ${webhookEvent.id}, skipping`);
        return createResponse(200, { received: true, duplicate: true });
      }

      // Process the webhook event
      const result = await this.processWebhookEvent(webhookEvent, processorType);
      
      // Record processed event
      await this.recordProcessedEvent(webhookEvent.id, processorType, webhookEvent.type, true);

      return createResponse(200, { 
        received: true, 
        processed: result.handled,
        action: result.action 
      });
    } catch (error) {
      console.error('Error handling webhook:', error);
      
      // Record failed event processing
      try {
        const eventId = this.extractEventId(event.body || '');
        const processorType = this.determineProcessorType(event);
        await this.recordProcessedEvent(eventId, processorType, 'unknown', false, error instanceof Error ? error.message : 'Unknown error');
      } catch (recordError) {
        console.error('Error recording failed webhook event:', recordError);
      }

      if (error instanceof Error && error.message.includes('Invalid webhook signature')) {
        return createErrorResponse(401, 'INVALID_SIGNATURE', 'Invalid webhook signature', requestId);
      }

      return createErrorResponse(500, 'WEBHOOK_ERROR', 'Failed to process webhook', requestId);
    }
  }

  /**
   * Constructs webhook event from payload and signature
   */
  private async constructWebhookEvent(payload: string, signature: string, processorType: 'stripe' | 'paypal'): Promise<any> {
    try {
      return this.paymentProcessor.constructWebhookEvent(payload, signature);
    } catch (error) {
      console.error(`Error constructing ${processorType} webhook event:`, error);
      throw error;
    }
  }

  /**
   * Processes webhook event based on type
   */
  private async processWebhookEvent(webhookEvent: any, processorType: 'stripe' | 'paypal'): Promise<any> {
    try {
      // Use payment processor's webhook handler
      const result = await this.paymentProcessor.handleWebhookEvent(webhookEvent);
      
      if (result.handled) {
        // Process the event data based on action
        await this.handleWebhookAction(result.action, result.data, processorType);
      }

      return result;
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Handles specific webhook actions
   */
  private async handleWebhookAction(action: string, data: any, processorType: 'stripe' | 'paypal'): Promise<void> {
    try {
      switch (action) {
        case 'payment_succeeded':
          await this.handlePaymentSucceeded(data);
          break;
        
        case 'payment_failed':
          await this.handlePaymentFailed(data);
          break;
        
        case 'invoice_payment_succeeded':
          await this.handleInvoicePaymentSucceeded(data);
          break;
        
        case 'invoice_payment_failed':
          await this.handleInvoicePaymentFailed(data);
          break;
        
        case 'subscription_created':
          await this.handleSubscriptionCreated(data);
          break;
        
        case 'subscription_updated':
          await this.handleSubscriptionUpdated(data);
          break;
        
        case 'subscription_deleted':
          await this.handleSubscriptionDeleted(data);
          break;
        
        case 'dispute_created':
          await this.handleDisputeCreated(data);
          break;
        
        default:
          console.log(`Unhandled webhook action: ${action}`);
      }
    } catch (error) {
      console.error(`Error handling webhook action ${action}:`, error);
      throw error;
    }
  }

  /**
   * Handles payment succeeded events
   */
  private async handlePaymentSucceeded(data: any): Promise<void> {
    try {
      // Update transaction status
      const transaction = await db.getTransactionByProcessorId(data.paymentIntentId);
      if (transaction) {
        await db.updateTransaction(transaction.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });

        // If this was a retry payment, resolve the failure
        if (data.metadata?.originalFailureId) {
          await this.paymentFailureHandler.resolvePaymentFailure(
            data.metadata.originalFailureId,
            'retry_success'
          );
        }
      }

      // Update billing account if needed
      if (data.customerId) {
        const billingAccount = await db.getBillingAccountByCustomerId(data.customerId);
        if (billingAccount && billingAccount.status === 'past_due') {
          await db.updateBillingAccount(billingAccount.billingId, {
            status: 'active',
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handles payment failed events
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    try {
      // Update transaction status
      const transaction = await db.getTransactionByProcessorId(data.paymentIntentId);
      if (transaction) {
        await db.updateTransaction(transaction.id, {
          status: 'failed',
        });

        // Determine failure reason
        const failureReason = this.mapPaymentFailureReason(data.lastPaymentError);

        // Handle payment failure
        if (transaction.billingAccountId) {
          await this.paymentFailureHandler.handlePaymentFailure(
            transaction.transactionId,
            transaction.billingAccountId,
            failureReason,
            data.lastPaymentError?.message
          );
        }
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  /**
   * Handles invoice payment succeeded events
   */
  private async handleInvoicePaymentSucceeded(data: any): Promise<void> {
    try {
      if (data.subscriptionId) {
        const billingAccount = await db.getBillingAccountBySubscription(data.subscriptionId);
        if (billingAccount) {
          // Update next billing date
          const nextBillingDate = this.calculateNextBillingDate(
            billingAccount.plan,
            data.periodEnd * 1000
          );

          await db.updateBillingAccount(billingAccount.billingId, {
            status: 'active',
            nextBillingDate,
            updatedAt: Date.now(),
          });

          // Extend user premium membership
          await db.updateUser(billingAccount.userId, {
            premiumExpiresAt: nextBillingDate,
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handles invoice payment failed events
   */
  private async handleInvoicePaymentFailed(data: any): Promise<void> {
    try {
      if (data.subscriptionId) {
        const billingAccount = await db.getBillingAccountBySubscription(data.subscriptionId);
        if (billingAccount) {
          // Handle subscription payment failure
          await this.paymentFailureHandler.handlePaymentFailure(
            `invoice_${data.invoiceId}`,
            billingAccount.billingId,
            PaymentFailureReason.INSUFFICIENT_FUNDS, // Default reason
            'Invoice payment failed'
          );
        }
      }
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
      throw error;
    }
  }

  /**
   * Handles subscription created events
   */
  private async handleSubscriptionCreated(data: any): Promise<void> {
    try {
      // Update billing account with subscription details
      if (data.customerId) {
        const billingAccount = await db.getBillingAccountByCustomerId(data.customerId);
        if (billingAccount) {
          await db.updateBillingAccount(billingAccount.billingId, {
            subscriptionId: data.subscriptionId,
            status: data.status === 'active' ? 'active' : 'trialing',
            nextBillingDate: data.currentPeriodEnd * 1000,
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handles subscription updated events
   */
  private async handleSubscriptionUpdated(data: any): Promise<void> {
    try {
      const billingAccount = await db.getBillingAccountBySubscription(data.subscriptionId);
      if (billingAccount) {
        const updates: Partial<BillingAccount> = {
          status: this.mapSubscriptionStatus(data.status),
          nextBillingDate: data.currentPeriodEnd * 1000,
          updatedAt: Date.now(),
        };

        if (data.cancelAtPeriodEnd) {
          updates.canceledAt = Date.now();
        }

        await db.updateBillingAccount(billingAccount.billingId, updates);
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handles subscription deleted events
   */
  private async handleSubscriptionDeleted(data: any): Promise<void> {
    try {
      const billingAccount = await db.getBillingAccountBySubscription(data.subscriptionId);
      if (billingAccount) {
        await db.updateBillingAccount(billingAccount.billingId, {
          status: 'canceled',
          canceledAt: data.canceledAt ? data.canceledAt * 1000 : Date.now(),
          updatedAt: Date.now(),
        });

        // Downgrade user to basic plan
        await db.updateUser(billingAccount.userId, {
          premiumActive: false,
          premiumPlan: undefined,
          premiumExpiresAt: undefined,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handles dispute created events
   */
  private async handleDisputeCreated(data: any): Promise<void> {
    try {
      // Create dispute case
      await this.paymentFailureHandler.createDisputeCase(
        data.chargeId,
        this.mapDisputeType(data.reason),
        data.amount,
        ['receipt', 'communication', 'shipping'], // Default evidence types
        data.evidenceDueBy * 1000
      );
    } catch (error) {
      console.error('Error handling dispute created:', error);
      throw error;
    }
  }

  /**
   * Determines processor type from event
   */
  private determineProcessorType(event: APIGatewayProxyEvent): 'stripe' | 'paypal' {
    const path = event.path || '';
    const headers = event.headers || {};

    if (path.includes('/stripe') || headers['stripe-signature']) {
      return 'stripe';
    }
    
    if (path.includes('/paypal') || headers['paypal-auth-algo']) {
      return 'paypal';
    }

    // Default to configured processor
    return (process.env.PAYMENT_PROCESSOR || 'stripe') as 'stripe' | 'paypal';
  }

  /**
   * Checks if event is duplicate
   */
  private async isDuplicateEvent(eventId: string, processorType: 'stripe' | 'paypal'): Promise<boolean> {
    const key = `${processorType}_${eventId}`;
    
    // Check in-memory cache first
    if (this.processedEvents.has(key)) {
      return true;
    }

    // Check database
    const processedEvent = await db.getProcessedWebhookEvent(eventId, processorType);
    if (processedEvent) {
      // Cache in memory
      this.processedEvents.set(key, processedEvent);
      return true;
    }

    return false;
  }

  /**
   * Records processed event
   */
  private async recordProcessedEvent(
    eventId: string,
    processorType: 'stripe' | 'paypal',
    eventType: string,
    processed: boolean,
    error?: string
  ): Promise<void> {
    const processedEvent: ProcessedWebhookEvent = {
      eventId,
      processorType,
      eventType,
      processed,
      processedAt: processed ? Date.now() : undefined,
      error,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    await db.createProcessedWebhookEvent(processedEvent);
    
    // Cache in memory
    const key = `${processorType}_${eventId}`;
    this.processedEvents.set(key, processedEvent);
  }

  /**
   * Extracts event ID from payload
   */
  private extractEventId(payload: string): string {
    try {
      const parsed = JSON.parse(payload);
      return parsed.id || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Maps payment failure reason from processor error
   */
  private mapPaymentFailureReason(error: any): PaymentFailureReason {
    if (!error) return PaymentFailureReason.UNKNOWN;

    const code = error.code || error.decline_code || '';
    
    switch (code.toLowerCase()) {
      case 'insufficient_funds':
      case 'insufficient_balance':
        return PaymentFailureReason.INSUFFICIENT_FUNDS;
      case 'card_declined':
      case 'generic_decline':
        return PaymentFailureReason.CARD_DECLINED;
      case 'expired_card':
        return PaymentFailureReason.EXPIRED_CARD;
      case 'invalid_card':
      case 'invalid_number':
        return PaymentFailureReason.INVALID_CARD;
      case 'fraudulent':
      case 'suspected_fraud':
        return PaymentFailureReason.FRAUD_SUSPECTED;
      case 'authentication_required':
        return PaymentFailureReason.AUTHENTICATION_REQUIRED;
      default:
        return PaymentFailureReason.UNKNOWN;
    }
  }

  /**
   * Maps subscription status from processor
   */
  private mapSubscriptionStatus(status: string): 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'cancelled':
        return 'canceled';
      case 'trialing':
        return 'trialing';
      default:
        return 'suspended';
    }
  }

  /**
   * Maps dispute type from processor
   */
  private mapDisputeType(reason: string): 'chargeback' | 'inquiry' | 'fraud' | 'authorization' | 'processing_error' {
    switch (reason.toLowerCase()) {
      case 'fraudulent':
        return 'fraud';
      case 'subscription_canceled':
      case 'product_unacceptable':
      case 'product_not_received':
        return 'chargeback';
      case 'duplicate':
      case 'credit_not_processed':
        return 'processing_error';
      case 'authorization':
        return 'authorization';
      default:
        return 'inquiry';
    }
  }

  /**
   * Calculates next billing date based on plan
   */
  private calculateNextBillingDate(plan: string, currentPeriodEnd: number): number {
    // This would be more sophisticated in a real implementation
    const isYearly = plan.includes('yearly');
    const date = new Date(currentPeriodEnd);
    
    if (isYearly) {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    return date.getTime();
  }
}