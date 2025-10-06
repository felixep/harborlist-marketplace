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
 * - environment: Target deployment environment (dev|staging|prod)
 * - useCustomDomains: Enable/disable custom domain configuration (default: true)
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BoatListingStack } from '../lib/boat-listing-stack';

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
 * @type {('dev' | 'staging' | 'prod')}
 */
type Environment = 'dev' | 'staging' | 'prod';

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
 * Environment-specific domain configurations
 * 
 * Defines the domain names for each deployment environment.
 * These domains must be configured in Cloudflare DNS to point
 * to the appropriate AWS resources.
 * 
 * Domain Strategy:
 * - dev: Development environment with dev subdomain
 * - staging: Pre-production environment with staging subdomain  
 * - prod: Production environment with apex domain
 * 
 * @type {Record<Environment, EnvironmentConfig>}
 */
const envConfigs: Record<Environment, EnvironmentConfig> = {
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

/**
 * Instantiate the main HarborList infrastructure stack
 * 
 * Creates the complete serverless infrastructure including:
 * - DynamoDB tables for data persistence
 * - Lambda functions for serverless compute
 * - API Gateway for RESTful endpoints
 * - S3 buckets for storage and static hosting
 * - CloudWatch monitoring and alerting
 * - Cloudflare tunnel integration
 * - Security and authentication components
 * 
 * Stack Naming Convention:
 * - Format: BoatListingStack-{environment}
 * - Examples: BoatListingStack-dev, BoatListingStack-prod
 * 
 * Configuration Strategy:
 * - Environment-specific resource naming
 * - Conditional domain configuration based on useCustomDomains flag
 * - AWS account and region from environment variables
 * - Cost optimization through environment-appropriate resource sizing
 */
new BoatListingStack(app, `BoatListingStack-${environment}`, {
  environment,
  // Conditionally include domain configuration
  ...(useCustomDomains && config && {
    domainName: config.domainName,
    apiDomainName: config.apiDomainName,
  }),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
