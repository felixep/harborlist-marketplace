/**
 * @fileoverview Payment processor configuration service for HarborList billing system.
 * 
 * Provides centralized configuration management for payment processors with
 * environment-specific settings, security validation, and processor selection.
 * 
 * Features:
 * - Multi-processor support (Stripe, PayPal)
 * - Environment-specific configuration
 * - Security validation and key management
 * - Processor health checking
 * - Configuration caching and refresh
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { PaymentProcessor, createStripeProcessor } from './payment-processors/stripe';
import { createPayPalProcessor } from './payment-processors/paypal';

/**
 * Payment processor configuration interface
 */
export interface PaymentProcessorConfig {
  type: 'stripe' | 'paypal';
  enabled: boolean;
  environment: 'sandbox' | 'live' | 'test';
  credentials: {
    apiKey?: string;
    secretKey?: string;
    clientId?: string;
    clientSecret?: string;
    webhookSecret?: string;
    webhookId?: string;
  };
  settings: {
    returnUrl?: string;
    cancelUrl?: string;
    currency: string;
    supportedCountries: string[];
    features: {
      subscriptions: boolean;
      refunds: boolean;
      disputes: boolean;
      webhooks: boolean;
    };
  };
}

/**
 * Payment processor health status
 */
export interface ProcessorHealthStatus {
  type: 'stripe' | 'paypal';
  healthy: boolean;
  lastChecked: number;
  responseTime?: number;
  error?: string;
  capabilities: {
    payments: boolean;
    subscriptions: boolean;
    refunds: boolean;
    webhooks: boolean;
  };
}

/**
 * Payment processor configuration manager
 */
