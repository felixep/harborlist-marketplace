#!/usr/bin/env node

/**
 * @fileoverview CDK Application entry point for HarborList boat marketplace infrastructure.
 * 
 * This file serves as the main entry point for the AWS CDK application that deploys
 * the complete HarborList boat marketplace infrastructure. It handles environment-specific
 * configuration, domain management, and stack instantiation.
 * 
 * Key Features:
 * - Multi-environment support (dev/staging/prod)
 * - Flexible domain configuration with custom domain support
 * - Environment variable integration for AWS account/region
 * - Context-based configuration management
 * - Cloudflare integration for CDN and security
 * 
 * Usage:
 * ```bash
 * # Deploy to development environment
 * cdk deploy --context environment=dev
 * 
 * # Deploy to production with custom domains
 * cdk deploy --context environment=prod --context useCustomDomains=true
 * 
 * # Deploy without custom domains (for testing)
 * cdk deploy --context environment=dev --context useCustomDomains=false
 * ```
 * 
 * Environment Variables:
 * - CDK_DEFAULT_ACCOUNT: AWS account ID for deployment
 * - CDK_DEFAULT_REGION: AWS region for deployment (recommended: us-east-1 for CloudFront)
 * 
 * Context Parameters:
 * - environment: Target deployment environment (local|dev|staging|prod)
 * - useCustomDomains: Enable/disable custom domain configuration (default: true)
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HarborListStack } from '../lib/harborlist-stack';
import { CustomerAuthStack } from '../lib/customer-auth-stack';
import { StaffAuthStack } from '../lib/staff-auth-stack';

/**
 * Environment-specific domain configuration interface
 * 
 * @interface EnvironmentConfig
 */
interface EnvironmentConfig {
  /** Primary domain name for the frontend application */
  domainName: string;
  /** API subdomain for backend services */
  apiDomainName: string;
}

/**
 * Supported deployment environments
 * 
 * @type {('local' | 'dev' | 'staging' | 'prod')}
 */
type Environment = 'local' | 'dev' | 'staging' | 'prod';

/**
 * Main CDK application instance
 * 
 * Creates and manages the complete infrastructure stack for the HarborList
 * boat marketplace platform with environment-specific configuration.
 */
const app = new cdk.App();

/**
 * Get deployment environment from CDK context
 * 
 * Retrieves the target environment from CDK context parameters.
 * Defaults to 'dev' if no environment is specified.
 * 
 * @type {Environment}
 */
const environment: Environment = (app.node.tryGetContext('environment') || 'dev') as Environment;

/**
 * Check if custom domains should be enabled
 * 
 * Custom domains are disabled by default and must be explicitly enabled
 * to prevent SSL/CORS issues during development and testing.
 * 
 * @type {boolean}
 */
const useCustomDomains: boolean = app.node.tryGetContext('useCustomDomains') === 'true';



/**
 * Get environment-specific context configuration
 * 
 * Retrieves environment-specific settings from CDK context.
 * 
 * @type {any}
 */
const envContext = app.node.tryGetContext(environment) || {};

/**
 * Environment-specific domain configurations
 * 
 * Defines the domain names for each deployment environment.
 * These domains must be configured in Cloudflare DNS to point
 * to the appropriate AWS resources.
 * 
 * Domain Strategy:
 * - local: Local development environment (localhost)
 * - dev: Development environment with dev subdomain
 * - staging: Pre-production environment with staging subdomain  
 * - prod: Production environment with apex domain
 * 
 * @type {Record<Environment, EnvironmentConfig>}
 */
const envConfigs: Record<Environment, EnvironmentConfig> = {
  local: {
    domainName: 'localhost:3000',
    apiDomainName: 'localhost:3001',
  },
  dev: {
    domainName: 'dev.harborlist.com',
    apiDomainName: 'api-dev.harborlist.com',
  },
  staging: {
    domainName: 'staging.harborlist.com',
    apiDomainName: 'api-staging.harborlist.com',
  },
  prod: {
    domainName: 'harborlist.com',
    apiDomainName: 'api.harborlist.com',
  },
};

/**
 * Get configuration for the current environment
 * 
 * @type {EnvironmentConfig}
 */
const config: EnvironmentConfig = envConfigs[environment];

// Only create authentication stacks for AWS environments (not local)
let customerAuthStack: CustomerAuthStack | undefined;
let staffAuthStack: StaffAuthStack | undefined;

if (environment !== 'local') {
  /**
   * Instantiate the Customer Authentication Stack
   * 
   * Creates AWS Cognito User Pool infrastructure for customer authentication
   * with support for Individual, Dealer, and Premium customer tiers.
   * 
   * Stack Features:
   * - Customer User Pool with email-based authentication
   * - Customer Groups for tier management
   * - Optional MFA support
   */
  customerAuthStack = new CustomerAuthStack(app, `CustomerAuthStack-${environment}`, {
    environment: environment as 'dev' | 'staging' | 'prod',
    env: {
      account: envContext.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: envContext.region || process.env.CDK_DEFAULT_REGION,
    },
  });

  /**
   * Instantiate the Staff Authentication Stack
   * 
   * Creates AWS Cognito User Pool infrastructure for staff authentication
   * with enhanced security settings and role-based access control.
   * 
   * Stack Features:
   * - Staff User Pool with enhanced security
   * - Staff Groups for role-based access control
   * - Enforced MFA for all staff accounts
   * - Enhanced security monitoring and logging
   */
  staffAuthStack = new StaffAuthStack(app, `StaffAuthStack-${environment}`, {
    environment: environment as 'dev' | 'staging' | 'prod',
    env: {
      account: envContext.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: envContext.region || process.env.CDK_DEFAULT_REGION,
    },
  });
}

/**
 * Conditionally instantiate the main HarborList infrastructure stack
 * 
 * Only create the main stack if not in auth-only mode.
 * This allows testing authentication stacks independently.
 */
const authOnly = app.node.tryGetContext('authOnly') === 'true';

if (!authOnly) {
  /**
   * Instantiate the main HarborList infrastructure stack
   * 
   * Creates the complete serverless infrastructure including:
   * - DynamoDB tables for data persistence
   * - Lambda functions for serverless compute
   * - API Gateway for RESTful endpoints
   * - S3 buckets for storage and static hosting
   * - CloudWatch monitoring and alerting
   * - Security and authentication components
   * 
   * Stack Naming Convention:
   * - Format: HarborListStack-{environment}
   * - Examples: HarborListStack-dev, HarborListStack-prod
   * 
   * Configuration Strategy:
   * - Environment-specific resource naming
   * - Conditional domain configuration based on useCustomDomains flag
   * - AWS account and region from environment variables or context
   * - Cost optimization through environment-appropriate resource sizing
   */
  const mainStack = new HarborListStack(app, `HarborListStack-${environment}`, {
    environment,
    // Conditionally include domain configuration
    ...(useCustomDomains && config && {
      domainName: config.domainName,
      apiDomainName: config.apiDomainName,
    }),
    // Include alert email from context if available
    ...(envContext.alertEmail && {
      alertEmail: envContext.alertEmail,
    }),
    env: {
      account: envContext.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: envContext.region || process.env.CDK_DEFAULT_REGION,
    },
  });

  // Add dependencies to ensure authentication stacks are deployed first
  if (customerAuthStack) {
    mainStack.addDependency(customerAuthStack);
  }
  if (staffAuthStack) {
    mainStack.addDependency(staffAuthStack);
  }
}
