#!/bin/bash

# Tunnel Resilience Testing Script
# Tests Cloudflare Tunnel service restart and recovery capabilities

set -e

# Configuration
TUNNEL_SERVICE="cloudflared"
TEST_URL="https://dev.harborlist.com"
API_TEST_URL="https://api-dev.harborlist.com/health"
MAX_WAIT_TIME=120  # Maximum time to wait for recovery (seconds)
CHECK_INTERVAL=5   # Interval between connectivity checks (seconds)
REPORT_DIR="infrastructure/reports"
REPORT_FILE="$REPORT_DIR/tunnel-resilience-report.json"

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

# Initialize report structure
init_report() {
    mkdir -p "$REPORT_DIR"
    cat > "$REPORT_FILE" << EOF
{
  "testRun": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "testType": "tunnel-resilience",
    "tunnelService": "$TUNNEL_SERVICE"
  },
  "preTest": {},
  "serviceRestart": {},
  "recovery": {},
  "postTest": {},
  "summary": {
    "overallStatus": "unknown",
    "totalDowntime": 0,
    "recoveryTime": 0,
    "testsPassed": 0,
    "testsFailed": 0
  },
  "recommendations": []
}
EOF
}

# Update report with test results
update_report() {
    local section="$1"
    local key="$2"
    local value="$3"
    
    # Use jq to update the JSON report
    if command -v jq >/dev/null 2>&1; then
        tmp_file=$(mktemp)
        jq ".$section.$key = $value" "$REPORT_FILE" > "$tmp_file" && mv "$tmp_file" "$REPORT_FILE"
    else
        log_warning "jq not available, skipping report update for $section.$key"
    fi
}

