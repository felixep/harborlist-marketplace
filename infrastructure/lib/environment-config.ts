/**
 * @fileoverview Environment Configuration for HarborList Infrastructure
 * 
 * This module provides centralized environment configuration management
 * for all CDK stacks, supporting local development with LocalStack,
 * development, staging, and production environments.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { Construct } from 'constructs';

/**
 * Supported deployment environments
 */
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Environment-specific configuration interface
 */
export interface EnvironmentConfig {
  /** AWS account ID */
  account: string;
  /** AWS region */
  region: string;
  /** Primary domain name for the frontend application */
  domainName: string;
  /** API subdomain for backend services */
  apiDomainName: string;
  /** Email address for operational alerts */
  alertEmail: string;

  /** Whether to use custom domains */
  useCustomDomains: boolean;
  /** Environment-specific tags */
  tags: Record<string, string>;
}

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  dev: {
    account: '676032292155',
    region: 'us-east-1',
    domainName: 'dev.harborlist.com',
    apiDomainName: 'api-dev.harborlist.com',
    alertEmail: 'alerts@harborlist.com',
    useCustomDomains: false, // Default to false for easier development
    tags: {
      Environment: 'dev',
      Service: 'harborlist',
      ManagedBy: 'cdk',
      CostCenter: 'development',
    },
  },
  staging: {
    account: '676032292155',
    region: 'us-east-1',
    domainName: 'staging.harborlist.com',
    apiDomainName: 'api-staging.harborlist.com',
    alertEmail: 'alerts@harborlist.com',
    useCustomDomains: true,
    tags: {
      Environment: 'staging',
      Service: 'harborlist',
      ManagedBy: 'cdk',
      CostCenter: 'operations',
    },
  },
  prod: {
    account: '676032292155',
    region: 'us-east-1',
    domainName: 'harborlist.com',
    apiDomainName: 'api.harborlist.com',
    alertEmail: 'alerts@harborlist.com',
    useCustomDomains: true,
    tags: {
      Environment: 'prod',
      Service: 'harborlist',
      ManagedBy: 'cdk',
      CostCenter: 'operations',
    },
  },
};

/**
 * Get environment configuration with context overrides
 */
export function getEnvironmentConfig(
  scope: Construct,
  environment: Environment
): EnvironmentConfig {
  const baseConfig = ENVIRONMENT_CONFIGS[environment];
  
  // Allow context overrides
  const contextOverrides = {
    account: scope.node.tryGetContext(`${environment}.account`) || 
             scope.node.tryGetContext('account'),
    region: scope.node.tryGetContext(`${environment}.region`) || 
            scope.node.tryGetContext('region'),
    domainName: scope.node.tryGetContext(`${environment}.domainName`),
    apiDomainName: scope.node.tryGetContext(`${environment}.apiDomainName`),
    alertEmail: scope.node.tryGetContext(`${environment}.alertEmail`),

    useCustomDomains: scope.node.tryGetContext('useCustomDomains') === 'true',
  };

  // Merge base config with context overrides, filtering out undefined values
  const mergedConfig = {
    ...baseConfig,
    ...Object.fromEntries(
      Object.entries(contextOverrides).filter(([_, value]) => value !== undefined)
    ),
  };

  return mergedConfig;
}

/**
 * Get OAuth callback URLs for the environment
 */
export function getOAuthCallbackUrls(config: EnvironmentConfig, path: string = '/auth/callback'): string[] {
  const protocol = config.useCustomDomains ? 'https' : 'http';
  const baseUrl = `${protocol}://${config.domainName}`;
  
  return [
    `${baseUrl}${path}`,
    `${baseUrl}/`,
  ];
}

/**
 * Get OAuth logout URLs for the environment
 */
export function getOAuthLogoutUrls(config: EnvironmentConfig, path: string = '/auth/logout'): string[] {
  const protocol = config.useCustomDomains ? 'https' : 'http';
  const baseUrl = `${protocol}://${config.domainName}`;
  
  return [
    `${baseUrl}${path}`,
    `${baseUrl}/`,
  ];
}

/**
 * Apply environment tags to a construct
 */
export function applyEnvironmentTags(scope: Construct, config: EnvironmentConfig): void {
  Object.entries(config.tags).forEach(([key, value]) => {
    scope.node.setContext(`aws:cdk:tags:${key}`, value);
  });
}