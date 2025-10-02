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

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://local.harborlist.com:3000', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Wrapper function to convert Lambda handlers to Express middleware
 * Handles the conversion between Express req/res and Lambda event/context
 */
const lambdaToExpress = (handlerModule: string, handlerName: string = 'handler') => {
  return async (req: Request, res: Response) => {
    try {
      // Import handler dynamically for hot reload
      delete require.cache[require.resolve(handlerModule)];
      const { [handlerName]: handler } = require(handlerModule);

      // Convert Express request to Lambda event
      const event = {
        httpMethod: req.method,
        path: req.path,
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
app.use('/api/listings', lambdaToExpress('./listing-service'));
app.use('/api/search', lambdaToExpress('./search'));
app.use('/api/media', lambdaToExpress('./media'));
app.use('/api/email', lambdaToExpress('./email'));
app.use('/api/admin', lambdaToExpress('./admin-service'));
app.use('/api/stats', lambdaToExpress('./stats-service'));

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
      '/api/stats',
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