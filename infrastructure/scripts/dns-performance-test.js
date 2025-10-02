#!/usr/bin/env node

/**
 * DNS Performance Testing Script
 * Tests DNS resolution from multiple locations and DNS servers
 */

const dns = require('dns').promises;
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  domains: [
    'dev.harborlist.com',
    'api-dev.harborlist.com',
    'harborlist.com'
  ],
  dnsServers: [
    { name: 'Cloudflare', servers: ['1.1.1.1', '1.0.0.1'] },
    { name: 'Google', servers: ['8.8.8.8', '8.8.4.4'] },
    { name: 'Quad9', servers: ['9.9.9.9', '149.112.112.112'] },
    { name: 'OpenDNS', servers: ['208.67.222.222', '208.67.220.220'] }
  ],
  iterations: 10,
  timeout: 5000
};

class DNSPerformanceTester {
  constructor() {
    this.results = [];
  }

  async resolveDNS(domain, dnsServer) {
    const resolver = new dns.Resolver();
    resolver.setServers([dnsServer]);
    
    const startTime = performance.now();
    try {
      const addresses = await resolver.resolve4(domain);
      const endTime = performance.now();
      
      return {
        success: true,
        addresses,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: error.message,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testDNSServer(domain, dnsServerConfig) {
    console.log(`  Testing ${dnsServerConfig.name} DNS servers...`);
    
    const serverResults = [];
    
    for (const server of dnsServerConfig.servers) {
      console.log(`    Server: ${server}`);
      
      const iterations = [];
      for (let i = 0; i < CONFIG.iterations; i++) {
        try {
          const result = await this.resolveDNS(domain, server);
          iterations.push(result);
          
          if (result.success) {
            console.log(`      Iteration ${i + 1}: ${result.responseTime.toFixed(2)}ms -> ${result.addresses.join(', ')}`);
          } else {
            console.log(`      Iteration ${i + 1}: Error - ${result.error}`);
          }
        } catch (error) {
          console.log(`      Iteration ${i + 1}: Exception - ${error.message}`);
          iterations.push({
            success: false,
            error: error.message,
            responseTime: -1,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      const successfulIterations = iterations.filter(i => i.success);
      const averageTime = successfulIterations.length > 0 
        ? successfulIterations.reduce((sum, i) => sum + i.responseTime, 0) / successfulIterations.length
        : -1;
      
      serverResults.push({
        server,
        iterations,
        successRate: (successfulIterations.length / CONFIG.iterations) * 100,
        averageResponseTime: averageTime,
        minResponseTime: successfulIterations.length > 0 ? Math.min(...successfulIterations.map(i => i.responseTime)) : -1,
        maxResponseTime: successfulIterations.length > 0 ? Math.max(...successfulIterations.map(i => i.responseTime)) : -1
      });
    }
    
    return {
      dnsProvider: dnsServerConfig.name,
      servers: serverResults,
      overallAverage: serverResults.reduce((sum, s) => sum + (s.averageResponseTime > 0 ? s.averageResponseTime : 0), 0) / serverResults.filter(s => s.averageResponseTime > 0).length
    };
  }

  async testDomain(domain) {
    console.log(`\n🌐 Testing DNS performance for: ${domain}`);
    console.log('='.repeat(50));
    
    const domainResults = [];
    
    for (const dnsServerConfig of CONFIG.dnsServers) {
      try {
        const result = await this.testDNSServer(domain, dnsServerConfig);
        domainResults.push(result);
      } catch (error) {
        console.error(`    Error testing ${dnsServerConfig.name}:`, error.message);
        domainResults.push({
          dnsProvider: dnsServerConfig.name,
          error: error.message,
          servers: [],
          overallAverage: -1
        });
      }
    }
    
    return {
      domain,
      results: domainResults,
      timestamp: new Date().toISOString()
    };
  }

  async runAllTests() {
    console.log('🧪 Starting DNS Performance Tests');
    console.log('Testing domains:', CONFIG.domains.join(', '));
    console.log('DNS Providers:', CONFIG.dnsServers.map(s => s.name).join(', '));
    console.log('Iterations per server:', CONFIG.iterations);
    
    const allResults = [];
    
    for (const domain of CONFIG.domains) {
      const domainResult = await this.testDomain(domain);
      allResults.push(domainResult);
      this.results.push(domainResult);
    }
    
    return this.generateReport();
  }

  generateReport() {
    const report = {
      testRun: {
        timestamp: new Date().toISOString(),
        domains: CONFIG.domains,
        dnsProviders: CONFIG.dnsServers.map(s => s.name),
        iterationsPerServer: CONFIG.iterations
      },
      summary: {
        fastestProvider: null,
        slowestProvider: null,
        averageResponseTime: 0,
        bestPerformingDomain: null,
        worstPerformingDomain: null
      },
      domainResults: this.results,
      recommendations: []
    };

    // Calculate provider averages across all domains
    const providerAverages = {};
    CONFIG.dnsServers.forEach(provider => {
      providerAverages[provider.name] = [];
    });

    this.results.forEach(domainResult => {
      domainResult.results.forEach(providerResult => {
        if (providerResult.overallAverage > 0) {
          providerAverages[providerResult.dnsProvider].push(providerResult.overallAverage);
        }
      });
    });

    // Calculate overall averages
    const providerOverallAverages = {};
    Object.keys(providerAverages).forEach(provider => {
      const times = providerAverages[provider];
      if (times.length > 0) {
        providerOverallAverages[provider] = times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    });

    // Find fastest and slowest providers
    const sortedProviders = Object.entries(providerOverallAverages)
      .sort(([,a], [,b]) => a - b);
    
    if (sortedProviders.length > 0) {
      report.summary.fastestProvider = {
        name: sortedProviders[0][0],
        averageTime: sortedProviders[0][1]
      };
      report.summary.slowestProvider = {
        name: sortedProviders[sortedProviders.length - 1][0],
        averageTime: sortedProviders[sortedProviders.length - 1][1]
      };
    }

    // Calculate domain averages
    const domainAverages = this.results.map(domainResult => {
      const validResults = domainResult.results.filter(r => r.overallAverage > 0);
      const average = validResults.length > 0 
        ? validResults.reduce((sum, r) => sum + r.overallAverage, 0) / validResults.length
        : -1;
      
      return {
        domain: domainResult.domain,
        average
      };
    }).filter(d => d.average > 0);

    if (domainAverages.length > 0) {
      domainAverages.sort((a, b) => a.average - b.average);
      report.summary.bestPerformingDomain = domainAverages[0];
      report.summary.worstPerformingDomain = domainAverages[domainAverages.length - 1];
      report.summary.averageResponseTime = domainAverages.reduce((sum, d) => sum + d.average, 0) / domainAverages.length;
    }

    // Generate recommendations
    if (report.summary.averageResponseTime > 100) {
      report.recommendations.push('DNS resolution times are above 100ms. Consider optimizing DNS configuration.');
    }

    if (report.summary.fastestProvider && report.summary.fastestProvider.name !== 'Cloudflare') {
      report.recommendations.push(`Consider using ${report.summary.fastestProvider.name} DNS for better performance.`);
    }

    const failureRates = this.results.map(domainResult => {
      const totalTests = domainResult.results.reduce((sum, r) => sum + (r.servers ? r.servers.length * CONFIG.iterations : 0), 0);
      const successfulTests = domainResult.results.reduce((sum, r) => {
        return sum + (r.servers ? r.servers.reduce((serverSum, s) => serverSum + s.iterations.filter(i => i.success).length, 0) : 0);
      }, 0);
      
      return {
        domain: domainResult.domain,
        failureRate: totalTests > 0 ? ((totalTests - successfulTests) / totalTests) * 100 : 0
      };
    });

    const highFailureRates = failureRates.filter(f => f.failureRate > 10);
    if (highFailureRates.length > 0) {
      report.recommendations.push(`High DNS failure rates detected for: ${highFailureRates.map(f => f.domain).join(', ')}`);
    }

    return report;
  }

  printSummary(report) {
    console.log('\n📊 DNS Performance Test Summary');
    console.log('================================');
    
    if (report.summary.fastestProvider) {
      console.log(`Fastest DNS Provider: ${report.summary.fastestProvider.name} (${report.summary.fastestProvider.averageTime.toFixed(2)}ms)`);
    }
    
    if (report.summary.slowestProvider) {
      console.log(`Slowest DNS Provider: ${report.summary.slowestProvider.name} (${report.summary.slowestProvider.averageTime.toFixed(2)}ms)`);
    }
    
    console.log(`Overall Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    
    if (report.summary.bestPerformingDomain) {
      console.log(`Best Performing Domain: ${report.summary.bestPerformingDomain.domain} (${report.summary.bestPerformingDomain.average.toFixed(2)}ms)`);
    }
    
    if (report.summary.worstPerformingDomain) {
      console.log(`Worst Performing Domain: ${report.summary.worstPerformingDomain.domain} (${report.summary.worstPerformingDomain.average.toFixed(2)}ms)`);
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }
}

// Main execution
async function main() {
  const tester = new DNSPerformanceTester();
  
  try {
    const report = await tester.runAllTests();
    
    tester.printSummary(report);
    
    // Save detailed report
    const fs = require('fs');
    const reportPath = 'infrastructure/reports/dns-performance-report.json';
    fs.mkdirSync('infrastructure/reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed DNS report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ DNS performance testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DNSPerformanceTester;