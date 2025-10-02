#!/bin/bash

# Comprehensive Performance and Reliability Test Runner
# Executes all performance tests for Cloudflare Tunnel architecture

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="infrastructure/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
COMBINED_REPORT="$REPORT_DIR/performance-test-suite-$TIMESTAMP.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is required but not installed"
        return 1
    fi
    
    # Check if curl is available
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required but not installed"
        return 1
    fi
    
    # Check if jq is available (optional but recommended)
    if ! command -v jq >/dev/null 2>&1; then
        log_warning "jq is not installed - some report features will be limited"
    fi
    
    # Create reports directory
    mkdir -p "$REPORT_DIR"
    
    log_success "Prerequisites check completed"
    return 0
}

# Run performance testing
run_performance_tests() {
    log_info "Running performance tests..."
    
    if node "$SCRIPT_DIR/performance-testing.js"; then
        log_success "Performance tests completed successfully"
        return 0
    else
        log_error "Performance tests failed"
        return 1
    fi
}

# Run DNS performance testing
run_dns_tests() {
    log_info "Running DNS performance tests..."
    
    if node "$SCRIPT_DIR/dns-performance-test.js"; then
        log_success "DNS performance tests completed successfully"
        return 0
    else
        log_error "DNS performance tests failed"
        return 1
    fi
}

# Run caching effectiveness tests
run_caching_tests() {
    log_info "Running caching effectiveness tests..."
    
    if node "$SCRIPT_DIR/caching-test.js"; then
        log_success "Caching tests completed successfully"
        return 0
    else
        log_error "Caching tests failed"
        return 1
    fi
}

# Run tunnel resilience tests
run_resilience_tests() {
    log_info "Running tunnel resilience tests..."
    
    # Check if we can run resilience tests (requires sudo)
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_warning "Skipping resilience tests - requires sudo access"
        log_warning "To run resilience tests, execute: sudo $SCRIPT_DIR/tunnel-resilience-test.sh"
        return 0
    fi
    
    if "$SCRIPT_DIR/tunnel-resilience-test.sh"; then
        log_success "Tunnel resilience tests completed successfully"
        return 0
    else
        log_error "Tunnel resilience tests failed"
        return 1
    fi
}

# Combine all reports into a single comprehensive report
combine_reports() {
    log_info "Combining test reports..."
    
    local performance_report="$REPORT_DIR/performance-test-report.json"
    local dns_report="$REPORT_DIR/dns-performance-report.json"
    local caching_report="$REPORT_DIR/caching-test-report.json"
    local resilience_report="$REPORT_DIR/tunnel-resilience-report.json"
    
    # Initialize combined report
    cat > "$COMBINED_REPORT" << EOF
{
  "testSuite": {
    "name": "Cloudflare Tunnel Performance and Reliability Test Suite",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "1.0.0"
  },
  "summary": {
    "testsRun": 0,
    "testsPassed": 0,
    "testsFailed": 0,
    "overallStatus": "unknown"
  },
  "testResults": {},
  "recommendations": [],
  "reportFiles": []
}
EOF
    
    local tests_run=0
    local tests_passed=0
    local tests_failed=0
    local all_recommendations=()
    
    # Add performance test results
    if [ -f "$performance_report" ]; then
        log_info "Including performance test results"
        if command -v jq >/dev/null 2>&1; then
            jq --argjson perf "$(cat "$performance_report")" '.testResults.performance = $perf' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
            jq '.reportFiles += ["performance-test-report.json"]' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
        fi
        ((tests_run++))
        ((tests_passed++))
    else
        log_warning "Performance test report not found"
        ((tests_run++))
        ((tests_failed++))
    fi
    
    # Add DNS test results
    if [ -f "$dns_report" ]; then
        log_info "Including DNS performance test results"
        if command -v jq >/dev/null 2>&1; then
            jq --argjson dns "$(cat "$dns_report")" '.testResults.dns = $dns' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
            jq '.reportFiles += ["dns-performance-report.json"]' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
        fi
        ((tests_run++))
        ((tests_passed++))
    else
        log_warning "DNS performance test report not found"
        ((tests_run++))
        ((tests_failed++))
    fi
    
    # Add caching test results
    if [ -f "$caching_report" ]; then
        log_info "Including caching effectiveness test results"
        if command -v jq >/dev/null 2>&1; then
            jq --argjson cache "$(cat "$caching_report")" '.testResults.caching = $cache' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
            jq '.reportFiles += ["caching-test-report.json"]' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
        fi
        ((tests_run++))
        ((tests_passed++))
    else
        log_warning "Caching test report not found"
        ((tests_run++))
        ((tests_failed++))
    fi
    
    # Add resilience test results
    if [ -f "$resilience_report" ]; then
        log_info "Including tunnel resilience test results"
        if command -v jq >/dev/null 2>&1; then
            jq --argjson resilience "$(cat "$resilience_report")" '.testResults.resilience = $resilience' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
            jq '.reportFiles += ["tunnel-resilience-report.json"]' "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
        fi
        ((tests_run++))
        
        # Check resilience test status
        if command -v jq >/dev/null 2>&1; then
            local resilience_status=$(jq -r '.summary.overallStatus' "$resilience_report" 2>/dev/null || echo "unknown")
            if [ "$resilience_status" = "passed" ]; then
                ((tests_passed++))
            else
                ((tests_failed++))
            fi
        else
            ((tests_passed++)) # Assume passed if we can't parse
        fi
    else
        log_warning "Tunnel resilience test report not found (may have been skipped)"
    fi
    
    # Update summary
    local overall_status="unknown"
    if [ $tests_failed -eq 0 ]; then
        overall_status="passed"
    elif [ $tests_passed -gt $tests_failed ]; then
        overall_status="partial"
    else
        overall_status="failed"
    fi
    
    if command -v jq >/dev/null 2>&1; then
        jq ".summary.testsRun = $tests_run | .summary.testsPassed = $tests_passed | .summary.testsFailed = $tests_failed | .summary.overallStatus = \"$overall_status\"" "$COMBINED_REPORT" > "${COMBINED_REPORT}.tmp" && mv "${COMBINED_REPORT}.tmp" "$COMBINED_REPORT"
    fi
    
    log_success "Combined report created: $COMBINED_REPORT"
}

