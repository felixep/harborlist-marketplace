/**
 * @fileoverview Stripe payment processor integration for HarborList billing service.
 * 
 * Provides secure payment processing with PCI compliance through Stripe's APIs.
 * Handles customer management, payment methods, subscriptions, and webhooks.
 * 
 * Security Features:
 * - PCI DSS compliant payment processing
 * - Secure API key management
 * - Webhook signature verification
 * - Encrypted payment method storage
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import Stripe from 'stripe';

/**
 * Payment processor interface for abstraction
 */
export interface PaymentProcessor {
  createCustomer(userInfo: { email: string; name: string; metadata?: Record<string, string> }): Promise<{ customerId: string }>;
  createPaymentMethod(customerId: string, paymentData: PaymentMethodData): Promise<{ paymentMethodId: string }>;
  createSubscription(customerId: string, priceId: string, paymentMethodId: string, metadata?: Record<string, string>): Promise<{ subscriptionId: string; status: string }>;
  processPayment(amount: number, currency: string, paymentMethodId: string, metadata?: Record<string, string>): Promise<{ transactionId: string; status: string; clientSecret?: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, updates: SubscriptionUpdateData): Promise<void>;
  processRefund(transactionId: string, amount?: number, reason?: string): Promise<{ refundId: string; status: string }>;
  retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentData>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionData>;
  constructWebhookEvent(payload: string, signature: string): any;
  handleWebhookEvent(event: any): Promise<WebhookHandlerResult>;
}

