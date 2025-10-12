/**
 * Performance Testing Utilities
 * Helper functions for measuring and analyzing performance
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  operationCount?: number;
  throughput?: number; // operations per second
}

export class PerformanceMonitor {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private operationCount: number = 0;

  constructor() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
  }

  incrementOperations(count: number = 1): void {
    this.operationCount += count;
  }

  getMetrics(): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - this.startTime;

    return {
      startTime: this.startTime,
      endTime,
      duration,
      memoryUsage: {
        before: this.startMemory,
        after: endMemory,
        delta: {
          heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
          external: endMemory.external - this.startMemory.external,
          rss: endMemory.rss - this.startMemory.rss
        }
      },
      operationCount: this.operationCount,
      throughput: this.operationCount > 0 ? (this.operationCount / (duration / 1000)) : 0
    };
  }

  logMetrics(operation: string): void {
    const metrics = this.getMetrics();
    console.log(`\n=== Performance Metrics for ${operation} ===`);
    console.log(`Duration: ${metrics.duration}ms`);
    console.log(`Operations: ${metrics.operationCount}`);
    console.log(`Throughput: ${metrics.throughput?.toFixed(2)} ops/sec`);
    console.log(`Memory Delta: ${(metrics.memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`RSS Delta: ${(metrics.memoryUsage.delta.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log('=======================================\n');
  }
}

export async function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  expectedMaxDuration?: number
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const monitor = new PerformanceMonitor();
  
  try {
    const result = await operation();
    monitor.incrementOperations(1);
    
    const metrics = monitor.getMetrics();
    monitor.logMetrics(operationName);
    
    if (expectedMaxDuration && metrics.duration > expectedMaxDuration) {
      console.warn(`⚠️  ${operationName} took ${metrics.duration}ms, expected < ${expectedMaxDuration}ms`);
    }
    
    return { result, metrics };
  } catch (error) {
    const metrics = monitor.getMetrics();
    console.error(`❌ ${operationName} failed after ${metrics.duration}ms:`, error);
    throw error;
  }
}

export async function measureBatchPerformance<T>(
  operations: (() => Promise<T>)[],
  operationName: string,
  batchSize: number = 10
): Promise<{ results: T[]; metrics: PerformanceMetrics }> {
  const monitor = new PerformanceMonitor();
  const results: T[] = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
    monitor.incrementOperations(batch.length);
    
    console.log(`Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(operations.length / batchSize)}`);
  }
  
  const metrics = monitor.getMetrics();
  monitor.logMetrics(`${operationName} (${operations.length} operations)`);
  
  return { results, metrics };
}

export async function measureConcurrentPerformance<T>(
  operations: (() => Promise<T>)[],
  operationName: string,
  maxConcurrency: number = 10
): Promise<{ results: T[]; metrics: PerformanceMetrics }> {
  const monitor = new PerformanceMonitor();
  
  // Limit concurrency to avoid overwhelming the system
  const results: T[] = [];
  const executing: Promise<T>[] = [];
  
  for (const operation of operations) {
    const promise = operation().then(result => {
      monitor.incrementOperations(1);
      return result;
    });
    
    results.push(promise as any); // Will be resolved later
    executing.push(promise);
    
    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        if (await Promise.race([executing[i], Promise.resolve('__not_done__')]) !== '__not_done__') {
          executing.splice(i, 1);
        }
      }
    }
  }
  
  // Wait for all remaining operations
  const finalResults = await Promise.all(results);
  
  const metrics = monitor.getMetrics();
  monitor.logMetrics(`${operationName} (${operations.length} concurrent operations)`);
  
  return { results: finalResults, metrics };
}

export function createLoadTestData(count: number, generator: (index: number) => any): any[] {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(generator(i));
  }
  return data;
}

export class PerformanceAssertions {
  static assertDuration(metrics: PerformanceMetrics, maxDuration: number, operation: string): void {
    if (metrics.duration > maxDuration) {
      throw new Error(`${operation} took ${metrics.duration}ms, expected < ${maxDuration}ms`);
    }
  }

  static assertThroughput(metrics: PerformanceMetrics, minThroughput: number, operation: string): void {
    if (!metrics.throughput || metrics.throughput < minThroughput) {
      throw new Error(`${operation} throughput was ${metrics.throughput?.toFixed(2)} ops/sec, expected >= ${minThroughput} ops/sec`);
    }
  }

  static assertMemoryUsage(metrics: PerformanceMetrics, maxMemoryMB: number, operation: string): void {
    const memoryUsageMB = metrics.memoryUsage.delta.heapUsed / 1024 / 1024;
    if (memoryUsageMB > maxMemoryMB) {
      throw new Error(`${operation} used ${memoryUsageMB.toFixed(2)} MB, expected < ${maxMemoryMB} MB`);
    }
  }

  static assertPerformanceProfile(
    metrics: PerformanceMetrics,
    profile: {
      maxDuration?: number;
      minThroughput?: number;
      maxMemoryMB?: number;
    },
    operation: string
  ): void {
    if (profile.maxDuration) {
      this.assertDuration(metrics, profile.maxDuration, operation);
    }
    if (profile.minThroughput) {
      this.assertThroughput(metrics, profile.minThroughput, operation);
    }
    if (profile.maxMemoryMB) {
      this.assertMemoryUsage(metrics, profile.maxMemoryMB, operation);
    }
  }
}

export interface LoadTestConfig {
  userCount: number;
  operationsPerUser: number;
  rampUpTime: number; // milliseconds
  testDuration: number; // milliseconds
  maxConcurrency: number;
}

export class LoadTester {
  private config: LoadTestConfig;
  private monitor: PerformanceMonitor;
  private activeOperations: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.monitor = new PerformanceMonitor();
  }

  async runLoadTest<T>(
    operationFactory: (userIndex: number, operationIndex: number) => Promise<T>,
    testName: string
  ): Promise<{ results: T[]; metrics: PerformanceMetrics }> {
    console.log(`\n🚀 Starting load test: ${testName}`);
    console.log(`Users: ${this.config.userCount}`);
    console.log(`Operations per user: ${this.config.operationsPerUser}`);
    console.log(`Max concurrency: ${this.config.maxConcurrency}`);
    console.log(`Test duration: ${this.config.testDuration}ms\n`);

    const results: T[] = [];
    const startTime = Date.now();
    const endTime = startTime + this.config.testDuration;

    // Create all operations
    const operations: (() => Promise<T>)[] = [];
    for (let user = 0; user < this.config.userCount; user++) {
      for (let op = 0; op < this.config.operationsPerUser; op++) {
        operations.push(() => operationFactory(user, op));
      }
    }

    // Execute operations with controlled concurrency and ramp-up
    const rampUpDelay = this.config.rampUpTime / operations.length;
    let operationIndex = 0;

    while (Date.now() < endTime && operationIndex < operations.length) {
      if (this.activeOperations < this.config.maxConcurrency) {
        const operation = operations[operationIndex++];
        this.activeOperations++;

        operation()
          .then(result => {
            results.push(result);
            this.monitor.incrementOperations(1);
          })
          .catch(error => {
            console.error(`Operation failed:`, error);
          })
          .finally(() => {
            this.activeOperations--;
          });

        // Ramp up delay
        if (rampUpDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, rampUpDelay));
        }
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Wait for remaining operations to complete
    while (this.activeOperations > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const metrics = this.monitor.getMetrics();
    this.monitor.logMetrics(`Load Test: ${testName}`);

    return { results, metrics };
  }
}

export function generatePerformanceReport(
  testResults: Array<{ testName: string; metrics: PerformanceMetrics }>
): string {
  let report = '\n📊 PERFORMANCE TEST REPORT\n';
  report += '=' .repeat(50) + '\n\n';

  for (const { testName, metrics } of testResults) {
    report += `🔍 ${testName}\n`;
    report += `-`.repeat(30) + '\n';
    report += `Duration: ${metrics.duration}ms\n`;
    report += `Operations: ${metrics.operationCount}\n`;
    report += `Throughput: ${metrics.throughput?.toFixed(2)} ops/sec\n`;
    report += `Memory Usage: ${(metrics.memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
    report += `RSS Delta: ${(metrics.memoryUsage.delta.rss / 1024 / 1024).toFixed(2)} MB\n\n`;
  }

  // Summary statistics
  const totalDuration = testResults.reduce((sum, r) => sum + r.metrics.duration, 0);
  const totalOperations = testResults.reduce((sum, r) => sum + (r.metrics.operationCount || 0), 0);
  const avgThroughput = testResults.reduce((sum, r) => sum + (r.metrics.throughput || 0), 0) / testResults.length;
  const totalMemory = testResults.reduce((sum, r) => sum + r.metrics.memoryUsage.delta.heapUsed, 0);

  report += '📈 SUMMARY\n';
  report += '-'.repeat(20) + '\n';
  report += `Total Test Duration: ${totalDuration}ms\n`;
  report += `Total Operations: ${totalOperations}\n`;
  report += `Average Throughput: ${avgThroughput.toFixed(2)} ops/sec\n`;
  report += `Total Memory Usage: ${(totalMemory / 1024 / 1024).toFixed(2)} MB\n`;

  return report;
}