/**
 * @fileoverview Subscription management service for HarborList billing system.
 * 
 * Handles subscription lifecycle management including:
 * - Subscription creation, updates, and cancellation
 * - Billing cycle processing and automatic renewals
 * - Prorated billing for plan changes and upgrades
 * - Subscription status tracking and notifications
 * 
 * Business Rules:
 * - Monthly and yearly billing cycles supported
 * - Prorated billing for mid-cycle plan changes
 * - Grace period for failed payments
 * - Automatic downgrade for expired subscriptions
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { db } from '../shared/database';
import { PaymentProcessor } from './payment-processors/stripe';
import { BillingAccount, Transaction, EnhancedUser } from '@harborlist/shared-types';
import { generateId } from '../shared/utils';

/**
 * Subscription plan configuration
 */
export interface SubscriptionPlan {
  planId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  features: string[];
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  stripePriceIds?: {
    monthly: string;
    yearly: string;
  };
  paypalPlanIds?: {
    monthly: string;
    yearly: string;
  };
  trialDays?: number;
  active: boolean;
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Subscription update request
 */
export interface UpdateSubscriptionRequest {
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

/**
 * Billing cycle information
 */
export interface BillingCycle {
  subscriptionId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  nextBillingDate: number;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
}

/**
 * Prorated billing calculation
 */
export interface ProratedBilling {
  currentPlanAmount: number;
  newPlanAmount: number;
  proratedAmount: number;
  refundAmount: number;
  upgradeAmount: number;
  daysRemaining: number;
  effectiveDate: number;
}

/**
 * Subscription manager class
 */
export class SubscriptionManager {
  private paymentProcessor: PaymentProcessor;
  private subscriptionPlans: Map<string, SubscriptionPlan>;

  constructor(paymentProcessor: PaymentProcessor) {
    this.paymentProcessor = paymentProcessor;
    this.subscriptionPlans = new Map();
    this.initializeSubscriptionPlans();
  }

  /**
   * Initialize subscription plans configuration
   */
  private initializeSubscriptionPlans(): void {
    const plans: SubscriptionPlan[] = [
      {
        planId: 'basic',
        name: 'Basic',
        type: 'individual',
        isPremium: false,
        features: ['basic_listing_creation', 'standard_search', 'basic_support'],
        pricing: { monthly: 0, yearly: 0, currency: 'USD' },
        active: true,
      },
      {
        planId: 'premium_individual',
        name: 'Premium Individual',
        type: 'individual',
        isPremium: true,
        features: [
          'unlimited_listings',
          'priority_placement',
          'advanced_analytics',
          'premium_support',
          'featured_listings',
          'enhanced_photos'
        ],
        pricing: { monthly: 29.99, yearly: 299.99, currency: 'USD' },
        stripePriceIds: {
          monthly: process.env.STRIPE_PREMIUM_INDIVIDUAL_MONTHLY_PRICE_ID || 'price_premium_individual_monthly',
          yearly: process.env.STRIPE_PREMIUM_INDIVIDUAL_YEARLY_PRICE_ID || 'price_premium_individual_yearly',
        },
        paypalPlanIds: {
          monthly: process.env.PAYPAL_PREMIUM_INDIVIDUAL_MONTHLY_PLAN_ID || 'plan_premium_individual_monthly',
          yearly: process.env.PAYPAL_PREMIUM_INDIVIDUAL_YEARLY_PLAN_ID || 'plan_premium_individual_yearly',
        },
        trialDays: 14,
        active: true,
      },
      {
        planId: 'premium_dealer',
        name: 'Premium Dealer',
        type: 'dealer',
        isPremium: true,
        features: [
          'unlimited_listings',
          'priority_placement',
          'advanced_analytics',
          'premium_support',
          'featured_listings',
          'enhanced_photos',
          'bulk_operations',
          'dealer_badge',
          'inventory_management',
          'lead_management',
          'custom_branding'
        ],
        pricing: { monthly: 99.99, yearly: 999.99, currency: 'USD' },
        stripePriceIds: {
          monthly: process.env.STRIPE_PREMIUM_DEALER_MONTHLY_PRICE_ID || 'price_premium_dealer_monthly',
          yearly: process.env.STRIPE_PREMIUM_DEALER_YEARLY_PRICE_ID || 'price_premium_dealer_yearly',
        },
        paypalPlanIds: {
          monthly: process.env.PAYPAL_PREMIUM_DEALER_MONTHLY_PLAN_ID || 'plan_premium_dealer_monthly',
          yearly: process.env.PAYPAL_PREMIUM_DEALER_YEARLY_PLAN_ID || 'plan_premium_dealer_yearly',
        },
        trialDays: 14,
        active: true,
      },
    ];

    plans.forEach(plan => {
      this.subscriptionPlans.set(plan.planId, plan);
    });
  }

