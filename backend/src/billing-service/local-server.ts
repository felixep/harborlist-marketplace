/**
 * Local development server for Billing Service
 * Provides Express.js wrapper around Lambda functions for local development
 */

import express from 'express';
import cors from 'cors';
import { handler as billingHandler } from './index';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const app = express();
const PORT = process.env.SERVICE_PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'https://local.harborlist.com',
    'http://local.harborlist.com:3000', 
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'billing-service',
    timestamp: new Date().toISOString() 
  });
});

// Convert Express request to Lambda event
const createLambdaEvent = (req: express.Request): APIGatewayProxyEvent => {
  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: req.params,
    queryStringParameters: req.query as { [name: string]: string },
    headers: req.headers as { [name: string]: string },
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    requestContext: {
      requestId: `local-${Date.now()}`,
      stage: 'local',
      httpMethod: req.method,
      path: req.path,
      protocol: 'HTTP/1.1',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      resourceId: 'local',
      resourcePath: req.path,
      accountId: 'local',
      apiId: 'local',
      identity: {
        sourceIp: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null
      },
      authorizer: null
    },
    resource: req.path,
    stageVariables: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null
  };
};

// Handle all billing service routes
app.all('/billing/*', async (req, res) => {
  try {
    const event = createLambdaEvent(req);

    const result = await billingHandler(event) as APIGatewayProxyResult;
    
    res.status(result.statusCode);
    
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    
    res.send(result.body);
  } catch (error) {
    console.error('Billing service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all for billing routes without /billing prefix
app.all('*', async (req, res) => {
  // Create a modified event with the new path
  const modifiedReq = { ...req, path: `/billing${req.path}`, url: `/billing${req.path}` };
  
  try {
    const event = createLambdaEvent(modifiedReq as express.Request);

    const result = await billingHandler(event) as APIGatewayProxyResult;
    
    res.status(result.statusCode);
    
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    
    res.send(result.body);
  } catch (error) {
    console.error('Billing service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Billing Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Service URL: http://localhost:${PORT}`);
  console.log(`🔗 Custom Domain: https://billing.local.harborlist.com`);
});