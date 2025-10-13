/**
 * @fileoverview API Gateway Integration for Dual Authentication
 * 
 * This module provides helper functions to integrate the dual Cognito User Pool
 * authorizers with existing API Gateway resources, implementing cross-pool access
 * prevention and proper endpoint routing.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DualAuthAuthorizersConstruct } from './dual-auth-authorizers-construct';

/**
 * Integration options for API Gateway with dual auth
 */
export interface ApiGatewayIntegrationOptions {
  /** The REST API instance */
  restApi: apigateway.RestApi;
  /** Dual auth authorizers construct */
  authorizers: DualAuthAuthorizersConstruct;
  /** Lambda functions for different services */
  lambdaFunctions: {
    auth: lambda.Function;
    listing: lambda.Function;
    search: lambda.Function;
    media: lambda.Function;
    admin: lambda.Function;
    billing: lambda.Function;
    finance: lambda.Function;
  };
}

/**
 * Create customer API endpoints with proper authorization
 */
export function createCustomerApiEndpoints(options: ApiGatewayIntegrationOptions): void {
  const { restApi, authorizers, lambdaFunctions } = options;

  // Create /api/customer structure if it doesn't exist
  let apiResource = restApi.root.getResource('api');
  if (!apiResource) {
    apiResource = restApi.root.addResource('api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      },
    });
  }

  const customerResource = apiResource.addResource('customer', {
    defaultCorsPreflightOptions: {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
    },
  });

  // Customer authentication endpoints (no authorizer needed)
  const customerAuth = customerResource.addResource('auth');
  const customerLogin = customerAuth.addResource('login');
  customerLogin.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));
  
  const customerRegister = customerAuth.addResource('register');
  customerRegister.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));
  
  const customerRefresh = customerAuth.addResource('refresh');
  customerRefresh.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));

  // Customer profile endpoints (with authorizer)
  const profile = customerResource.addResource('profile');
  profile.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.auth), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  profile.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions.auth), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Customer listings endpoints (with authorizer)
  const listings = customerResource.addResource('listings');
  listings.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.listing), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  listings.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.listing), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  const listing = listings.addResource('{id}');
  listing.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.listing), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  listing.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions.listing), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  listing.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFunctions.listing), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Customer search endpoints (with authorizer)
  const search = customerResource.addResource('search');
  search.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.search), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Customer media endpoints (with authorizer)
  const media = customerResource.addResource('media');
  media.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.media), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Customer finance endpoints (with authorizer)
  const finance = customerResource.addResource('finance');
  finance.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.finance), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  
  const calculations = finance.addResource('calculations');
  calculations.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.finance), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  calculations.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.finance), {
    authorizer: authorizers.customerAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  console.log('Created customer API endpoints with authorization');
}

/**
 * Update admin API endpoints to use staff authorization
 */
export function updateAdminApiEndpoints(options: ApiGatewayIntegrationOptions): void {
  const { restApi, authorizers, lambdaFunctions } = options;

  // Create /api/admin structure if it doesn't exist
  let apiResource = restApi.root.getResource('api');
  if (!apiResource) {
    apiResource = restApi.root.addResource('api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      },
    });
  }

  const adminResource = apiResource.addResource('admin', {
    defaultCorsPreflightOptions: {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
    },
  });

  // Staff authentication endpoints (no authorizer needed)
  const staffAuth = adminResource.addResource('auth');
  const staffLogin = staffAuth.addResource('login');
  staffLogin.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));
  
  const staffRefresh = staffAuth.addResource('refresh');
  staffRefresh.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));

  // Admin dashboard endpoints (with staff authorizer)
  const dashboard = adminResource.addResource('dashboard');
  dashboard.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin users management (with staff authorizer)
  const users = adminResource.addResource('users');
  users.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  users.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  const user = users.addResource('{id}');
  user.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  user.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  user.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin listings management (with staff authorizer)
  const adminListings = adminResource.addResource('listings');
  adminListings.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  const adminListing = adminListings.addResource('{id}');
  adminListing.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  adminListing.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  adminListing.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin moderation queue (with staff authorizer)
  const moderation = adminResource.addResource('moderation');
  moderation.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  moderation.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin billing management (with staff authorizer)
  const billing = adminResource.addResource('billing');
  billing.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.billing), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });
  billing.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.billing), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin analytics (with staff authorizer)
  const analytics = adminResource.addResource('analytics');
  analytics.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // Admin proxy for catch-all (with staff authorizer)
  const adminProxy = adminResource.addResource('{proxy+}');
  adminProxy.addMethod('ANY', new apigateway.LambdaIntegration(lambdaFunctions.admin), {
    authorizer: authorizers.staffAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  console.log('Updated admin API endpoints with staff authorization');
}

/**
 * Create public endpoints that don't require authorization
 */
export function createPublicApiEndpoints(options: ApiGatewayIntegrationOptions): void {
  const { restApi, lambdaFunctions } = options;

  // Health check endpoint (no authorization)
  const health = restApi.root.addResource('health');
  health.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.auth));

  // Public listings search (no authorization)
  const search = restApi.root.addResource('search');
  search.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.search));

  // Public listings view (no authorization)
  const listings = restApi.root.addResource('listings');
  listings.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.listing));

  const listing = listings.addResource('{id}');
  listing.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.listing));

  console.log('Created public API endpoints without authorization');
}

/**
 * Helper function to create method options with proper CORS and authorization
 */
export function createMethodOptions(
  authorizer?: apigateway.IAuthorizer,
  additionalHeaders?: string[]
): apigateway.MethodOptions {
  const baseOptions: apigateway.MethodOptions = {
    methodResponses: [
      {
        statusCode: '200',
        responseHeaders: {
          'Access-Control-Allow-Origin': true,
          'Access-Control-Allow-Headers': true,
          'Access-Control-Allow-Methods': true,
        },
      },
      {
        statusCode: '400',
        responseHeaders: {
          'Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '401',
        responseHeaders: {
          'Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '403',
        responseHeaders: {
          'Access-Control-Allow-Origin': true,
        },
      },
      {
        statusCode: '500',
        responseHeaders: {
          'Access-Control-Allow-Origin': true,
        },
      },
    ],
  };

  if (authorizer) {
    baseOptions.authorizer = authorizer;
    baseOptions.authorizationType = apigateway.AuthorizationType.CUSTOM;
    baseOptions.requestParameters = {
      'method.request.header.Authorization': true,
      ...(additionalHeaders?.reduce((acc, header) => {
        acc[`method.request.header.${header}`] = false;
        return acc;
      }, {} as Record<string, boolean>) || {}),
    };
  }

  return baseOptions;
}