# Print final summary
print_summary() {
    log_info "=== PERFORMANCE AND RELIABILITY TEST SUITE SUMMARY ==="
    
    if [ -f "$COMBINED_REPORT" ] && command -v jq >/dev/null 2>&1; then
        local tests_run=$(jq -r '.summary.testsRun' "$COMBINED_REPORT" 2>/dev/null || echo "unknown")
        local tests_passed=$(jq -r '.summary.testsPassed' "$COMBINED_REPORT" 2>/dev/null || echo "unknown")
        local tests_failed=$(jq -r '.summary.testsFailed' "$COMBINED_REPORT" 2>/dev/null || echo "unknown")
        local overall_status=$(jq -r '.summary.overallStatus' "$COMBINED_REPORT" 2>/dev/null || echo "unknown")
        
        echo "Tests Run: $tests_run"
        echo "Tests Passed: $tests_passed"
        echo "Tests Failed: $tests_failed"
        echo "Overall Status: $overall_status"
        
        # Show individual test results if available
        echo ""
        echo "Individual Test Results:"
        
        if jq -e '.testResults.performance' "$COMBINED_REPORT" >/dev/null 2>&1; then
            local avg_load_time=$(jq -r '.testResults.performance.summary.pageLoadAverage' "$COMBINED_REPORT" 2>/dev/null || echo "N/A")
            echo "  ✅ Performance Tests: Average page load ${avg_load_time}ms"
        else
            echo "  ❌ Performance Tests: Failed or not run"
        fi
        
        if jq -e '.testResults.dns' "$COMBINED_REPORT" >/dev/null 2>&1; then
            local avg_dns_time=$(jq -r '.testResults.dns.summary.averageResponseTime' "$COMBINED_REPORT" 2>/dev/null || echo "N/A")
            echo "  ✅ DNS Performance Tests: Average resolution ${avg_dns_time}ms"
        else
            echo "  ❌ DNS Performance Tests: Failed or not run"
        fi
        
        if jq -e '.testResults.caching' "$COMBINED_REPORT" >/dev/null 2>&1; then
            local cache_effectiveness=$(jq -r '.testResults.caching.summary.overallCachingEffectiveness' "$COMBINED_REPORT" 2>/dev/null || echo "N/A")
            echo "  ✅ Caching Tests: $cache_effectiveness effectiveness"
        else
            echo "  ❌ Caching Tests: Failed or not run"
        fi
        
        if jq -e '.testResults.resilience' "$COMBINED_REPORT" >/dev/null 2>&1; then
            local resilience_status=$(jq -r '.testResults.resilience.summary.overallStatus' "$COMBINED_REPORT" 2>/dev/null || echo "N/A")
            local recovery_time=$(jq -r '.testResults.resilience.summary.recoveryTime' "$COMBINED_REPORT" 2>/dev/null || echo "N/A")
            echo "  ✅ Resilience Tests: $resilience_status (recovery: ${recovery_time}s)"
        else
            echo "  ⚠️  Resilience Tests: Skipped or failed"
        fi
        
    else
        echo "Summary not available - jq not installed or report file missing"
    fi
    
    echo ""
    echo "Reports Directory: $REPORT_DIR"
    echo "Combined Report: $COMBINED_REPORT"
    echo ""
    
    # List all generated reports
    echo "Generated Reports:"
    ls -la "$REPORT_DIR"/*.json 2>/dev/null | while read -r line; do
        echo "  $line"
    done || echo "  No report files found"
}

# Main execution
main() {
    echo "🧪 Cloudflare Tunnel Performance and Reliability Test Suite"
    echo "=========================================================="
    echo "Timestamp: $(date)"
    echo ""
    
    local exit_code=0
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    echo ""
    log_info "Starting test suite execution..."
    echo ""
    
    # Run all tests (continue even if some fail)
    run_performance_tests || exit_code=1
    echo ""
    
    run_dns_tests || exit_code=1
    echo ""
    
    run_caching_tests || exit_code=1
    echo ""
    
    run_resilience_tests || exit_code=1
    echo ""
    
    # Combine reports
    combine_reports
    echo ""
    
    # Print summary
    print_summary
    
    if [ $exit_code -eq 0 ]; then
        log_success "All tests completed successfully!"
    else
        log_warning "Some tests failed or had issues - check individual reports for details"
    fi
    
    exit $exit_code
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --performance-only  Run only performance tests"
        echo "  --dns-only         Run only DNS tests"
        echo "  --caching-only     Run only caching tests"
        echo "  --resilience-only  Run only resilience tests"
        echo ""
        echo "This script runs a comprehensive test suite for Cloudflare Tunnel architecture."
        echo "Reports are saved to: $REPORT_DIR"
        exit 0
        ;;
    --performance-only)
        check_prerequisites && run_performance_tests
        exit $?
        ;;
    --dns-only)
        check_prerequisites && run_dns_tests
        exit $?
        ;;
    --caching-only)
        check_prerequisites && run_caching_tests
        exit $?
        ;;
    --resilience-only)
        check_prerequisites && run_resilience_tests
        exit $?
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac