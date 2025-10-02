import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createErrorResponse } from '../shared/utils';

/**
 * API Version configuration
 */
export interface ApiVersion {
  version: string;
  isSupported: boolean;
  isDeprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  migrationGuide?: string;
}

/**
 * Supported API versions
 */
export const API_VERSIONS: Record<string, ApiVersion> = {
  'v1': {
    version: 'v1',
    isSupported: true,
    isDeprecated: false
  },
  'v2': {
    version: 'v2',
    isSupported: true,
    isDeprecated: false
  },
  // Example of deprecated version
  'v1-beta': {
    version: 'v1-beta',
    isSupported: false,
    isDeprecated: true,
    deprecationDate: '2024-01-01T00:00:00Z',
    sunsetDate: '2024-06-01T00:00:00Z',
    migrationGuide: 'https://docs.harborlist.com/api/migration/v1-beta-to-v1'
  }
};

/**
 * Default API version when none is specified
 */
export const DEFAULT_API_VERSION = 'v1';

/**
 * Extract API version from request
 */
export function extractApiVersion(event: APIGatewayProxyEvent): string {
  // Check for version in header (preferred method)
  const headerVersion = event.headers['X-API-Version'] || event.headers['x-api-version'];
  if (headerVersion) {
    return headerVersion;
  }

  // Check for version in query parameter
  const queryVersion = event.queryStringParameters?.version;
  if (queryVersion) {
    return queryVersion;
  }

  // Check for version in path (e.g., /admin/v1/users)
  const pathMatch = event.path.match(/\/admin\/v(\d+(?:\.\d+)?(?:-\w+)?)\//);
  if (pathMatch) {
    return `v${pathMatch[1]}`;
  }

  // Check for version in Accept header (content negotiation)
  const acceptHeader = event.headers['Accept'] || event.headers['accept'];
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.harborlist\.v(\d+(?:\.\d+)?(?:-\w+)?)\+json/);
    if (versionMatch) {
      return `v${versionMatch[1]}`;
    }
  }

  return DEFAULT_API_VERSION;
}

/**
 * Validate API version
 */
export function validateApiVersion(version: string): { valid: boolean; error?: string; apiVersion?: ApiVersion } {
  const apiVersion = API_VERSIONS[version];

  if (!apiVersion) {
    return {
      valid: false,
      error: `Unsupported API version: ${version}. Supported versions: ${Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isSupported).join(', ')}`
    };
  }

  if (!apiVersion.isSupported) {
    let error = `API version ${version} is no longer supported.`;
    
    if (apiVersion.sunsetDate) {
      error += ` This version was sunset on ${apiVersion.sunsetDate}.`;
    }
    
    if (apiVersion.migrationGuide) {
      error += ` Please see migration guide: ${apiVersion.migrationGuide}`;
    }

    return {
      valid: false,
      error,
      apiVersion
    };
  }

  return {
    valid: true,
    apiVersion
  };
}

/**
 * Add version-specific headers to response
 */
export function addVersionHeaders(response: APIGatewayProxyResult, version: string): APIGatewayProxyResult {
  const apiVersion = API_VERSIONS[version];
  const headers: Record<string, string> = {
    ...response.headers,
    'X-API-Version': version,
    'X-API-Supported-Versions': Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isSupported).join(', ')
  };

  if (apiVersion?.isDeprecated) {
    headers['X-API-Deprecated'] = 'true';
    
    if (apiVersion.deprecationDate) {
      headers['X-API-Deprecation-Date'] = apiVersion.deprecationDate;
    }
    
    if (apiVersion.sunsetDate) {
      headers['X-API-Sunset-Date'] = apiVersion.sunsetDate;
    }
    
    if (apiVersion.migrationGuide) {
      headers['X-API-Migration-Guide'] = apiVersion.migrationGuide;
    }
  }

  return {
    ...response,
    headers
  };
}

/**
 * Middleware for API versioning
 */
export function withApiVersioning(handler: (event: APIGatewayProxyEvent, version: string) => Promise<APIGatewayProxyResult>) {
  return async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext.requestId;
    const version = extractApiVersion(event);
    const validation = validateApiVersion(version);

    if (!validation.valid) {
      return createErrorResponse(400, 'UNSUPPORTED_API_VERSION', validation.error!, requestId);
    }

    try {
      const response = await handler(event, version);
      return addVersionHeaders(response, version);
    } catch (error) {
      console.error('API versioning error:', error);
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
    }
  };
}

/**
 * Version-specific request/response transformers
 */
export interface VersionTransformer {
  transformRequest?: (body: any, version: string) => any;
  transformResponse?: (body: any, version: string) => any;
}

/**
 * Registry of version transformers
 */
export const VERSION_TRANSFORMERS: Record<string, Record<string, VersionTransformer>> = {
  // Example: User management endpoint transformers
  'users': {
    'v1': {
      transformResponse: (body: any) => {
        // v1 format - legacy field names
        if (body.users) {
          body.users = body.users.map((user: any) => ({
            ...user,
            user_id: user.id, // Legacy field name
            email_address: user.email, // Legacy field name
            full_name: user.name // Legacy field name
          }));
        }
        return body;
      }
    },
    'v2': {
      transformResponse: (body: any) => {
        // v2 format - modern field names (no transformation needed)
        return body;
      }
    }
  },
  
  // Example: Audit logs endpoint transformers
  'audit-logs': {
    'v1': {
      transformResponse: (body: any) => {
        // v1 format - simplified structure
        if (body.logs) {
          body.logs = body.logs.map((log: any) => ({
            id: log.id,
            user: log.userEmail,
            action: log.action,
            timestamp: log.timestamp,
            // Omit detailed fields in v1
          }));
        }
        return body;
      }
    },
    'v2': {
      transformResponse: (body: any) => {
        // v2 format - full structure with all fields
        return body;
      }
    }
  }
};

/**
 * Apply version-specific transformations
 */
export function applyVersionTransformation(
  endpoint: string,
  data: any,
  version: string,
  type: 'request' | 'response'
): any {
  const endpointTransformers = VERSION_TRANSFORMERS[endpoint];
  if (!endpointTransformers) {
    return data;
  }

  const versionTransformer = endpointTransformers[version];
  if (!versionTransformer) {
    return data;
  }

  const transformer = type === 'request' 
    ? versionTransformer.transformRequest 
    : versionTransformer.transformResponse;

  if (!transformer) {
    return data;
  }

  return transformer(data, version);
}

/**
 * Version-aware endpoint handler wrapper
 */
export function withVersionTransformation(
  endpoint: string,
  handler: (event: APIGatewayProxyEvent, version: string) => Promise<APIGatewayProxyResult>
) {
  return async (event: APIGatewayProxyEvent, version: string): Promise<APIGatewayProxyResult> => {
    // Transform request if needed
    if (event.body) {
      try {
        const requestBody = JSON.parse(event.body);
        const transformedBody = applyVersionTransformation(endpoint, requestBody, version, 'request');
        event.body = JSON.stringify(transformedBody);
      } catch (error) {
        console.error('Request transformation error:', error);
      }
    }

    // Execute handler
    const response = await handler(event, version);

    // Transform response if needed
    if (response.body && response.statusCode >= 200 && response.statusCode < 300) {
      try {
        const responseBody = JSON.parse(response.body);
        const transformedBody = applyVersionTransformation(endpoint, responseBody, version, 'response');
        response.body = JSON.stringify(transformedBody);
      } catch (error) {
        console.error('Response transformation error:', error);
      }
    }

    return response;
  };
}

/**
 * Get API version compatibility matrix
 */
export function getVersionCompatibility(): Record<string, any> {
  return {
    versions: API_VERSIONS,
    defaultVersion: DEFAULT_API_VERSION,
    supportedVersions: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isSupported),
    deprecatedVersions: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isDeprecated),
    versioningMethods: [
      'X-API-Version header (recommended)',
      'version query parameter',
      'path versioning (/admin/v1/...)',
      'Accept header content negotiation'
    ],
    migrationPaths: Object.entries(API_VERSIONS)
      .filter(([_, version]) => version.migrationGuide)
      .map(([key, version]) => ({
        version: key,
        migrationGuide: version.migrationGuide,
        sunsetDate: version.sunsetDate
      }))
  };
}

/**
 * Middleware to add version compatibility info to responses
 */
export function withVersionInfo(handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) {
  return async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    const response = await handler(event);
    
    // Add version info to successful responses
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        const body = JSON.parse(response.body);
        body._version = {
          current: extractApiVersion(event),
          supported: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isSupported),
          deprecated: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].isDeprecated)
        };
        response.body = JSON.stringify(body);
      } catch (error) {
        console.error('Version info addition error:', error);
      }
    }

    return response;
  };
}