  /**
   * Creates a new subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<{
    subscriptionId: string;
    status: string;
    trialEnd?: number;
    nextBillingDate: number;
  }> {
    try {
      // Get subscription plan
      const plan = this.subscriptionPlans.get(request.planId);
      if (!plan) {
        throw new Error(`Subscription plan not found: ${request.planId}`);
      }

      // Get user and billing account
      const user = await db.getUser(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const billingAccount = await db.getBillingAccountByUser(request.userId);
      if (!billingAccount) {
        throw new Error('Billing account not found');
      }

      // Calculate pricing
      const amount = request.billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
      
      // Get processor-specific price ID
      const processorType = process.env.PAYMENT_PROCESSOR || 'stripe';
      let priceId: string;
      
      if (processorType === 'stripe') {
        priceId = request.billingCycle === 'yearly' 
          ? plan.stripePriceIds?.yearly || `price_${request.planId}_yearly`
          : plan.stripePriceIds?.monthly || `price_${request.planId}_monthly`;
      } else {
        priceId = request.billingCycle === 'yearly'
          ? plan.paypalPlanIds?.yearly || `plan_${request.planId}_yearly`
          : plan.paypalPlanIds?.monthly || `plan_${request.planId}_monthly`;
      }

      // Create subscription with payment processor
      const subscriptionResult = await this.paymentProcessor.createSubscription(
        billingAccount.customerId!,
        priceId,
        billingAccount.paymentMethodId!,
        {
          userId: request.userId,
          planId: request.planId,
          billingCycle: request.billingCycle,
          ...request.metadata,
        }
      );

      // Calculate billing dates
      const now = Date.now();
      const trialEnd = request.trialDays ? now + (request.trialDays * 24 * 60 * 60 * 1000) : undefined;
      const nextBillingDate = trialEnd || this.calculateNextBillingDate(request.billingCycle, now);

      // Update billing account
      await db.updateBillingAccount(billingAccount.billingId, {
        subscriptionId: subscriptionResult.subscriptionId,
        plan: request.planId,
        amount,
        currency: plan.pricing.currency,
        status: subscriptionResult.status === 'active' ? 'active' : 'trialing',
        nextBillingDate,
        trialEndsAt: trialEnd,
        updatedAt: Date.now(),
      });

      // Update user with premium membership
      const enhancedUser: Partial<EnhancedUser> = {
        userType: plan.type === 'dealer' ? 'premium_dealer' : 'premium_individual',
        premiumActive: true,
        premiumPlan: request.planId,
        premiumExpiresAt: nextBillingDate,
        membershipDetails: {
          plan: request.planId,
          features: plan.features,
          limits: this.getPlanLimits(plan),
          expiresAt: nextBillingDate,
          autoRenew: true,
          billingCycle: request.billingCycle,
        },
        updatedAt: new Date().toISOString(),
      };

      await db.updateUser(request.userId, enhancedUser);

      return {
        subscriptionId: String(subscriptionResult.subscriptionId),
        status: String(subscriptionResult.status),
        trialEnd,
        nextBillingDate,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Updates an existing subscription
   */
  async updateSubscription(
    subscriptionId: string, 
    request: UpdateSubscriptionRequest
  ): Promise<void> {
    try {
      // TODO: Implement getBillingAccountBySubscription or find alternative approach
      // For now, we'll need to pass userId to this function or implement the missing method
      throw new Error('updateSubscription functionality temporarily disabled - missing getBillingAccountBySubscription method');
      
      /* Commented out until getBillingAccountBySubscription is implemented
      // Get current billing account
      const billingAccount = await db.getBillingAccountBySubscription(subscriptionId);
      if (!billingAccount) {
        throw new Error('Billing account not found for subscription');
      }

      // Handle plan change with prorated billing
      if (request.planId && request.planId !== billingAccount.plan) {
        await this.handlePlanChange(billingAccount, request.planId, request.billingCycle);
      }

      // Update subscription with payment processor
      const updates: any = {};
      
      if (request.planId) {
        const plan = this.subscriptionPlans.get(request.planId);
        if (plan) {
          const processorType = process.env.PAYMENT_PROCESSOR || 'stripe';
          const billingCycle = request.billingCycle || 'monthly';
          
          if (processorType === 'stripe') {
            updates.priceId = billingCycle === 'yearly' 
              ? plan.stripePriceIds?.yearly 
              : plan.stripePriceIds?.monthly;
          } else {
            updates.priceId = billingCycle === 'yearly'
              ? plan.paypalPlanIds?.yearly
              : plan.paypalPlanIds?.monthly;
          }
        }
      }

      if (request.cancelAtPeriodEnd !== undefined) {
        updates.cancel_at_period_end = request.cancelAtPeriodEnd;
      }

      if (request.metadata) {
        updates.metadata = request.metadata;
      }

      await this.paymentProcessor.updateSubscription(subscriptionId, updates);

      // Update billing account
      const billingUpdates: Partial<BillingAccount> = {
        updatedAt: Date.now(),
      };

      if (request.planId) {
        const plan = this.subscriptionPlans.get(request.planId);
        if (plan) {
          const billingCycle = request.billingCycle || 'monthly';
          billingUpdates.plan = request.planId;
          billingUpdates.amount = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
        }
      }

      if (request.cancelAtPeriodEnd !== undefined && request.cancelAtPeriodEnd) {
        billingUpdates.status = 'canceled';
        billingUpdates.canceledAt = Date.now();
      }

      await db.updateBillingAccount(billingAccount.billingId, billingUpdates);
      */ // End of commented out code
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancels a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    try {
      // TODO: Implement getBillingAccountBySubscription or find alternative approach
      // For now, we'll need to pass userId to this function or implement the missing method
      throw new Error('cancelSubscription functionality temporarily disabled - missing getBillingAccountBySubscription method');
      
      /* Commented out until getBillingAccountBySubscription is implemented
      const billingAccount = await db.getBillingAccountBySubscription(subscriptionId);
      if (!billingAccount) {
        throw new Error('Billing account not found for subscription');
      }

      if (immediate) {
        // Cancel immediately
        await this.paymentProcessor.cancelSubscription(subscriptionId);
        
        // Update billing account
        await db.updateBillingAccount(billingAccount.billingId, {
          status: 'canceled',
          canceledAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Downgrade user immediately
        await this.downgradeUser(billingAccount.userId);
      } else {
        // Cancel at period end
        await this.paymentProcessor.updateSubscription(subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update billing account
        await db.updateBillingAccount(billingAccount.billingId, {
          status: 'canceled',
          canceledAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      */ // End of commented out code
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Processes automatic renewals for subscriptions
   */
  async processAutomaticRenewals(): Promise<void> {
    try {
      // Get subscriptions due for renewal (next billing date is within next hour)
      const dueDate = Date.now() + (60 * 60 * 1000); // 1 hour from now
      // TODO: Implement getSubscriptionsDueForRenewal method in DatabaseService
      const subscriptionsDue: any[] = []; // Temporarily return empty array

      for (const billingAccount of subscriptionsDue) {
        try {
          await this.processSubscriptionRenewal(billingAccount);
        } catch (error) {
          console.error(`Error processing renewal for subscription ${billingAccount.subscriptionId}:`, error);
          // Continue processing other subscriptions
        }
      }
    } catch (error) {
      console.error('Error processing automatic renewals:', error);
      throw error;
    }
  }

  /**
   * Handles plan changes with prorated billing
   */
  private async handlePlanChange(
    billingAccount: BillingAccount,
    newPlanId: string,
    newBillingCycle?: 'monthly' | 'yearly'
  ): Promise<void> {
    const currentPlan = this.subscriptionPlans.get(billingAccount.plan);
    const newPlan = this.subscriptionPlans.get(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new Error('Invalid plan configuration');
    }

    // Calculate prorated billing
    const billingCycle = newBillingCycle || 'monthly';
    const daysRemaining = Math.ceil((billingAccount.nextBillingDate! - Date.now()) / (24 * 60 * 60 * 1000));
    
    const proratedBilling = this.calculateProratedBilling(
      currentPlan,
      newPlan,
      billingCycle,
      daysRemaining
    );

    // Process prorated payment if upgrade
    if (proratedBilling.proratedAmount > 0) {
      const transaction = await this.processPayment(
        billingAccount.userId,
        proratedBilling.proratedAmount,
        'USD',
        'Plan upgrade prorated payment',
        {
          type: 'plan_upgrade',
          oldPlan: currentPlan.planId,
          newPlan: newPlan.planId,
          proratedDays: daysRemaining.toString(),
        }
      );

      if (transaction.status !== 'completed') {
        throw new Error('Prorated payment failed');
      }
    }

    // Process refund if downgrade
    if (proratedBilling.refundAmount > proratedBilling.upgradeAmount) {
      const refundAmount = proratedBilling.refundAmount - proratedBilling.upgradeAmount;
      // In a real implementation, you'd process the refund here
      console.log(`Refund of ${refundAmount} would be processed for plan downgrade`);
    }
  }

  /**
   * Calculates prorated billing for plan changes
   */
  private calculateProratedBilling(
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    daysRemaining: number
  ): ProratedBilling {
    const currentAmount = billingCycle === 'yearly' ? currentPlan.pricing.yearly : currentPlan.pricing.monthly;
    const newAmount = billingCycle === 'yearly' ? newPlan.pricing.yearly : newPlan.pricing.monthly;
    
    const totalDays = billingCycle === 'yearly' ? 365 : 30;
    const dailyCurrentRate = currentAmount / totalDays;
    const dailyNewRate = newAmount / totalDays;
    
    const refundAmount = dailyCurrentRate * daysRemaining;
    const upgradeAmount = dailyNewRate * daysRemaining;
    const proratedAmount = Math.max(0, upgradeAmount - refundAmount);

    return {
      currentPlanAmount: currentAmount,
      newPlanAmount: newAmount,
      proratedAmount,
      refundAmount,
      upgradeAmount,
      daysRemaining,
      effectiveDate: Date.now(),
    };
  }

  /**
   * Processes subscription renewal
   */
  private async processSubscriptionRenewal(billingAccount: BillingAccount): Promise<void> {
    try {
      // Process payment for renewal
      const transaction = await this.processPayment(
        billingAccount.userId,
        billingAccount.amount,
        billingAccount.currency,
        'Subscription renewal',
        {
          type: 'subscription_renewal',
          subscriptionId: billingAccount.subscriptionId!,
          plan: billingAccount.plan,
        }
      );

      if (transaction.status === 'completed') {
        // Successful renewal - extend subscription
        const nextBillingDate = this.calculateNextBillingDate(
          billingAccount.plan.includes('yearly') ? 'yearly' : 'monthly',
          billingAccount.nextBillingDate!
        );

        await db.updateBillingAccount(billingAccount.billingId, {
          nextBillingDate,
          status: 'active',
          updatedAt: Date.now(),
        });

        // Extend user premium membership
        await db.updateUser(billingAccount.userId, {
          premiumExpiresAt: nextBillingDate,
          updatedAt: Date.now(),
        });
      } else {
        // Failed renewal - handle payment failure
        await this.handlePaymentFailure(billingAccount, transaction);
      }
    } catch (error) {
      console.error('Error processing subscription renewal:', error);
      await this.handlePaymentFailure(billingAccount, null);
    }
  }

  /**
   * Handles payment failures
   */
  private async handlePaymentFailure(billingAccount: BillingAccount, transaction: Transaction | null): Promise<void> {
    // Update billing account status
    await db.updateBillingAccount(billingAccount.billingId, {
      status: 'past_due',
      updatedAt: Date.now(),
    });

    // Set grace period (7 days)
    const gracePeriodEnd = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    // Schedule retry attempts
    // In a real implementation, you'd schedule retry jobs here
    console.log(`Payment failure for subscription ${billingAccount.subscriptionId}. Grace period until ${new Date(gracePeriodEnd)}`);
    
    // If grace period expires, downgrade user
    setTimeout(async () => {
      const currentAccount = await db.getBillingAccount(billingAccount.billingId);
      if (currentAccount?.status === 'past_due') {
        await this.downgradeUser(billingAccount.userId);
      }
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  /**
   * Downgrades user to basic plan
   */
  private async downgradeUser(userId: string): Promise<void> {
    const basicPlan = this.subscriptionPlans.get('basic');
    if (!basicPlan) {
      throw new Error('Basic plan not found');
    }

    const enhancedUser: Partial<EnhancedUser> = {
      userType: 'individual',
      premiumActive: false,
      premiumPlan: undefined,
      premiumExpiresAt: undefined,
      membershipDetails: {
        plan: 'basic',
        features: basicPlan.features,
        limits: this.getPlanLimits(basicPlan),
        expiresAt: undefined,
        autoRenew: false,
      },
      updatedAt: new Date().toISOString(),
    };

    await db.updateUser(userId, enhancedUser);
  }

  /**
   * Processes a payment
   */
  private async processPayment(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<Transaction> {
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      throw new Error('Billing account not found');
    }

    const paymentResult = await this.paymentProcessor.processPayment(
      amount,
      currency,
      billingAccount.paymentMethodId!,
      metadata
    );

    const transaction: Transaction = {
      id: generateId(),
      transactionId: paymentResult.transactionId,
      type: 'payment',
      amount,
      currency,
      status: paymentResult.status === 'succeeded' ? 'completed' : 'failed',
      userId,
      userName: '', // Would be populated from user data
      userEmail: '', // Would be populated from user data
      paymentMethod: 'card',
      processorTransactionId: paymentResult.transactionId,
      createdAt: new Date().toISOString(),
      completedAt: paymentResult.status === 'succeeded' ? new Date().toISOString() : undefined,
      description,
      fees: amount * 0.029 + 0.30,
      netAmount: amount - (amount * 0.029 + 0.30),
      metadata,
      billingAccountId: billingAccount.billingId,
    };

    await db.createTransaction(transaction);
    return transaction;
  }

  /**
   * Calculates next billing date
   */
  private calculateNextBillingDate(billingCycle: 'monthly' | 'yearly', fromDate: number = Date.now()): number {
    const date = new Date(fromDate);
    
    if (billingCycle === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    return date.getTime();
  }

  /**
   * Gets plan limits configuration
   */
  private getPlanLimits(plan: SubscriptionPlan): any {
    const baseLimits = {
      maxListings: 5,
      maxImages: 10,
      priorityPlacement: false,
      featuredListings: 0,
      analyticsAccess: false,
      bulkOperations: false,
      advancedSearch: false,
      premiumSupport: false,
    };

    if (plan.planId === 'premium_individual') {
      return {
        ...baseLimits,
        maxListings: -1, // Unlimited
        maxImages: 50,
        priorityPlacement: true,
        featuredListings: 3,
        analyticsAccess: true,
        advancedSearch: true,
        premiumSupport: true,
      };
    }

    if (plan.planId === 'premium_dealer') {
      return {
        ...baseLimits,
        maxListings: -1, // Unlimited
        maxImages: 100,
        priorityPlacement: true,
        featuredListings: 10,
        analyticsAccess: true,
        bulkOperations: true,
        advancedSearch: true,
        premiumSupport: true,
      };
    }

    return baseLimits;
  }

  /**
   * Gets subscription plan by ID
   */
  getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return this.subscriptionPlans.get(planId);
  }

  /**
   * Gets all active subscription plans
   */
  getActiveSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values()).filter(plan => plan.active);
  }
}