export class PaymentProcessorConfigManager {
  private configs: Map<string, PaymentProcessorConfig> = new Map();
  private processors: Map<string, PaymentProcessor> = new Map();
  private healthStatus: Map<string, ProcessorHealthStatus> = new Map();
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.loadConfigurations();
  }

  /**
   * Loads payment processor configurations from environment variables
   */
  private loadConfigurations(): void {
    // Load Stripe configuration
    const stripeConfig: PaymentProcessorConfig = {
      type: 'stripe',
      enabled: this.isProcessorEnabled('stripe'),
      environment: this.getEnvironment(),
      credentials: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      settings: {
        returnUrl: process.env.STRIPE_RETURN_URL || this.getDefaultReturnUrl(),
        cancelUrl: process.env.STRIPE_CANCEL_URL || this.getDefaultCancelUrl(),
        currency: process.env.DEFAULT_CURRENCY || 'USD',
        supportedCountries: this.getSupportedCountries('stripe'),
        features: {
          subscriptions: true,
          refunds: true,
          disputes: true,
          webhooks: true,
        },
      },
    };

    // Load PayPal configuration
    const paypalConfig: PaymentProcessorConfig = {
      type: 'paypal',
      enabled: this.isProcessorEnabled('paypal'),
      environment: this.getPayPalEnvironment(),
      credentials: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        webhookId: process.env.PAYPAL_WEBHOOK_ID,
      },
      settings: {
        returnUrl: process.env.PAYPAL_RETURN_URL || this.getDefaultReturnUrl(),
        cancelUrl: process.env.PAYPAL_CANCEL_URL || this.getDefaultCancelUrl(),
        currency: process.env.DEFAULT_CURRENCY || 'USD',
        supportedCountries: this.getSupportedCountries('paypal'),
        features: {
          subscriptions: true,
          refunds: true,
          disputes: true,
          webhooks: true,
        },
      },
    };

    // Store configurations
    this.configs.set('stripe', stripeConfig);
    this.configs.set('paypal', paypalConfig);

    // Initialize processors
    this.initializeProcessors();
  }

  /**
   * Initializes payment processors based on configuration
   */
  private initializeProcessors(): void {
    for (const [type, config] of this.configs.entries()) {
      if (!config.enabled) {
        console.log(`Payment processor ${type} is disabled`);
        continue;
      }

      try {
        let processor: PaymentProcessor;

        switch (config.type) {
          case 'stripe':
            if (!config.credentials.secretKey || !config.credentials.webhookSecret) {
              console.warn(`Stripe configuration incomplete, skipping initialization`);
              continue;
            }
            processor = createStripeProcessor(
              config.credentials.secretKey,
              config.credentials.webhookSecret
            );
            break;

          case 'paypal':
            if (!config.credentials.clientId || !config.credentials.clientSecret) {
              console.warn(`PayPal configuration incomplete, skipping initialization`);
              continue;
            }
            processor = createPayPalProcessor(
              config.credentials.clientId,
              config.credentials.clientSecret,
              config.environment as 'sandbox' | 'live',
              config.credentials.webhookId
            );
            break;

          default:
            console.warn(`Unknown payment processor type: ${config.type}`);
            continue;
        }

        this.processors.set(type, processor);
        console.log(`Payment processor ${type} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize payment processor ${type}:`, error);
      }
    }
  }

  /**
   * Gets the primary payment processor
   * 
   * @returns PaymentProcessor | null - Primary processor or null if none available
   */
  getPrimaryProcessor(): PaymentProcessor | null {
    const primaryType = process.env.PAYMENT_PROCESSOR || 'stripe';
    return this.processors.get(primaryType) || this.getFirstAvailableProcessor();
  }

  /**
   * Gets a specific payment processor by type
   * 
   * @param type - Processor type to retrieve
   * @returns PaymentProcessor | null - Processor or null if not available
   */
  getProcessor(type: 'stripe' | 'paypal'): PaymentProcessor | null {
    return this.processors.get(type) || null;
  }

  /**
   * Gets the first available payment processor
   * 
   * @returns PaymentProcessor | null - First available processor or null
   */
  private getFirstAvailableProcessor(): PaymentProcessor | null {
    for (const processor of this.processors.values()) {
      return processor;
    }
    return null;
  }

  /**
   * Gets configuration for a specific processor
   * 
   * @param type - Processor type
   * @returns PaymentProcessorConfig | null - Configuration or null if not found
   */
  getConfig(type: 'stripe' | 'paypal'): PaymentProcessorConfig | null {
    return this.configs.get(type) || null;
  }

  /**
   * Gets all available processor types
   * 
   * @returns string[] - Array of available processor types
   */
  getAvailableProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Checks if a processor is enabled and available
   * 
   * @param type - Processor type to check
   * @returns boolean - True if processor is available
   */
  isProcessorAvailable(type: 'stripe' | 'paypal'): boolean {
    return this.processors.has(type);
  }

  /**
   * Performs health check on all processors
   * 
   * @returns Promise<Map<string, ProcessorHealthStatus>> - Health status for all processors
   */
  async performHealthCheck(): Promise<Map<string, ProcessorHealthStatus>> {
    const now = Date.now();
    
    // Skip if health check was performed recently
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.healthStatus;
    }

    console.log('Performing payment processor health check...');

    for (const [type, processor] of this.processors.entries()) {
      const startTime = Date.now();
      
      try {
        // Perform basic health check (this would be processor-specific)
        const isHealthy = await this.checkProcessorHealth(processor, type);
        const responseTime = Date.now() - startTime;

        this.healthStatus.set(type, {
          type: type as 'stripe' | 'paypal',
          healthy: isHealthy,
          lastChecked: now,
          responseTime,
          capabilities: {
            payments: isHealthy,
            subscriptions: isHealthy,
            refunds: isHealthy,
            webhooks: isHealthy,
          },
        });

        console.log(`${type} health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        this.healthStatus.set(type, {
          type: type as 'stripe' | 'paypal',
          healthy: false,
          lastChecked: now,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          capabilities: {
            payments: false,
            subscriptions: false,
            refunds: false,
            webhooks: false,
          },
        });

        console.error(`${type} health check failed:`, error);
      }
    }

    this.lastHealthCheck = now;
    return this.healthStatus;
  }

  /**
   * Gets health status for all processors
   * 
   * @returns Map<string, ProcessorHealthStatus> - Current health status
   */
  getHealthStatus(): Map<string, ProcessorHealthStatus> {
    return this.healthStatus;
  }

  /**
   * Checks if a specific processor type is enabled
   * 
   * @param type - Processor type to check
   * @returns boolean - True if processor is enabled
   */
  private isProcessorEnabled(type: 'stripe' | 'paypal'): boolean {
    const enabledProcessors = (process.env.ENABLED_PAYMENT_PROCESSORS || 'stripe,paypal')
      .split(',')
      .map(p => p.trim().toLowerCase());
    
    return enabledProcessors.includes(type);
  }

  /**
   * Gets the current environment
   * 
   * @returns 'sandbox' | 'live' | 'test' - Current environment
   */
  private getEnvironment(): 'sandbox' | 'live' | 'test' {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
      return 'live';
    } else if (env === 'test') {
      return 'test';
    } else {
      return 'sandbox';
    }
  }

  /**
   * Gets PayPal-specific environment
   * 
   * @returns 'sandbox' | 'live' - PayPal environment
   */
  private getPayPalEnvironment(): 'sandbox' | 'live' {
    const paypalEnv = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    return paypalEnv === 'live' ? 'live' : 'sandbox';
  }

  /**
   * Gets default return URL
   * 
   * @returns string - Default return URL
   */
  private getDefaultReturnUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}/payment/return`;
  }

  /**
   * Gets default cancel URL
   * 
   * @returns string - Default cancel URL
   */
  private getDefaultCancelUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}/payment/cancel`;
  }

  /**
   * Gets supported countries for a processor
   * 
   * @param type - Processor type
   * @returns string[] - Array of supported country codes
   */
  private getSupportedCountries(type: 'stripe' | 'paypal'): string[] {
    // This would typically come from processor documentation or API
    const defaultCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'];
    
    const envVar = `${type.toUpperCase()}_SUPPORTED_COUNTRIES`;
    const envCountries = process.env[envVar];
    
    if (envCountries) {
      return envCountries.split(',').map(c => c.trim().toUpperCase());
    }
    
    return defaultCountries;
  }

  /**
   * Performs health check on a specific processor
   * 
   * @param processor - Payment processor to check
   * @param type - Processor type
   * @returns Promise<boolean> - True if processor is healthy
   */
  private async checkProcessorHealth(processor: PaymentProcessor, type: string): Promise<boolean> {
    try {
      // For now, we'll just check if the processor is initialized
      // In a real implementation, you might make a test API call
      return processor !== null && processor !== undefined;
    } catch (error) {
      console.error(`Health check failed for ${type}:`, error);
      return false;
    }
  }

  /**
   * Refreshes processor configurations and reinitializes if needed
   */
  refreshConfigurations(): void {
    console.log('Refreshing payment processor configurations...');
    this.loadConfigurations();
  }

  /**
   * Gets processor capabilities
   * 
   * @param type - Processor type
   * @returns object - Processor capabilities
   */
  getProcessorCapabilities(type: 'stripe' | 'paypal'): PaymentProcessorConfig['settings']['features'] | null {
    const config = this.getConfig(type);
    return config?.settings.features || null;
  }

  /**
   * Validates processor configuration
   * 
   * @param type - Processor type to validate
   * @returns object - Validation result
   */
  validateProcessorConfig(type: 'stripe' | 'paypal'): { valid: boolean; errors: string[] } {
    const config = this.getConfig(type);
    const errors: string[] = [];

    if (!config) {
      errors.push(`Configuration not found for ${type}`);
      return { valid: false, errors };
    }

    if (!config.enabled) {
      errors.push(`Processor ${type} is disabled`);
    }

    switch (type) {
      case 'stripe':
        if (!config.credentials.secretKey) {
          errors.push('Stripe secret key is missing');
        }
        if (!config.credentials.webhookSecret) {
          errors.push('Stripe webhook secret is missing');
        }
        break;

      case 'paypal':
        if (!config.credentials.clientId) {
          errors.push('PayPal client ID is missing');
        }
        if (!config.credentials.clientSecret) {
          errors.push('PayPal client secret is missing');
        }
        break;
    }

    if (!config.settings.returnUrl) {
      errors.push(`Return URL is missing for ${type}`);
    }

    if (!config.settings.cancelUrl) {
      errors.push(`Cancel URL is missing for ${type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
let configManager: PaymentProcessorConfigManager | null = null;

/**
 * Gets the singleton payment processor configuration manager
 * 
 * @returns PaymentProcessorConfigManager - Configuration manager instance
 */
export function getPaymentProcessorConfigManager(): PaymentProcessorConfigManager {
  if (!configManager) {
    configManager = new PaymentProcessorConfigManager();
  }
  return configManager;
}

/**
 * Factory function to get the primary payment processor
 * 
 * @returns PaymentProcessor | null - Primary payment processor
 */
export function getPrimaryPaymentProcessor(): PaymentProcessor | null {
  return getPaymentProcessorConfigManager().getPrimaryProcessor();
}

/**
 * Factory function to get a specific payment processor
 * 
 * @param type - Processor type to retrieve
 * @returns PaymentProcessor | null - Requested payment processor
 */
export function getPaymentProcessor(type: 'stripe' | 'paypal'): PaymentProcessor | null {
  return getPaymentProcessorConfigManager().getProcessor(type);
}