# 📊 Performance Testing & Optimization

## 📋 **Overview**

The HarborList performance framework ensures optimal user experience through comprehensive testing, monitoring, and optimization strategies. Our performance targets prioritize fast load times, responsive interactions, and efficient resource utilization across all platform components.

---

## 🎯 **Performance Targets & SLAs**

### **Service Level Objectives (SLOs)**

| Metric | Target | Measurement | Impact |
|--------|--------|-------------|---------|
| **Page Load Time** | < 2 seconds | 95th percentile | User Experience |
| **API Response Time** | < 500ms | 95th percentile | Application Performance |
| **Search Results** | < 1 second | 95th percentile | Core Functionality |
| **Image Upload** | < 10 seconds | 95th percentile | User Workflow |
| **Database Queries** | < 100ms | 95th percentile | System Efficiency |
| **Uptime** | 99.9% | Monthly | Service Availability |

### **Performance Budgets**

#### **Frontend Performance Budgets**
```typescript
// Performance Budget Configuration
export const PERFORMANCE_BUDGETS = {
  // Bundle Size Budgets
  javascript: {
    initial: '150KB',      // Initial bundle size
    vendor: '200KB',       // Third-party libraries
    chunks: '50KB',        // Individual code chunks
  },
  
  // Asset Budgets
  images: {
    hero: '100KB',         // Hero/banner images
    thumbnail: '20KB',     // Listing thumbnails
    avatar: '10KB',        // User avatars
  },
  
  // Runtime Budgets
  timing: {
    firstContentfulPaint: 1500,    // 1.5s
    largestContentfulPaint: 2500,   // 2.5s
    firstInputDelay: 100,           // 100ms
    cumulativeLayoutShift: 0.1,     // 0.1 score
  },
  
  // Network Budgets
  requests: {
    initial: 30,           // Initial page requests
    total: 100,            // Total requests per session
  },
};

// Budget Enforcement
export class PerformanceBudgetMonitor {
  static validateBundleSize(bundlePath: string, budget: string): boolean {
    const stats = fs.statSync(bundlePath);
    const sizeKB = stats.size / 1024;
    const budgetKB = parseInt(budget.replace('KB', ''));
    
    if (sizeKB > budgetKB) {
      console.error(`Bundle size exceeded: ${sizeKB}KB > ${budgetKB}KB`);
      return false;
    }
    
    return true;
  }

  static async validateWebVitals(url: string): Promise<WebVitalsResult> {
    const { loadPage, startFlow } = await import('lighthouse');
    
    const flow = await startFlow(await loadPage(url));
    await flow.navigate(url);
    
    const report = await flow.generateReport();
    const metrics = this.extractWebVitals(report);
    
    return {
      fcp: metrics.firstContentfulPaint,
      lcp: metrics.largestContentfulPaint,
      fid: metrics.firstInputDelay,
      cls: metrics.cumulativeLayoutShift,
      passed: this.validateMetrics(metrics),
    };
  }
}
```

---

## 🔬 **Load Testing Strategy**

### **K6 Performance Tests**

