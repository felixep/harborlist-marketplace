import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-jwt-token',
      ...overrides.headers
    },
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/admin/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      path: '/admin/test',
      accountId: '123456789012',
      resourceId: 'us4z18',
      httpMethod: 'GET',
      resourcePath: '/admin/test',
      apiId: 'test-api-id',
      protocol: 'HTTP/1.1',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '192.168.1.1',
        user: null,
        userAgent: 'Mozilla/5.0 Test Browser',
        userArn: null,
        clientCert: null
      },
      authorizer: null
    },
    resource: '/admin/test',
    ...overrides
  };
}

export function createMockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2024/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {}
  };
}

export function createMockAdminUser(overrides: any = {}) {
  return {
    sub: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'ADMIN',
    permissions: ['user_management', 'content_moderation', 'analytics_view'],
    sessionId: 'session-123',
    deviceId: 'device-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides
  };
}

export function createMockDynamoDBResponse(items: any[] = [], count?: number) {
  return {
    Items: items,
    Count: count ?? items.length,
    ScannedCount: count ?? items.length
  };
}

export function createMockAuditLog(overrides: any = {}) {
  return {
    id: 'audit-123',
    userId: 'admin-1',
    userEmail: 'admin@test.com',
    action: 'TEST_ACTION',
    resource: 'test',
    resourceId: 'test-123',
    details: { test: true },
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser',
    sessionId: 'session-123',
    ...overrides
  };
}

export function createMockSession(overrides: any = {}) {
  return {
    sessionId: 'session-123',
    userId: 'admin-1',
    deviceId: 'device-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser',
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true,
    ...overrides
  };
}

export function createMockUser(overrides: any = {}) {
  return {
    id: 'user-123',
    email: 'user@test.com',
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

export function createMockListing(overrides: any = {}) {
  return {
    listingId: 'listing-123',
    ownerId: 'user-123',
    title: 'Test Boat',
    description: 'A test boat listing',
    price: 50000,
    status: 'active',
    location: {
      city: 'Miami',
      state: 'FL',
      zipCode: '33101'
    },
    boatDetails: {
      type: 'Sailboat',
      year: 2020,
      length: 30,
      condition: 'Excellent'
    },
    features: ['GPS', 'Autopilot'],
    images: ['image1.jpg'],
    thumbnails: ['thumb1.jpg'],
    views: 100,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

export function expectValidApiResponse(response: any, expectedStatusCode: number = 200) {
  expect(response).toBeDefined();
  expect(response.statusCode).toBe(expectedStatusCode);
  expect(response.headers).toBeDefined();
  expect(response.body).toBeDefined();
  
  if (response.body) {
    expect(() => JSON.parse(response.body)).not.toThrow();
  }
}

export function expectErrorResponse(response: any, expectedCode: string, expectedStatusCode: number = 400) {
  expectValidApiResponse(response, expectedStatusCode);
  
  const body = JSON.parse(response.body);
  expect(body.error).toBeDefined();
  expect(body.error.code).toBe(expectedCode);
  expect(body.error.message).toBeDefined();
  expect(body.error.requestId).toBeDefined();
}

export function expectSuccessResponse(response: any, expectedStatusCode: number = 200) {
  expectValidApiResponse(response, expectedStatusCode);
  
  const body = JSON.parse(response.body);
  expect(body.error).toBeUndefined();
}

export class MockRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  checkLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    let record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      this.requests.set(identifier, record);
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  reset() {
    this.requests.clear();
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateMockJWT(payload: any = {}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const defaultPayload = {
    sub: 'admin-1',
    email: 'admin@test.com',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const finalPayload = { ...defaultPayload, ...payload };

  // Simple mock JWT (not cryptographically secure, for testing only)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(finalPayload)).toString('base64url');
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}