export interface PaymentMethodData {
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

export interface SubscriptionUpdateData {
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
  trial_end?: number;
  cancel_at_period_end?: boolean;
}

export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionData {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata?: Record<string, string>;
}

export interface WebhookHandlerResult {
  handled: boolean;
  action?: string;
  data?: any;
  error?: string;
}

/**
 * Stripe payment processor implementation
 * Provides secure payment processing with PCI compliance
 */
export class StripePaymentProcessor implements PaymentProcessor {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string, options?: Stripe.StripeConfig) {
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is required');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      typescript: true,
      ...options,
    });
    this.webhookSecret = webhookSecret;
  }

  /**
   * Creates a new customer in Stripe
   */
  async createCustomer(userInfo: { 
    email: string; 
    name: string; 
    metadata?: Record<string, string> 
  }): Promise<{ customerId: string }> {
    try {
      const customer = await this.stripe.customers.create({
        email: userInfo.email,
        name: userInfo.name,
        metadata: {
          source: 'harborlist',
          ...userInfo.metadata,
        },
      });

      return { customerId: customer.id };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a payment method for a customer
   */
  async createPaymentMethod(
    customerId: string, 
    paymentData: PaymentMethodData
  ): Promise<{ paymentMethodId: string }> {
    try {
      // Map our payment method type to Stripe's expected type
      let stripeType: 'card' | 'us_bank_account';
      let stripePaymentMethodData: any = {
        billing_details: paymentData.billing_details,
      };

      switch (paymentData.type) {
        case 'card':
          stripeType = 'card';
          stripePaymentMethodData.card = paymentData.card;
          break;
        case 'bank_account':
          stripeType = 'us_bank_account';
          // For bank accounts, we'd need to handle ACH setup differently
          throw new Error('Bank account payment methods require additional setup');
        case 'paypal':
          // PayPal is not directly supported by Stripe
          throw new Error('PayPal payment methods should use PayPal processor');
        default:
          throw new Error(`Unsupported payment method type: ${paymentData.type}`);
      }

      // Create payment method
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: stripeType,
        ...stripePaymentMethodData,
      });

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });

      return { paymentMethodId: paymentMethod.id };
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw new Error(`Failed to create payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a subscription for premium membership
   */
  async createSubscription(
    customerId: string, 
    priceId: string, 
    paymentMethodId: string,
    metadata?: Record<string, string>
  ): Promise<{ subscriptionId: string; status: string }> {
    try {
      // Set the payment method as default for the customer
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          source: 'harborlist',
          ...metadata,
        },
      });

      return { 
        subscriptionId: subscription.id, 
        status: subscription.status 
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes a one-time payment
   */
  async processPayment(
    amount: number, 
    currency: string, 
    paymentMethodId: string,
    metadata?: Record<string, string>
  ): Promise<{ transactionId: string; status: string; clientSecret?: string }> {
    try {
      // Convert amount to cents (Stripe expects amounts in smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        return_url: process.env.STRIPE_RETURN_URL || 'https://harborlist.com/payment/return',
        metadata: {
          source: 'harborlist',
          ...metadata,
        },
      });

      return {
        transactionId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancels a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing subscription
   */
  async updateSubscription(
    subscriptionId: string, 
    updates: SubscriptionUpdateData
  ): Promise<void> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {};

      if (updates.priceId) {
        // Get current subscription to update items
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: updates.priceId,
          quantity: updates.quantity || 1,
        }];
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      if (updates.trial_end) {
        updateData.trial_end = updates.trial_end;
      }

      if (updates.cancel_at_period_end !== undefined) {
        updateData.cancel_at_period_end = updates.cancel_at_period_end;
      }

      await this.stripe.subscriptions.update(subscriptionId, updateData);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes a refund for a payment
   */
  async processRefund(
    transactionId: string, 
    amount?: number, 
    reason?: string
  ): Promise<{ refundId: string; status: string }> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: transactionId,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      };

      if (amount) {
        // Convert amount to cents
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        refundId: refund.id,
        status: refund.status || 'pending',
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves payment intent details
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentData> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret || undefined,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves subscription details
   */
  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionData> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: subscription.metadata,
      };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new Error(`Failed to retrieve subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Constructs webhook event from Stripe payload
   */
  constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw new Error(`Invalid webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handles Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
    try {
      console.log(`Handling Stripe webhook event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        
        case 'charge.dispute.created':
          return await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
          return { handled: false };
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return { 
        handled: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handles successful payment events
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'payment_succeeded',
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        metadata: paymentIntent.metadata,
      },
    };
  }

  /**
   * Handles failed payment events
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'payment_failed',
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        lastPaymentError: paymentIntent.last_payment_error,
        metadata: paymentIntent.metadata,
      },
    };
  }

  /**
   * Handles successful invoice payment events
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'invoice_payment_succeeded',
      data: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      },
    };
  }

  /**
   * Handles failed invoice payment events
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'invoice_payment_failed',
      data: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
    };
  }

  /**
   * Handles subscription creation events
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'subscription_created',
      data: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        metadata: subscription.metadata,
      },
    };
  }

  /**
   * Handles subscription update events
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'subscription_updated',
      data: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: subscription.metadata,
      },
    };
  }

  /**
   * Handles subscription deletion events
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'subscription_deleted',
      data: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        canceledAt: subscription.canceled_at,
        metadata: subscription.metadata,
      },
    };
  }

  /**
   * Handles dispute creation events
   */
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<WebhookHandlerResult> {
    return {
      handled: true,
      action: 'dispute_created',
      data: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        evidenceDueBy: dispute.evidence_details?.due_by,
      },
    };
  }
}

/**
 * Factory function to create Stripe payment processor
 */
export function createStripeProcessor(
  apiKey?: string, 
  webhookSecret?: string,
  options?: Stripe.StripeConfig
): StripePaymentProcessor {
  const stripeApiKey = apiKey || process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeApiKey) {
    throw new Error('Stripe API key not found. Set STRIPE_SECRET_KEY environment variable.');
  }

  if (!stripeWebhookSecret) {
    throw new Error('Stripe webhook secret not found. Set STRIPE_WEBHOOK_SECRET environment variable.');
  }

  return new StripePaymentProcessor(stripeApiKey, stripeWebhookSecret, options);
}