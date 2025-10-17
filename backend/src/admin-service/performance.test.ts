import { performance } from 'perf_hooks';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './index';
import { createMockEvent, createMockContext } from '../shared/test-utils';

describe('Admin Service Performance Tests', () => {
  let mockContext: Context;
  const validToken = 'Bearer valid-admin-token';

  beforeEach(() => {
    mockContext = createMockContext();
    // JWT_SECRET no longer needed - using Cognito token verification
    process.env.ADMIN_TABLE = 'test-admin-table';
    process.env.AUDIT_TABLE = 'test-audit-table';
  });

  describe('Response Time Performance', () => {
    it('should respond to dashboard requests within 200ms', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/dashboard',
        headers: {
          'Authorization': validToken
        }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to user list requests within 300ms', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '20'
        },
        headers: {
          'Authorization': validToken
        }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(300);
    });

    it('should respond to audit log requests within 500ms', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/audit-logs',
        queryStringParameters: {
          page: '1',
          limit: '50'
        },
        headers: {
          'Authorization': validToken
        }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent dashboard requests efficiently', async () => {
      const requests = Array(10).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: {
            'Authorization': validToken
          }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(200);
      });

      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(1000); // 1 second for 10 concurrent requests
    });

    it('should handle 50 concurrent user list requests', async () => {
      const requests = Array(50).fill(null).map((_, index) => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/users',
          queryStringParameters: {
            page: String(Math.floor(index / 20) + 1),
            limit: '20'
          },
          headers: {
            'Authorization': validToken
          }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(200);
      });

      // Average response time should be reasonable
      const averageTime = totalTime / 50;
      expect(averageTime).toBeLessThan(100); // Average 100ms per request
    });

    it('should handle mixed concurrent requests', async () => {
      const dashboardRequests = Array(20).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': validToken }
        })
      );

      const userRequests = Array(20).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/users',
          queryStringParameters: { page: '1', limit: '20' },
          headers: { 'Authorization': validToken }
        })
      );

      const auditRequests = Array(10).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/audit-logs',
          queryStringParameters: { page: '1', limit: '50' },
          headers: { 'Authorization': validToken }
        })
      );

      const allRequests = [...dashboardRequests, ...userRequests, ...auditRequests];

      const startTime = performance.now();
      const results = await Promise.all(
        allRequests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(200);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 50 mixed requests
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();

      // Perform 100 requests
      for (let i = 0; i < 100; i++) {
        const mockEvent = createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': validToken }
        });

        await handler(mockEvent, mockContext);

        // Force garbage collection every 10 requests
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large response payloads efficiently', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '100' // Large page size
        },
        headers: { 'Authorization': validToken }
      });

      const initialMemory = process.memoryUsage();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const finalMemory = process.memoryUsage();

      expect(result.statusCode).toBe(200);
      
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      // Should not use excessive memory for large responses
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize user queries with proper pagination', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '20',
          search: 'john'
        },
        headers: { 'Authorization': validToken }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      // Search queries should be fast with proper indexing
      expect(queryTime).toBeLessThan(250);
    });

    it('should handle complex audit log queries efficiently', async () => {
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/audit-logs',
        queryStringParameters: {
          page: '1',
          limit: '50',
          userId: 'admin-123',
          action: 'user_suspended',
          startDate: '2024-09-01T00:00:00Z',
          endDate: '2024-09-28T23:59:59Z'
        },
        headers: { 'Authorization': validToken }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      // Complex queries should still be reasonably fast
      expect(queryTime).toBeLessThan(400);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should efficiently handle rate limiting checks', async () => {
      const requests = Array(100).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': validToken },
          requestContext: {
            identity: {
              sourceIp: '192.168.1.100'
            }
          }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Most requests should succeed (before rate limit)
      const successfulRequests = results.filter(
        result => (result as APIGatewayProxyResult).statusCode === 200
      );
      expect(successfulRequests.length).toBeGreaterThan(50);

      // Rate limiting should not significantly impact performance
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 100 requests
    });
  });

  describe('Authentication Performance', () => {
    it('should validate JWT tokens efficiently', async () => {
      const requests = Array(50).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': validToken }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(200);
      });

      // JWT validation should be fast
      const averageTime = totalTime / 50;
      expect(averageTime).toBeLessThan(50); // Average 50ms per request
    });

    it('should handle invalid tokens efficiently', async () => {
      const requests = Array(20).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': 'Bearer invalid-token' }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should fail with 401
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(401);
      });

      // Invalid token handling should be fast
      const averageTime = totalTime / 20;
      expect(averageTime).toBeLessThan(30); // Average 30ms per request
    });
  });

  describe('Stress Testing', () => {
    it('should handle high load without degradation', async () => {
      const requestCount = 200;
      const batchSize = 20;
      const batches = Math.ceil(requestCount / batchSize);
      
      const allResponseTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = Array(batchSize).fill(null).map(() => 
          createMockEvent({
            httpMethod: 'GET',
            path: '/admin/dashboard',
            headers: { 'Authorization': validToken }
          })
        );

        const batchStartTime = performance.now();
        const batchResults = await Promise.all(
          batchRequests.map(event => handler(event, mockContext))
        );
        const batchEndTime = performance.now();
        const batchTime = batchEndTime - batchStartTime;

        // All requests in batch should succeed
        batchResults.forEach(result => {
          expect((result as APIGatewayProxyResult).statusCode).toBe(200);
        });

        allResponseTimes.push(batchTime / batchSize);
      }

      // Calculate performance metrics
      const averageResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      const maxResponseTime = Math.max(...allResponseTimes);
      const minResponseTime = Math.min(...allResponseTimes);

      // Performance should remain consistent under load
      expect(averageResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(200);
      expect(maxResponseTime - minResponseTime).toBeLessThan(150); // Low variance
    });

    it('should recover gracefully from memory pressure', async () => {
      // Create large payloads to simulate memory pressure
      const largeRequests = Array(50).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/users',
          queryStringParameters: {
            page: '1',
            limit: '100'
          },
          headers: { 'Authorization': validToken }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(
        largeRequests.map(event => handler(event, mockContext))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed despite memory pressure
      results.forEach(result => {
        expect((result as APIGatewayProxyResult).statusCode).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 large requests

      // Memory should be released after requests
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      expect(finalMemory.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });

  describe('Cold Start Performance', () => {
    it('should handle cold start efficiently', async () => {
      // Simulate cold start by creating new context
      const coldStartContext = createMockContext();
      
      const mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/dashboard',
        headers: { 'Authorization': validToken }
      });

      const startTime = performance.now();
      const result = await handler(mockEvent, coldStartContext) as APIGatewayProxyResult;
      const endTime = performance.now();
      const coldStartTime = endTime - startTime;

      expect(result.statusCode).toBe(200);
      // Cold start should complete within reasonable time
      expect(coldStartTime).toBeLessThan(1000); // 1 second for cold start
    });

    it('should warm up efficiently after cold start', async () => {
      const warmUpRequests = Array(5).fill(null).map(() => 
        createMockEvent({
          httpMethod: 'GET',
          path: '/admin/dashboard',
          headers: { 'Authorization': validToken }
        })
      );

      const responseTimes: number[] = [];

      for (const event of warmUpRequests) {
        const startTime = performance.now();
        const result = await handler(event, mockContext) as APIGatewayProxyResult;
        const endTime = performance.now();
        
        expect(result.statusCode).toBe(200);
        responseTimes.push(endTime - startTime);
      }

      // Response times should improve after warm-up
      const firstRequestTime = responseTimes[0];
      const lastRequestTime = responseTimes[responseTimes.length - 1];
      
      expect(lastRequestTime).toBeLessThan(firstRequestTime * 0.8); // 20% improvement
    });
  });
});

// Performance benchmark utility
export class PerformanceBenchmark {
  private results: Array<{
    operation: string;
    responseTime: number;
    timestamp: number;
  }> = [];

  async benchmark<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    this.results.push({
      operation,
      responseTime,
      timestamp: Date.now()
    });

    return result;
  }

  getResults() {
    return this.results;
  }

  getAverageResponseTime(operation?: string): number {
    const filteredResults = operation 
      ? this.results.filter(r => r.operation === operation)
      : this.results;

    if (filteredResults.length === 0) return 0;

    const total = filteredResults.reduce((sum, r) => sum + r.responseTime, 0);
    return total / filteredResults.length;
  }

  getPercentile(percentile: number, operation?: string): number {
    const filteredResults = operation 
      ? this.results.filter(r => r.operation === operation)
      : this.results;

    if (filteredResults.length === 0) return 0;

    const sorted = filteredResults
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport(): string {
    const operations = [...new Set(this.results.map(r => r.operation))];
    
    let report = 'Performance Benchmark Report\n';
    report += '================================\n\n';

    operations.forEach(operation => {
      const avg = this.getAverageResponseTime(operation);
      const p50 = this.getPercentile(50, operation);
      const p95 = this.getPercentile(95, operation);
      const p99 = this.getPercentile(99, operation);

      report += `${operation}:\n`;
      report += `  Average: ${avg.toFixed(2)}ms\n`;
      report += `  P50: ${p50.toFixed(2)}ms\n`;
      report += `  P95: ${p95.toFixed(2)}ms\n`;
      report += `  P99: ${p99.toFixed(2)}ms\n\n`;
    });

    return report;
  }

  clear() {
    this.results = [];
  }
}