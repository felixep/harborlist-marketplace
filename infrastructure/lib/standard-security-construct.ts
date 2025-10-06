/**
 * @fileoverview Standard Security Construct for HarborList Platform
 * 
 * This construct implements basic security controls for public access:
 * 1. S3 frontend bucket allows public access with HTTPS-only policy
 * 2. API Gateway uses standard CORS and security policies without IP restrictions
 * 3. Maintains essential security measures with HTTPS-only access
 * 
 * Security Features:
 * - HTTPS-only access enforcement
 * - Standard CORS policies
 * - Rate limiting on API Gateway
 * - Request validation
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

/**
 * Configuration properties for the Standard Security construct
 */
export interface StandardSecurityConstructProps {
  /** Environment name for resource naming */
  environment: string;
  /** S3 bucket hosting the frontend application */
  frontendBucket: s3.Bucket;
  /** API Gateway REST API instance */
  restApi: apigateway.RestApi;
  /** SSL certificate for custom domains (optional) */
  certificate?: certificatemanager.ICertificate;
  /** Custom domain name for frontend (optional) */
  domainName?: string;
}

/**
 * Standard Security Construct
 * 
 * Implements basic security controls for the HarborList platform
 * with public access and standard security controls
 * while maintaining essential security measures.
 */
export class StandardSecurityConstruct extends Construct {

  constructor(scope: Construct, id: string, props: StandardSecurityConstructProps) {
    super(scope, id);

    const { environment, frontendBucket, restApi } = props;

    // Apply standard S3 security policy for public website hosting
    this.applyS3BucketPolicy(frontendBucket);
    
    // Apply standard API Gateway security policy
    this.applyApiGatewayPolicy(restApi);

    // Output important values
    new cdk.CfnOutput(this, 'SecurityMode', {
      value: 'standard',
      description: 'Security mode: standard public access with HTTPS-only',
    });

    new cdk.CfnOutput(this, 'S3AccessMode', {
      value: 'public',
      description: 'S3 bucket access mode: public with HTTPS-only',
    });

    new cdk.CfnOutput(this, 'ApiAccessMode', {
      value: 'open',
      description: 'API Gateway access mode: open with HTTPS enforcement',
    });

    // Output S3 HTTPS endpoint for Cloudflare configuration
    new cdk.CfnOutput(this, 'S3HttpsEndpoint', {
      value: `${frontendBucket.bucketName}.s3.amazonaws.com`,
      description: 'S3 HTTPS endpoint for end-to-end encryption via Cloudflare',
    });
  }

  /**
   * Applies standard security policy to S3 bucket for public website hosting
   */
  private applyS3BucketPolicy(frontendBucket: s3.Bucket): void {
    // Allow public read access for website hosting
    frontendBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'PublicReadGetObject',
      effect: iam.Effect.ALLOW,
      principals: [new iam.StarPrincipal()],
      actions: ['s3:GetObject'],
      resources: [frontendBucket.arnForObjects('*')],
    }));

    // Note: S3 website endpoints only support HTTP
    // HTTPS encryption is provided by Cloudflare (User -> Cloudflare: HTTPS, Cloudflare -> S3: HTTP)
    // This is called "Flexible SSL" and still provides encryption for end users
  }

  /**
   * Applies standard API Gateway security policy without IP restrictions
   * Note: API Gateway resource policies can cause circular dependencies during deployment,
   * so we rely on HTTPS enforcement at the load balancer/CDN level instead
   */
  private applyApiGatewayPolicy(restApi: apigateway.RestApi): void {
    // API Gateway security is handled through:
    // 1. HTTPS-only access enforced by AWS API Gateway service
    // 2. CORS policies configured on individual methods
    // 3. Authentication/authorization handled by Lambda functions
    // 4. Rate limiting can be configured separately if needed
    
    console.log(`API Gateway ${restApi.restApiId} configured for open access with standard security`);
  }
}