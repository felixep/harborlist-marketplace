#!/usr/bin/env node

/**
 * Local Development Server for HarborList Backend
 * 
 * This Express server wraps Lambda functions for local development,
 * providing the same API endpoints as production but with hot reload
 * and development-friendly features.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'https://local.harborlist.com',
      'http://local.harborlist.com:3000',
      'http://local.harborlist.com',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS: Blocked origin ${origin}`);
      callback(null, true); // Allow all for local development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
}));

// Additional CORS headers for all responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Wrapper function for directly imported handlers
 */
const lambdaToExpressSync = (handler: any) => {
  return async (req: Request, res: Response) => {
    try {
      // Convert Express request to Lambda event
      const event = {
        httpMethod: req.method,
        path: req.originalUrl, // Use originalUrl to preserve full path including /api/auth
        pathParameters: req.params,
        queryStringParameters: req.query,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : null,
        requestContext: {
          requestId: Math.random().toString(36).substring(7),
          identity: {
            sourceIp: req.ip,
            userAgent: req.get('User-Agent'),
          },
        },
      };

      const context = {
        requestId: event.requestContext.requestId,
        functionName: 'admin-service',
        getRemainingTimeInMillis: () => 30000,
      };

      // Call Lambda handler
      const result = await handler(event, context);

      // Convert Lambda response to Express response
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.set(key, value as string);
        });
      }

      res.status(result.statusCode || 200);
      
      if (result.body) {
        try {
          const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          res.json(body);
        } catch {
          res.send(result.body);
        }
      } else {
        res.end();
      }
    } catch (error: unknown) {
      console.error('Handler error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      });
    }
  };
};

/**
 * Wrapper function to convert Lambda handlers to Express middleware
 * Handles the conversion between Express req/res and Lambda event/context
 */
const lambdaToExpress = (handlerModule: string, handlerName: string = 'handler') => {
  return async (req: Request, res: Response) => {
    try {
      // Import handler dynamically for hot reload
      const modulePath = handlerModule.startsWith('./') ? handlerModule : `./${handlerModule}`;
      let fullPath;
      
      // Try to resolve with index.ts first, then fallback to direct module name
      try {
        fullPath = require.resolve(`${modulePath}/index.ts`);
      } catch {
        try {
          fullPath = require.resolve(`${modulePath}.ts`);
        } catch {
          fullPath = require.resolve(modulePath);
        }
      }
      
      delete require.cache[fullPath];
      
      // For TypeScript files, we need to use dynamic import since we're running with ts-node
      let handler;
      if (fullPath.endsWith('.ts')) {
        const module = await import(fullPath);
        handler = module[handlerName] || module.default?.[handlerName];
      } else {
        const module = require(fullPath);
        handler = module[handlerName];
      }
      
      if (!handler) {
        throw new Error(`Handler '${handlerName}' not found in module '${handlerModule}' (resolved to: ${fullPath})`);
      }

      // Parse JWT token for authentication (local development only)
      let authorizer = undefined;
      const authHeader = req.headers.authorization;
      console.log('[local-server] Auth header:', authHeader ? 'present' : 'missing');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          // Import JWT verification dynamically
          const { verifyToken } = await import('./shared/auth');
          const decoded = await verifyToken(token);
          console.log('[local-server] Token verified successfully for user:', decoded.sub);
          authorizer = {
            claims: {
              sub: decoded.sub,
              email: decoded.email,
              name: decoded.name,
              role: decoded.role,
              permissions: JSON.stringify(decoded.permissions || []),
              sessionId: decoded.sessionId,
              deviceId: decoded.deviceId,
            }
          };
        } catch (error) {
          console.log('[local-server] JWT token validation failed:', error instanceof Error ? error.message : 'Unknown error');
          // Continue without authorization context - let the handler decide if auth is required
        }
      }

      // Convert Express request to Lambda event
      const event = {
        httpMethod: req.method,
        path: req.originalUrl, // Use originalUrl to preserve full path including /api/auth
        pathParameters: req.params,
        queryStringParameters: req.query,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : null,
        requestContext: {
          requestId: Math.random().toString(36).substring(7),
          identity: {
            sourceIp: req.ip,
            userAgent: req.get('User-Agent'),
          },
          ...(authorizer && { authorizer }),
        },
      };

      const context = {
        requestId: event.requestContext.requestId,
        functionName: handlerName,
        getRemainingTimeInMillis: () => 30000,
      };

      // Call Lambda handler
      const result = await handler(event, context);

      // Convert Lambda response to Express response
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.set(key, value as string);
        });
      }

      res.status(result.statusCode || 200);
      
      if (result.body) {
        try {
          const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          res.json(body);
        } catch {
          res.send(result.body);
        }
      } else {
        res.end();
      }
    } catch (error: unknown) {
      console.error('Handler error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      });
    }
  };
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'local',
    services: {
      dynamodb: process.env.DYNAMODB_ENDPOINT,
      s3: process.env.S3_ENDPOINT,
      ses: process.env.SES_ENDPOINT,
    },
  });
});

// API Routes - dynamically load handlers
app.use('/api/auth', lambdaToExpress('./auth-service'));
// Note: slug route must come before :id route to avoid conflict
app.use('/api/listings/slug/:slug', lambdaToExpress('./listing'));
app.use('/api/listings/:id', lambdaToExpress('./listing'));
app.use('/api/listings', lambdaToExpress('./listing'));
app.use('/api/search', lambdaToExpress('./search'));
app.use('/api/media', lambdaToExpress('./media'));
app.use('/api/email', lambdaToExpress('./email'));
app.use('/api/admin/tiers', lambdaToExpress('./tier'));
app.use('/api/admin', lambdaToExpress('./admin-service'));
app.use('/api/analytics', lambdaToExpress('./analytics-service'));
app.use('/api/stats', lambdaToExpress('./analytics-service')); // Platform stats
app.use('/api/dealer', lambdaToExpress('./dealer-service')); // Dealer sub-account management

// Catch-all for undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      '/health',
      '/api/auth',
      '/api/listings',
      '/api/search',
      '/api/media',
      '/api/email',
      '/api/admin',
      '/api/analytics',
      '/api/stats',
      '/api/dealer',
    ],
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server
const server = createServer(app);

server.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
  console.log(`🚀 HarborList Local Development Server`);
  console.log(`📍 Server running on: http://local-api.harborlist.com:${PORT}`);
  console.log(`🏥 Health check: http://local-api.harborlist.com:${PORT}/health`);
  console.log(`🌐 Frontend URL: http://local.harborlist.com:3000`);
  console.log(`📊 DynamoDB Admin: http://localhost:8001`);
  console.log(`🛠️ LocalStack: http://localhost:4566`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;