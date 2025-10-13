/**
 * Local development server for Finance Service
 * Provides Express.js wrapper around Lambda functions for local development
 */

import express from 'express';
import cors from 'cors';
import { handler as financeHandler } from './index';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const app = express();
const PORT = process.env.SERVICE_PORT || 3003;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'finance-service',
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

// Handle all finance service routes
app.all('/finance/*', async (req, res) => {
  try {
    const event = createLambdaEvent(req);

    const result = await financeHandler(event) as APIGatewayProxyResult;
    
    res.status(result.statusCode);
    
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    
    res.send(result.body);
  } catch (error) {
    console.error('Finance service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all for finance routes without /finance prefix
app.all('*', async (req, res) => {
  // Create a modified event with the new path
  const modifiedReq = { ...req, path: `/finance${req.path}`, url: `/finance${req.path}` };
  
  try {
    const event = createLambdaEvent(modifiedReq as express.Request);

    const result = await financeHandler(event) as APIGatewayProxyResult;
    
    res.status(result.statusCode);
    
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    
    res.send(result.body);
  } catch (error) {
    console.error('Finance service error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Finance Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Service URL: http://localhost:${PORT}`);
  console.log(`🔗 Custom Domain: https://finance.local.harborlist.com`);
});