```typescript
// K6 Load Testing Configuration
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchLatency = new Trend('search_latency');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    search_latency: ['p(95)<1000'],    // Search under 1s
  },
  
  // Environment-specific settings
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:us:portland': { loadZone: 'amazon:us:portland', percent: 25 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 25 },
      },
    },
  },
};

// Test scenarios
export default function() {
  const baseURL = __ENV.API_BASE_URL || 'https://api.harborlist.com';
  
  // Simulate user journey
  group('User Registration Flow', () => {
    const registrationResult = testUserRegistration(baseURL);
    check(registrationResult, {
      'registration successful': (r) => r.status === 201,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
  });
  
  group('Listing Search Flow', () => {
    const searchResult = testListingSearch(baseURL);
    check(searchResult, {
      'search successful': (r) => r.status === 200,
      'search time < 1s': (r) => r.timings.duration < 1000,
      'results returned': (r) => JSON.parse(r.body).data.listings.length > 0,
    });
    
    searchLatency.add(searchResult.timings.duration);
  });
  
  group('Listing Detail Flow', () => {
    const detailResult = testListingDetail(baseURL);
    check(detailResult, {
      'detail load successful': (r) => r.status === 200,
      'detail time < 500ms': (r) => r.timings.duration < 500,
    });
  });
  
  // Track errors
  errorRate.add(false); // Assuming success, adjust based on checks
  apiCalls.add(1);
  
  sleep(1); // Think time between requests
}

function testUserRegistration(baseURL: string) {
  const userData = {
    email: `test${Math.random()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };
  
  return http.post(`${baseURL}/api/v1/auth/register`, JSON.stringify(userData), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function testListingSearch(baseURL: string) {
  const searchParams = {
    q: 'sailboat',
    minPrice: '50000',
    maxPrice: '200000',
    page: '1',
    limit: '20',
  };
  
  const queryString = Object.entries(searchParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
    
  return http.get(`${baseURL}/api/v1/listings?${queryString}`);
}

function testListingDetail(baseURL: string) {
  // Use a known test listing ID
  const listingId = 'test_listing_123';
  return http.get(`${baseURL}/api/v1/listings/${listingId}`);
}

// Stress Testing Scenario
export function stressTest() {
  const baseURL = __ENV.API_BASE_URL || 'https://api.harborlist.com';
  
  // High-intensity requests
  for (let i = 0; i < 10; i++) {
    const responses = http.batch([
      ['GET', `${baseURL}/api/v1/listings`],
      ['GET', `${baseURL}/api/v1/listings?q=boat`],
      ['GET', `${baseURL}/api/v1/listings?boatType=sailboat`],
    ]);
    
    responses.forEach((response, index) => {
      check(response, {
        [`batch request ${index} successful`]: (r) => r.status === 200,
        [`batch request ${index} fast`]: (r) => r.timings.duration < 1000,
      });
    });
  }
}
```

### **Database Performance Testing**

```typescript
// DynamoDB Performance Testing
export class DynamoDBPerformanceTester {
  private dynamoDb: DynamoDBClient;
  private metrics: PerformanceMetrics;

  constructor() {
    this.dynamoDb = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.metrics = new PerformanceMetrics();
  }

  async testReadPerformance(iterations = 1000): Promise<TestResults> {
    const results: number[] = [];
    const errors: string[] = [];

    console.log(`Testing DynamoDB read performance with ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.dynamoDb.send(new GetItemCommand({
          TableName: process.env.DYNAMODB_TABLE,
          Key: marshall({
            PK: `LISTING#test_listing_${Math.floor(Math.random() * 1000)}`,
            SK: 'METADATA',
          }),
        }));
        
        const duration = performance.now() - startTime;
        results.push(duration);
      } catch (error) {
        errors.push(error.message);
      }
      
      // Small delay to avoid throttling
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return this.analyzeResults('DynamoDB Read', results, errors);
  }

  async testWritePerformance(iterations = 500): Promise<TestResults> {
    const results: number[] = [];
    const errors: string[] = [];

    console.log(`Testing DynamoDB write performance with ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const testId = `perf_test_${Date.now()}_${i}`;
      
      try {
        await this.dynamoDb.send(new PutItemCommand({
          TableName: process.env.DYNAMODB_TABLE,
          Item: marshall({
            PK: `LISTING#${testId}`,
            SK: 'METADATA',
            Type: 'Listing',
            title: `Performance Test Listing ${i}`,
            price: Math.floor(Math.random() * 200000) + 50000,
            createdAt: new Date().toISOString(),
          }),
        }));
        
        const duration = performance.now() - startTime;
        results.push(duration);
      } catch (error) {
        errors.push(error.message);
      }
    }

    // Cleanup test data
    await this.cleanupTestData(iterations);

    return this.analyzeResults('DynamoDB Write', results, errors);
  }

  async testQueryPerformance(iterations = 500): Promise<TestResults> {
    const results: number[] = [];
    const errors: string[] = [];

    console.log(`Testing DynamoDB query performance with ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.dynamoDb.send(new QueryCommand({
          TableName: process.env.DYNAMODB_TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: marshall({
            ':pk': `USER#test_user_${Math.floor(Math.random() * 100)}`,
          }),
          Limit: 20,
        }));
        
        const duration = performance.now() - startTime;
        results.push(duration);
      } catch (error) {
        errors.push(error.message);
      }
    }

    return this.analyzeResults('DynamoDB Query', results, errors);
  }

  private analyzeResults(testType: string, results: number[], errors: string[]): TestResults {
    const sorted = results.sort((a, b) => a - b);
    const total = results.length;
    
    const analysis = {
      testType,
      totalRequests: total,
      successfulRequests: results.length,
      failedRequests: errors.length,
      errorRate: (errors.length / (total + errors.length)) * 100,
      
      // Timing metrics (in milliseconds)
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      mean: results.reduce((a, b) => a + b, 0) / results.length || 0,
      median: sorted[Math.floor(sorted.length / 2)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      
      // Performance assessment
      passed: this.evaluatePerformance(testType, sorted),
      
      errors: errors.slice(0, 10), // First 10 errors
    };

    this.logResults(analysis);
    return analysis;
  }

  private evaluatePerformance(testType: string, sortedResults: number[]): boolean {
    const p95 = sortedResults[Math.floor(sortedResults.length * 0.95)] || 0;
    
    const thresholds = {
      'DynamoDB Read': 50,    // 50ms for reads
      'DynamoDB Write': 100,  // 100ms for writes
      'DynamoDB Query': 75,   // 75ms for queries
    };
    
    return p95 <= (thresholds[testType] || 100);
  }

  private logResults(results: TestResults): void {
    console.log(`\n📊 ${results.testType} Performance Results:`);
    console.log(`Total Requests: ${results.totalRequests}`);
    console.log(`Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`Mean Response Time: ${results.mean.toFixed(2)}ms`);
    console.log(`Median Response Time: ${results.median.toFixed(2)}ms`);
    console.log(`95th Percentile: ${results.p95.toFixed(2)}ms`);
    console.log(`99th Percentile: ${results.p99.toFixed(2)}ms`);
    console.log(`Performance Passed: ${results.passed ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Sample Errors:`, results.errors.slice(0, 3));
    }
  }
}
```

---

## 🎯 **Frontend Performance Optimization**

### **React Performance Patterns**

```typescript
// Performance-Optimized Component Patterns
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { VirtualList } from '@tanstack/react-virtual';

// Memoized Listing Card for Large Lists
export const ListingCard = memo<ListingCardProps>(({ 
  listing, 
  onFavorite, 
  onContact 
}) => {
  // Memoize expensive calculations
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: listing.currency || 'USD',
    }).format(listing.price);
  }, [listing.price, listing.currency]);

  // Memoize event handlers to prevent re-renders
  const handleFavorite = useCallback(() => {
    onFavorite(listing.id);
  }, [listing.id, onFavorite]);

  const handleContact = useCallback(() => {
    onContact(listing.id);
  }, [listing.id, onContact]);

  // Lazy load images with intersection observer
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setImageLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="listing-card bg-white rounded-lg shadow-md overflow-hidden">
      <div ref={imageRef} className="relative h-48 bg-gray-200">
        {imageLoaded ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onLoad={() => {
              // Track image load performance
              performance.mark('image-loaded');
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="animate-pulse text-blue-400">Loading...</div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {listing.title}
        </h3>
        <p className="text-2xl font-bold text-green-600 mb-2">
          {formattedPrice}
        </p>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {listing.description}
        </p>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {listing.location.city}, {listing.location.state}
          </span>
          
          <div className="flex space-x-2">
            <button
              onClick={handleFavorite}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Add to favorites"
            >
              <HeartIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleContact}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Virtualized List for Large Datasets
export const VirtualizedListings: React.FC<VirtualizedListingsProps> = ({
  listings,
  onLoadMore,
  hasMore,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated card height
    overscan: 5, // Render 5 items outside viewport
  });

  // Infinite scroll detection
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (
      hasMore &&
      items.length > 0 &&
      items[items.length - 1].index >= listings.length - 5
    ) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), listings.length, hasMore, onLoadMore]);

  return (
    <div
      ref={parentRef}
      className="h-screen overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const listing = listings[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ListingCard listing={listing} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Code Splitting with Route-based Lazy Loading
const HomePage = lazy(() => import('../pages/HomePage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const ListingDetailPage = lazy(() => import('../pages/ListingDetailPage'));
const CreateListingPage = lazy(() => import('../pages/CreateListingPage'));

// Performance-optimized Router
export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/create" element={<CreateListingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
```

### **Image Optimization Strategy**

```typescript
// Advanced Image Optimization Service
export class ImageOptimizationService {
  private cloudfront: CloudFrontClient;
  private s3: S3Client;

  constructor() {
    this.cloudfront = new CloudFrontClient({ region: process.env.AWS_REGION });
    this.s3 = new S3Client({ region: process.env.AWS_REGION });
  }

  // Generate responsive image URLs with CloudFront
  generateResponsiveImageUrls(originalUrl: string, breakpoints: number[] = [400, 800, 1200]): ResponsiveImages {
    const baseUrl = originalUrl.replace(/(\.[\w\d_-]+)$/i, '');
    const extension = originalUrl.match(/\.[\w\d_-]+$/i)?.[0] || '.jpg';
    
    const images: ResponsiveImages = {
      original: originalUrl,
      webp: {},
      jpeg: {},
    };

    breakpoints.forEach(width => {
      // WebP format for modern browsers
      images.webp[width] = `${baseUrl}_${width}w.webp`;
      
      // JPEG fallback
      images.jpeg[width] = `${baseUrl}_${width}w${extension}`;
    });

    return images;
  }

  // Progressive Image Component
  ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    alt,
    className,
    sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  }) => {
    const [loaded, setLoaded] = useState(false);
    const [imageUrls, setImageUrls] = useState<ResponsiveImages | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const urls = this.generateResponsiveImageUrls(src);
      setImageUrls(urls);
    }, [src]);

    // Intersection Observer for lazy loading
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && imgRef.current && !loaded) {
            setLoaded(true);
            observer.disconnect();
          }
        },
        { rootMargin: '50px' }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, [loaded]);

    if (!imageUrls) {
      return <div className={`bg-gray-200 animate-pulse ${className}`} />;
    }

    return (
      <div ref={imgRef} className={`relative ${className}`}>
        {/* Low-quality placeholder */}
        <img
          src={`${src}?w=20&q=20`}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover filter blur-sm transition-opacity duration-300 ${
            loaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
        
        {/* High-quality image */}
        {loaded && (
          <picture>
            <source
              type="image/webp"
              srcSet={`
                ${imageUrls.webp[400]} 400w,
                ${imageUrls.webp[800]} 800w,
                ${imageUrls.webp[1200]} 1200w
              `}
              sizes={sizes}
            />
            <source
              type="image/jpeg"
              srcSet={`
                ${imageUrls.jpeg[400]} 400w,
                ${imageUrls.jpeg[800]} 800w,
                ${imageUrls.jpeg[1200]} 1200w
              `}
              sizes={sizes}
            />
            <img
              src={imageUrls.original}
              alt={alt}
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => {
                // Performance tracking
                performance.mark('image-fully-loaded');
              }}
            />
          </picture>
        )}
      </div>
    );
  };
}
```

---

## 📈 **Performance Monitoring**

### **Real User Monitoring (RUM)**

```typescript
// Performance Monitoring Service
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observer: PerformanceObserver;

  constructor() {
    this.initializeRUM();
    this.setupWebVitalsTracking();
    this.setupCustomMetrics();
  }

  private initializeRUM(): void {
    // Track navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
      this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      this.recordMetric('first_byte', navigation.responseStart - navigation.fetchStart);
    });

    // Track resource timing
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          this.trackResourcePerformance(resource);
        }
      });
    });

    this.observer.observe({ entryTypes: ['resource'] });
  }

  private setupWebVitalsTracking(): void {
    // Core Web Vitals tracking
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => this.sendWebVital('CLS', metric));
      getFID((metric) => this.sendWebVital('FID', metric));
      getFCP((metric) => this.sendWebVital('FCP', metric));
      getLCP((metric) => this.sendWebVital('LCP', metric));
      getTTFB((metric) => this.sendWebVital('TTFB', metric));
    });
  }

  private setupCustomMetrics(): void {
    // Track API response times
    this.interceptFetch();
    
    // Track user interactions
    this.trackUserInteractions();
    
    // Track memory usage
    this.trackMemoryUsage();
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo, init?: RequestInit) => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.url;
      
      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;
        
        this.recordMetric('api_response_time', duration);
        this.recordAPIMetric(url, duration, response.status);
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordAPIMetric(url, duration, 0, error);
        throw error;
      }
    };
  }

  private trackUserInteractions(): void {
    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const startTime = performance.now();
        
        // Track interaction to next paint
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const duration = performance.now() - startTime;
            this.recordMetric('interaction_response', duration);
          });
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formType = form.dataset.formType || 'unknown';
      
      performance.mark(`form-submit-start-${formType}`);
    });
  }

  private trackMemoryUsage(): void {
    // Track memory usage periodically
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize);
        this.recordMetric('memory_total', memory.totalJSHeapSize);
        this.recordMetric('memory_limit', memory.jsHeapSizeLimit);
      }
    }, 30000); // Every 30 seconds
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(value);
    
    // Send to analytics service
    this.sendToAnalytics(name, value);
  }

  private sendWebVital(name: string, metric: any): void {
    const { value, id, name: metricName } = metric;
    
    // Send to monitoring service
    this.sendToAnalytics(`web_vital_${name.toLowerCase()}`, value, {
      id,
      name: metricName,
      rating: this.getWebVitalRating(name, value),
    });
  }

  private getWebVitalRating(metric: string, value: number): string {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private async sendToAnalytics(metric: string, value: number, metadata?: any): Promise<void> {
    try {
      await fetch('/api/v1/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata,
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  // Performance Budget Alerts
  checkPerformanceBudgets(): void {
    const budgets = PERFORMANCE_BUDGETS.timing;
    
    Object.entries(budgets).forEach(([metric, threshold]) => {
      const values = this.metrics.get(metric);
      if (values && values.length > 0) {
        const latest = values[values.length - 1];
        
        if (latest > threshold) {
          console.warn(`Performance budget exceeded for ${metric}: ${latest}ms > ${threshold}ms`);
          
          // Send alert
          this.sendPerformanceAlert(metric, latest, threshold);
        }
      }
    });
  }

  private sendPerformanceAlert(metric: string, actual: number, threshold: number): void {
    // Send to monitoring service
    fetch('/api/v1/alerts/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PERFORMANCE_BUDGET_EXCEEDED',
        metric,
        actual,
        threshold,
        severity: actual > threshold * 1.5 ? 'HIGH' : 'MEDIUM',
        url: window.location.href,
      }),
    }).catch(console.error);
  }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export { performanceMonitor };
```

---

## 🔗 **Related Documentation**

- **📊 [Monitoring & Observability](../monitoring/README.md)**: Infrastructure monitoring and alerting
- **🧪 [Testing Strategy](../testing/README.md)**: Performance testing implementation
- **⚛️ [Frontend Optimization](../frontend/README.md)**: Frontend performance patterns
- **🔧 [Backend Performance](../backend/README.md)**: Server-side optimization strategies
- **☁️ [Infrastructure Optimization](../operations/README.md)**: AWS infrastructure tuning

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 Performance Team**: HarborList Performance Engineering Team  
**🔄 Next Review**: January 2026