# Test connectivity to a URL
test_connectivity() {
    local url="$1"
    local timeout="${2:-10}"
    
    if curl -s --max-time "$timeout" --fail "$url" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get detailed connectivity info
get_connectivity_info() {
    local url="$1"
    local output_file="$2"
    
    {
        echo "=== Connectivity Test for $url ==="
        echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo ""
        
        # Test basic connectivity
        echo "Basic connectivity test:"
        if curl -s --max-time 10 --fail "$url" >/dev/null 2>&1; then
            echo "✅ SUCCESS: URL is accessible"
        else
            echo "❌ FAILED: URL is not accessible"
        fi
        echo ""
        
        # Get response headers
        echo "Response headers:"
        curl -s --max-time 10 -I "$url" 2>/dev/null || echo "Failed to get headers"
        echo ""
        
        # Test response time
        echo "Response time test:"
        response_time=$(curl -s --max-time 10 -w "%{time_total}" -o /dev/null "$url" 2>/dev/null || echo "failed")
        if [ "$response_time" != "failed" ]; then
            echo "Response time: ${response_time}s"
        else
            echo "Failed to measure response time"
        fi
        echo ""
        
        # DNS resolution test
        echo "DNS resolution test:"
        host=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||')
        nslookup "$host" 2>/dev/null || echo "DNS resolution failed"
        echo ""
        
    } > "$output_file"
}

# Check service status
check_service_status() {
    if systemctl is-active --quiet "$TUNNEL_SERVICE"; then
        echo "active"
    elif systemctl is-failed --quiet "$TUNNEL_SERVICE"; then
        echo "failed"
    else
        echo "inactive"
    fi
}

# Get service logs
get_service_logs() {
    local lines="${1:-50}"
    journalctl -u "$TUNNEL_SERVICE" --no-pager -n "$lines" --output=short-iso
}

# Pre-test checks
run_pre_test_checks() {
    log_info "Running pre-test checks..."
    
    local pre_test_dir="$REPORT_DIR/pre-test"
    mkdir -p "$pre_test_dir"
    
    # Check initial service status
    local initial_status=$(check_service_status)
    log_info "Initial tunnel service status: $initial_status"
    
    # Test initial connectivity
    log_info "Testing initial connectivity..."
    get_connectivity_info "$TEST_URL" "$pre_test_dir/frontend-connectivity.log"
    get_connectivity_info "$API_TEST_URL" "$pre_test_dir/api-connectivity.log"
    
    # Check if both URLs are accessible
    local frontend_accessible=false
    local api_accessible=false
    
    if test_connectivity "$TEST_URL"; then
        frontend_accessible=true
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
    fi
    
    if test_connectivity "$API_TEST_URL"; then
        api_accessible=true
        log_success "API is accessible"
    else
        log_error "API is not accessible"
    fi
    
    # Get initial service logs
    get_service_logs 100 > "$pre_test_dir/service-logs.log"
    
    # Update report
    update_report "preTest" "serviceStatus" "\"$initial_status\""
    update_report "preTest" "frontendAccessible" "$frontend_accessible"
    update_report "preTest" "apiAccessible" "$api_accessible"
    update_report "preTest" "timestamp" "\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\""
    
    if [ "$initial_status" != "active" ] || [ "$frontend_accessible" != "true" ] || [ "$api_accessible" != "true" ]; then
        log_error "Pre-test checks failed. Cannot proceed with resilience testing."
        update_report "summary" "overallStatus" "\"failed-pretest\""
        return 1
    fi
    
    log_success "Pre-test checks passed"
    return 0
}

# Restart tunnel service
restart_tunnel_service() {
    log_info "Restarting tunnel service..."
    
    local restart_start_time=$(date +%s)
    
    # Stop the service
    log_info "Stopping $TUNNEL_SERVICE service..."
    if sudo systemctl stop "$TUNNEL_SERVICE"; then
        log_success "Service stopped successfully"
    else
        log_error "Failed to stop service"
        return 1
    fi
    
    # Wait a moment to ensure it's fully stopped
    sleep 2
    
    # Check that it's actually stopped
    local stopped_status=$(check_service_status)
    log_info "Service status after stop: $stopped_status"
    
    # Start the service
    log_info "Starting $TUNNEL_SERVICE service..."
    if sudo systemctl start "$TUNNEL_SERVICE"; then
        log_success "Service start command executed"
    else
        log_error "Failed to start service"
        return 1
    fi
    
    local restart_end_time=$(date +%s)
    local restart_duration=$((restart_end_time - restart_start_time))
    
    # Update report
    update_report "serviceRestart" "startTime" "\"$(date -u -d @$restart_start_time +"%Y-%m-%dT%H:%M:%SZ")\""
    update_report "serviceRestart" "endTime" "\"$(date -u -d @$restart_end_time +"%Y-%m-%dT%H:%M:%SZ")\""
    update_report "serviceRestart" "duration" "$restart_duration"
    update_report "serviceRestart" "success" "true"
    
    log_success "Service restart completed in ${restart_duration}s"
    return 0
}

# Wait for service recovery
wait_for_recovery() {
    log_info "Waiting for service recovery..."
    
    local recovery_start_time=$(date +%s)
    local elapsed=0
    local frontend_recovered=false
    local api_recovered=false
    local service_active=false
    
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        # Check service status
        local current_status=$(check_service_status)
        if [ "$current_status" = "active" ] && [ "$service_active" = "false" ]; then
            service_active=true
            local service_recovery_time=$(($(date +%s) - recovery_start_time))
            log_success "Service is active after ${service_recovery_time}s"
            update_report "recovery" "serviceRecoveryTime" "$service_recovery_time"
        fi
        
        # Check frontend connectivity
        if [ "$frontend_recovered" = "false" ] && test_connectivity "$TEST_URL"; then
            frontend_recovered=true
            local frontend_recovery_time=$(($(date +%s) - recovery_start_time))
            log_success "Frontend connectivity recovered after ${frontend_recovery_time}s"
            update_report "recovery" "frontendRecoveryTime" "$frontend_recovery_time"
        fi
        
        # Check API connectivity
        if [ "$api_recovered" = "false" ] && test_connectivity "$API_TEST_URL"; then
            api_recovered=true
            local api_recovery_time=$(($(date +%s) - recovery_start_time))
            log_success "API connectivity recovered after ${api_recovery_time}s"
            update_report "recovery" "apiRecoveryTime" "$api_recovery_time"
        fi
        
        # If everything is recovered, break
        if [ "$service_active" = "true" ] && [ "$frontend_recovered" = "true" ] && [ "$api_recovered" = "true" ]; then
            break
        fi
        
        # Show progress
        echo -n "."
        sleep $CHECK_INTERVAL
        elapsed=$(($(date +%s) - recovery_start_time))
    done
    
    echo "" # New line after progress dots
    
    local total_recovery_time=$(($(date +%s) - recovery_start_time))
    
    # Update report with final recovery status
    update_report "recovery" "totalRecoveryTime" "$total_recovery_time"
    update_report "recovery" "serviceRecovered" "$service_active"
    update_report "recovery" "frontendRecovered" "$frontend_recovered"
    update_report "recovery" "apiRecovered" "$api_recovered"
    update_report "recovery" "maxWaitTime" "$MAX_WAIT_TIME"
    
    if [ "$service_active" = "true" ] && [ "$frontend_recovered" = "true" ] && [ "$api_recovered" = "true" ]; then
        log_success "Full recovery completed in ${total_recovery_time}s"
        return 0
    else
        log_error "Recovery incomplete after ${total_recovery_time}s"
        if [ "$service_active" = "false" ]; then
            log_error "Service is not active"
        fi
        if [ "$frontend_recovered" = "false" ]; then
            log_error "Frontend connectivity not recovered"
        fi
        if [ "$api_recovered" = "false" ]; then
            log_error "API connectivity not recovered"
        fi
        return 1
    fi
}

# Post-test validation
run_post_test_validation() {
    log_info "Running post-test validation..."
    
    local post_test_dir="$REPORT_DIR/post-test"
    mkdir -p "$post_test_dir"
    
    # Check final service status
    local final_status=$(check_service_status)
    log_info "Final tunnel service status: $final_status"
    
    # Test final connectivity with detailed info
    log_info "Testing final connectivity..."
    get_connectivity_info "$TEST_URL" "$post_test_dir/frontend-connectivity.log"
    get_connectivity_info "$API_TEST_URL" "$post_test_dir/api-connectivity.log"
    
    # Check if both URLs are accessible
    local frontend_accessible=false
    local api_accessible=false
    
    if test_connectivity "$TEST_URL"; then
        frontend_accessible=true
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
    fi
    
    if test_connectivity "$API_TEST_URL"; then
        api_accessible=true
        log_success "API is accessible"
    else
        log_error "API is not accessible"
    fi
    
    # Get final service logs
    get_service_logs 100 > "$post_test_dir/service-logs.log"
    
    # Performance comparison test
    log_info "Running performance comparison..."
    local performance_test_output="$post_test_dir/performance-test.log"
    {
        echo "=== Performance Test After Recovery ==="
        echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo ""
        
        for i in {1..5}; do
            echo "Test $i:"
            frontend_time=$(curl -s --max-time 10 -w "%{time_total}" -o /dev/null "$TEST_URL" 2>/dev/null || echo "failed")
            api_time=$(curl -s --max-time 10 -w "%{time_total}" -o /dev/null "$API_TEST_URL" 2>/dev/null || echo "failed")
            echo "  Frontend: ${frontend_time}s"
            echo "  API: ${api_time}s"
        done
    } > "$performance_test_output"
    
    # Update report
    update_report "postTest" "serviceStatus" "\"$final_status\""
    update_report "postTest" "frontendAccessible" "$frontend_accessible"
    update_report "postTest" "apiAccessible" "$api_accessible"
    update_report "postTest" "timestamp" "\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\""
    
    if [ "$final_status" = "active" ] && [ "$frontend_accessible" = "true" ] && [ "$api_accessible" = "true" ]; then
        log_success "Post-test validation passed"
        return 0
    else
        log_error "Post-test validation failed"
        return 1
    fi
}

# Generate final report and recommendations
generate_final_report() {
    log_info "Generating final report..."
    
    local tests_passed=0
    local tests_failed=0
    local overall_status="unknown"
    local recommendations=()
    
    # Read current report to analyze results
    if command -v jq >/dev/null 2>&1 && [ -f "$REPORT_FILE" ]; then
        local pre_test_ok=$(jq -r '.preTest.frontendAccessible and .preTest.apiAccessible' "$REPORT_FILE" 2>/dev/null || echo "false")
        local restart_ok=$(jq -r '.serviceRestart.success // false' "$REPORT_FILE" 2>/dev/null || echo "false")
        local recovery_ok=$(jq -r '.recovery.serviceRecovered and .recovery.frontendRecovered and .recovery.apiRecovered' "$REPORT_FILE" 2>/dev/null || echo "false")
        local post_test_ok=$(jq -r '.postTest.frontendAccessible and .postTest.apiAccessible' "$REPORT_FILE" 2>/dev/null || echo "false")
        
        local recovery_time=$(jq -r '.recovery.totalRecoveryTime // 0' "$REPORT_FILE" 2>/dev/null || echo "0")
        local service_recovery_time=$(jq -r '.recovery.serviceRecoveryTime // 0' "$REPORT_FILE" 2>/dev/null || echo "0")
        
        # Count passed/failed tests
        [ "$pre_test_ok" = "true" ] && ((tests_passed++)) || ((tests_failed++))
        [ "$restart_ok" = "true" ] && ((tests_passed++)) || ((tests_failed++))
        [ "$recovery_ok" = "true" ] && ((tests_passed++)) || ((tests_failed++))
        [ "$post_test_ok" = "true" ] && ((tests_passed++)) || ((tests_failed++))
        
        # Determine overall status
        if [ "$tests_failed" -eq 0 ]; then
            overall_status="passed"
        elif [ "$tests_passed" -gt "$tests_failed" ]; then
            overall_status="partial"
        else
            overall_status="failed"
        fi
        
        # Generate recommendations
        if [ "$recovery_time" -gt 60 ]; then
            recommendations+=("Recovery time (${recovery_time}s) is longer than expected. Consider optimizing tunnel configuration.")
        fi
        
        if [ "$service_recovery_time" -gt 30 ]; then
            recommendations+=("Service recovery time (${service_recovery_time}s) is slow. Check systemd service configuration.")
        fi
        
        if [ "$recovery_ok" != "true" ]; then
            recommendations+=("Recovery was incomplete. Review tunnel logs and configuration.")
        fi
        
        if [ "$overall_status" != "passed" ]; then
            recommendations+=("Resilience test did not pass completely. Review all test phases for issues.")
        fi
        
        # Update final report
        update_report "summary" "overallStatus" "\"$overall_status\""
        update_report "summary" "testsPassed" "$tests_passed"
        update_report "summary" "testsFailed" "$tests_failed"
        update_report "summary" "recoveryTime" "$recovery_time"
        
        # Add recommendations array
        if [ ${#recommendations[@]} -gt 0 ]; then
            local rec_json="["
            for i in "${!recommendations[@]}"; do
                [ $i -gt 0 ] && rec_json+=","
                rec_json+="\"${recommendations[$i]}\""
            done
            rec_json+="]"
            update_report "recommendations" "" "$rec_json"
        fi
    fi
    
    # Print summary
    echo ""
    log_info "=== TUNNEL RESILIENCE TEST SUMMARY ==="
    echo "Overall Status: $overall_status"
    echo "Tests Passed: $tests_passed"
    echo "Tests Failed: $tests_failed"
    
    if [ ${#recommendations[@]} -gt 0 ]; then
        echo ""
        log_warning "Recommendations:"
        for rec in "${recommendations[@]}"; do
            echo "  • $rec"
        done
    fi
    
    echo ""
    log_info "Detailed report saved to: $REPORT_FILE"
    
    # Return appropriate exit code
    case "$overall_status" in
        "passed") return 0 ;;
        "partial") return 1 ;;
        *) return 2 ;;
    esac
}

# Main execution
main() {
    echo "🧪 Starting Cloudflare Tunnel Resilience Test"
    echo "=============================================="
    echo "Test URL: $TEST_URL"
    echo "API Test URL: $API_TEST_URL"
    echo "Service: $TUNNEL_SERVICE"
    echo "Max Wait Time: ${MAX_WAIT_TIME}s"
    echo ""
    
    # Initialize report
    init_report
    
    # Check if running as root or with sudo access
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo access to restart the tunnel service"
        log_error "Please run with sudo or ensure passwordless sudo is configured"
        exit 1
    fi
    
    # Run test phases
    local exit_code=0
    
    if ! run_pre_test_checks; then
        log_error "Pre-test checks failed"
        exit_code=1
    elif ! restart_tunnel_service; then
        log_error "Service restart failed"
        exit_code=1
    elif ! wait_for_recovery; then
        log_error "Recovery failed or incomplete"
        exit_code=1
    elif ! run_post_test_validation; then
        log_error "Post-test validation failed"
        exit_code=1
    fi
    
    # Generate final report regardless of test results
    generate_final_report
    local report_exit_code=$?
    
    # Use the worse of the two exit codes
    [ $exit_code -eq 0 ] && exit_code=$report_exit_code
    
    if [ $exit_code -eq 0 ]; then
        log_success "Tunnel resilience test completed successfully"
    else
        log_error "Tunnel resilience test completed with issues"
    fi
    
    exit $exit_code
}

# Run main function
main "$@"