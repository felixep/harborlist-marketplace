/**
 * @fileoverview Environment configuration management for AWS Cognito dual-pool authentication
 * 
 * This module provides environment-aware configuration management that automatically
 * detects and configures appropriate Cognito endpoints for LocalStack (local development)
 * and AWS (staging/production) environments.
 * 
 * Key Features:
 * - Automatic environment detection (local vs AWS)
 * - Dual User Pool configuration (Customer and Staff)
 * - LocalStack compatibility for local development
 * - Environment-specific security settings
 * - Configuration validation and error handling
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { UserPoolConfig } from './interfaces';

/**
 * Environment types supported by the authentication service
 */
export type Environment = 'local' | 'dev' | 'staging' | 'prod';

/**
 * Deployment context information
 */
export interface DeploymentContext {
  environment: Environment;
  isLocal: boolean;
  isAWS: boolean;
  useLocalStack: boolean;
  region: string;
}

/**
 * Complete environment configuration interface
 */
export interface EnvironmentConfig {
  deployment: DeploymentContext;
  cognito: {
    customer: UserPoolConfig;
    staff: UserPoolConfig;
  };
  security: {
    customerSessionTTL: number; // in seconds
    staffSessionTTL: number; // in seconds
    mfaRequired: {
      customer: boolean;
      staff: boolean;
    };
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
  features: {
    enableMFA: boolean;
    enableAuditLogging: boolean;
    enableRateLimiting: boolean;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  region: 'us-east-1',
  customerSessionTTL: 24 * 60 * 60, // 24 hours
  staffSessionTTL: 8 * 60 * 60, // 8 hours
  passwordMinLength: 8,
  localStackPort: 4566,
} as const;

/**
 * Environment configuration class
 * Provides centralized configuration management with automatic environment detection
 */
export class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance of configuration manager
   */
  public static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  /**
   * Get current environment configuration
   * Automatically detects environment and loads appropriate configuration
   */
  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      this.config = this.loadConfiguration();
    }
    return this.config;
  }

  /**
   * Reload configuration (useful for testing or environment changes)
   */
  public reloadConfig(): EnvironmentConfig {
    this.config = this.loadConfiguration();
    return this.config;
  }

  /**
   * Load configuration based on current environment
   */
  private loadConfiguration(): EnvironmentConfig {
    const deployment = this.detectDeploymentContext();
    
    return {
      deployment,
      cognito: {
        customer: this.getCustomerPoolConfig(deployment),
        staff: this.getStaffPoolConfig(deployment),
      },
      security: this.getSecurityConfig(deployment),
      features: this.getFeaturesConfig(deployment),
    };
  }

  /**
   * Detect current deployment context
   */
  private detectDeploymentContext(): DeploymentContext {
    // Check for explicit environment variable
    const envVar = process.env.ENVIRONMENT || process.env.NODE_ENV || 'local';
    const environment = this.normalizeEnvironment(envVar);
    
    // AWS Lambda detection
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // LocalStack detection
    const hasLocalStackEndpoint = !!process.env.LOCALSTACK_ENDPOINT || !!process.env.COGNITO_ENDPOINT;
    const useLocalStack = environment === 'local' || hasLocalStackEndpoint;
    
    // Docker detection
    const isDocker = !!process.env.DOCKER_CONTAINER || process.env.DEPLOYMENT_TARGET === 'docker';
    
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || DEFAULT_CONFIG.region;
    
    return {
      environment,
      isLocal: environment === 'local',
      isAWS: isLambda || (!useLocalStack && !isDocker),
      useLocalStack,
      region,
    };
  }

  /**
   * Normalize environment string to supported values
   */
  private normalizeEnvironment(env: string): Environment {
    const normalized = env.toLowerCase();
    
    switch (normalized) {
      case 'local':
      case 'development':
      case 'dev':
        return 'local';
      case 'dev':
      case 'develop':
        return 'dev';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'production':
      case 'prod':
        return 'prod';
      default:
        console.warn(`Unknown environment '${env}', defaulting to 'local'`);
        return 'local';
    }
  }

  /**
   * Get Customer User Pool configuration
   */
  private getCustomerPoolConfig(deployment: DeploymentContext): UserPoolConfig {
    if (deployment.useLocalStack) {
      return {
        poolId: process.env.CUSTOMER_USER_POOL_ID || 'local_customer_pool',
        clientId: process.env.CUSTOMER_USER_POOL_CLIENT_ID || 'local_customer_client',
        region: deployment.region,
        endpoint: this.getLocalStackEndpoint(),
      };
    }

    // AWS environment
    const poolId = process.env.CUSTOMER_USER_POOL_ID;
    const clientId = process.env.CUSTOMER_USER_POOL_CLIENT_ID;

    if (!poolId || !clientId) {
      throw new Error(
        'Customer User Pool configuration missing. Required: CUSTOMER_USER_POOL_ID, CUSTOMER_USER_POOL_CLIENT_ID'
      );
    }

    return {
      poolId,
      clientId,
      region: deployment.region,
    };
  }

  /**
   * Get Staff User Pool configuration
   */
  private getStaffPoolConfig(deployment: DeploymentContext): UserPoolConfig {
    if (deployment.useLocalStack) {
      return {
        poolId: process.env.STAFF_USER_POOL_ID || 'local_staff_pool',
        clientId: process.env.STAFF_USER_POOL_CLIENT_ID || 'local_staff_client',
        region: deployment.region,
        endpoint: this.getLocalStackEndpoint(),
      };
    }

    // AWS environment
    const poolId = process.env.STAFF_USER_POOL_ID;
    const clientId = process.env.STAFF_USER_POOL_CLIENT_ID;

    if (!poolId || !clientId) {
      throw new Error(
        'Staff User Pool configuration missing. Required: STAFF_USER_POOL_ID, STAFF_USER_POOL_CLIENT_ID'
      );
    }

    return {
      poolId,
      clientId,
      region: deployment.region,
    };
  }

  /**
   * Get LocalStack endpoint URL
   */
  private getLocalStackEndpoint(): string {
    const endpoint = process.env.LOCALSTACK_ENDPOINT || 
                    process.env.COGNITO_ENDPOINT ||
                    `http://localhost:${DEFAULT_CONFIG.localStackPort}`;
    
    return endpoint;
  }

  /**
   * Get security configuration based on environment
   */
  private getSecurityConfig(deployment: DeploymentContext) {
    const isProduction = deployment.environment === 'prod';
    
    return {
      customerSessionTTL: parseInt(
        process.env.CUSTOMER_SESSION_TTL || 
        String(DEFAULT_CONFIG.customerSessionTTL)
      ),
      staffSessionTTL: parseInt(
        process.env.STAFF_SESSION_TTL || 
        String(DEFAULT_CONFIG.staffSessionTTL)
      ),
      mfaRequired: {
        customer: process.env.CUSTOMER_MFA_REQUIRED === 'true' || isProduction,
        staff: process.env.STAFF_MFA_REQUIRED !== 'false', // Default to true for staff
      },
      passwordPolicy: {
        minLength: parseInt(
          process.env.PASSWORD_MIN_LENGTH || 
          String(DEFAULT_CONFIG.passwordMinLength)
        ),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true' || isProduction,
      },
    };
  }

  /**
   * Get feature flags configuration
   */
  private getFeaturesConfig(deployment: DeploymentContext) {
    return {
      enableMFA: process.env.ENABLE_MFA !== 'false',
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false' || deployment.environment === 'prod',
    };
  }

  /**
   * Validate configuration completeness
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    // Validate Cognito configuration
    if (!config.cognito.customer.poolId) {
      errors.push('Customer User Pool ID is required');
    }
    if (!config.cognito.customer.clientId) {
      errors.push('Customer User Pool Client ID is required');
    }
    if (!config.cognito.staff.poolId) {
      errors.push('Staff User Pool ID is required');
    }
    if (!config.cognito.staff.clientId) {
      errors.push('Staff User Pool Client ID is required');
    }

    // Validate security configuration
    if (config.security.customerSessionTTL <= 0) {
      errors.push('Customer session TTL must be positive');
    }
    if (config.security.staffSessionTTL <= 0) {
      errors.push('Staff session TTL must be positive');
    }
    if (config.security.passwordPolicy.minLength < 8) {
      errors.push('Password minimum length must be at least 8 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get environment-specific logging configuration
   */
  public getLoggingConfig() {
    const config = this.getConfig();
    
    return {
      level: config.deployment.environment === 'prod' ? 'warn' : 'debug',
      enableConsole: config.deployment.isLocal,
      enableCloudWatch: config.deployment.isAWS,
      enableAuditLogs: config.features.enableAuditLogging,
    };
  }

  /**
   * Check if running in local development mode
   */
  public isLocalDevelopment(): boolean {
    return this.getConfig().deployment.isLocal;
  }

  /**
   * Check if running in AWS environment
   */
  public isAWSEnvironment(): boolean {
    return this.getConfig().deployment.isAWS;
  }

  /**
   * Check if using LocalStack
   */
  public isUsingLocalStack(): boolean {
    return this.getConfig().deployment.useLocalStack;
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return EnvironmentConfigManager.getInstance().getConfig();
}

/**
 * Convenience function to check if in local development
 */
export function isLocalDevelopment(): boolean {
  return EnvironmentConfigManager.getInstance().isLocalDevelopment();
}

/**
 * Convenience function to check if in AWS environment
 */
export function isAWSEnvironment(): boolean {
  return EnvironmentConfigManager.getInstance().isAWSEnvironment();
}

/**
 * Convenience function to check if using LocalStack
 */
export function isUsingLocalStack(): boolean {
  return EnvironmentConfigManager.getInstance().isUsingLocalStack();
}

/**
 * Environment configuration validation utility
 */
export function validateEnvironmentConfig(): void {
  const configManager = EnvironmentConfigManager.getInstance();
  const validation = configManager.validateConfig();
  
  if (!validation.valid) {
    const errorMessage = `Environment configuration validation failed:\n${validation.errors.join('\n')}`;
    throw new Error(errorMessage);
  }
}

/**
 * Debug utility to log current configuration (non-sensitive parts)
 */
export function logConfigurationSummary(): void {
  const config = getEnvironmentConfig();
  
  console.log('Authentication Service Configuration Summary:');
  console.log(`Environment: ${config.deployment.environment}`);
  console.log(`Deployment Context: ${config.deployment.isAWS ? 'AWS' : 'Local'}`);
  console.log(`Using LocalStack: ${config.deployment.useLocalStack}`);
  console.log(`Region: ${config.deployment.region}`);
  console.log(`Customer Session TTL: ${config.security.customerSessionTTL}s`);
  console.log(`Staff Session TTL: ${config.security.staffSessionTTL}s`);
  console.log(`MFA Required - Customer: ${config.security.mfaRequired.customer}, Staff: ${config.security.mfaRequired.staff}`);
  console.log(`Features - MFA: ${config.features.enableMFA}, Audit: ${config.features.enableAuditLogging}, Rate Limiting: ${config.features.enableRateLimiting}`);
}