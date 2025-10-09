#!/bin/bash

# HarborList Environment Cleanup Script
#
# Description:
#   Complete environment cleanup script for HarborList marketplace.
#   Supports both local Docker environments and AWS cloud environments.
#   DESTRUCTIVE OPERATION - Use with extreme caution!
#
# Features:
#   - Local environment cleanup (Docker containers, volumes, networks)
#   - AWS environment cleanup (CDK destroy, S3 bucket deletion, resource cleanup)
#   - Safety confirmations for destructive op    echo "Usage: $0 <environment> [--force] [--clean-certs]"
    echo ""
    echo "Environments:"
    echo "  local    - Clean up local Docker development environment"
    echo "  dev      - Clean up AWS development environment"
    echo "  staging  - Clean up AWS staging environment"
    echo "  prod     - Clean up AWS production environment"
    echo ""
    echo "Options:"
    echo "  --force       - Skip confirmation prompts (USE WITH EXTREME CAUTION)"
    echo "  --clean-certs - Also remove SSL certificates (will need regeneration)"
    echo ""
    echo "Examples:"
    echo "  $0 local                         # Clean up local development environment"
    echo "  $0 dev                           # Clean up AWS dev environment"
    echo "  $0 prod                          # Clean up AWS production (extra confirmation)"
    echo "  $0 staging --force               # Force cleanup without prompts"
    echo "  $0 local --clean-certs           # Clean up and remove SSL certificates"
    echo "  $0 local --force --clean-certs   # Force cleanup including SSL certificates"omprehensive logging and error handling
#   - Environment-specific validation
#
# Usage:
#   ./cleanup.sh <environment> [--force] [--clean-certs]
#
# Environments:
#   local    - Clean up local Docker development environment
#   dev      - Clean up AWS development environment
#   staging  - Clean up AWS staging environment  
#   prod     - Clean up AWS production environment (EXTRA CONFIRMATION REQUIRED)
#
# Options:
#   --force       - Skip confirmation prompts (USE WITH EXTREME CAUTION)
#   --clean-certs - Also remove SSL certificates (will need regeneration)
#
# Examples:
#   ./cleanup.sh local                         # Clean up local development environment
#   ./cleanup.sh dev                           # Clean up AWS development environment
#   ./cleanup.sh prod                          # Clean up AWS production (with confirmations)
#   ./cleanup.sh staging --force               # Force cleanup without prompts
#   ./cleanup.sh local --clean-certs           # Clean up and remove SSL certificates
#
# WARNING: This script performs DESTRUCTIVE operations including:
#   - Deleting S3 buckets and ALL their contents
#   - Destroying CDK stacks and ALL associated resources
#   - Removing Docker containers, volumes, and networks
#   - Clearing local development data
#   
# PRESERVED: SSL certificates in certs/local/ are preserved for reuse
#
# Prerequisites:
#   For local cleanup:
#   - Docker and Docker Compose installed
#
#   For AWS cleanup:
#   - AWS CLI configured with appropriate permissions
#   - CDK installed and configured
#   - Appropriate AWS credentials for target environment
#
# Author: HarborList DevOps Team
# Version: 1.0

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create logs directory if it doesn't exist
mkdir -p "${PROJECT_ROOT}/logs"
LOG_FILE="${PROJECT_ROOT}/logs/cleanup_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${CYAN}🔄 $1${NC}" | tee -a "$LOG_FILE"
}

log_destruction() {
    echo -e "${RED}💥 $1${NC}" | tee -a "$LOG_FILE"
}

# Print header
print_header() {
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    🧹 CLEANUP SCRIPT                         ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  ⚠️  WARNING: THIS PERFORMS DESTRUCTIVE OPERATIONS!  ⚠️   ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  This script will permanently delete:                       ║${NC}"
    echo -e "${RED}║  • All S3 buckets and their contents                        ║${NC}"
    echo -e "${RED}║  • All CDK stacks and AWS resources                         ║${NC}"
    echo -e "${RED}║  • All Docker containers and volumes                        ║${NC}"
    echo -e "${RED}║  • All local development data                               ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  Environment: $1${NC}"
    echo -e "${RED}║  Timestamp: $(date)${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Confirmation functions
confirm_action() {
    local message="$1"
    local environment="$2"
    
    if [[ "$FORCE_MODE" == "true" ]]; then
        log_warning "Force mode enabled - skipping confirmation for: $message"
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  $message${NC}"
    if [[ "$environment" == "prod" ]]; then
        echo -e "${RED}🚨 PRODUCTION ENVIRONMENT CLEANUP! 🚨${NC}"
        echo -e "${RED}This will destroy ALL production resources permanently!${NC}"
        echo -e "${RED}Type 'DESTROY PRODUCTION' to confirm (case sensitive):${NC}"
        read -r confirmation
        if [[ "$confirmation" != "DESTROY PRODUCTION" ]]; then
            log_error "Production cleanup cancelled by user"
            exit 1
        fi
    else
        echo -e "${YELLOW}Type 'yes' to continue, anything else to cancel:${NC}"
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_error "Cleanup cancelled by user"
            exit 1
        fi
    fi
}

# Validate environment parameter
validate_environment() {
    local env="$1"
    
    case "$env" in
        local|dev|staging|prod)
            log_info "Environment '$env' is valid"
            ;;
        *)
            log_error "Invalid environment: $env"
            echo "Valid environments: local, dev, staging, prod"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    local environment="$1"
    
    log_step "Checking prerequisites for $environment environment..."
    
    if [[ "$environment" == "local" ]]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed or not in PATH"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
            log_error "Docker Compose is not installed"
            exit 1
        fi
    else
        # AWS environments
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI is not installed or not in PATH"
            exit 1
        fi
        
        if ! command -v cdk &> /dev/null; then
            log_error "AWS CDK is not installed or not in PATH"
            exit 1
        fi
        
        # Check AWS credentials
        if ! aws sts get-caller-identity &> /dev/null; then
            log_error "AWS credentials not configured or invalid"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Clean up local environment
cleanup_local() {
    log_step "Starting local environment cleanup..."
    
    confirm_action "This will destroy all local Docker containers, volumes, and development data" "local"
    
    # Stop all running containers
    log_step "Stopping all HarborList containers..."
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "${PROJECT_ROOT}/docker-compose.local.yml" down --remove-orphans || true
    else
        docker compose -f "${PROJECT_ROOT}/docker-compose.local.yml" down --remove-orphans || true
    fi
    
    # Remove all containers (including stopped ones)
    log_step "Removing all HarborList containers..."
    docker ps -a --filter "label=com.docker.compose.project=harborlist-marketplace" -q | xargs -r docker rm -f || true
    
    # Remove all volumes
    log_destruction "Removing all Docker volumes..."
    docker volume ls --filter "label=com.docker.compose.project=harborlist-marketplace" -q | xargs -r docker volume rm || true
    
    # Remove networks
    log_step "Removing Docker networks..."
    docker network ls --filter "label=com.docker.compose.project=harborlist-marketplace" -q | xargs -r docker network rm || true
    
    # Handle SSL certificates based on --clean-certs flag
    if [[ "$CLEAN_CERTS" == "true" ]] && [[ -d "${PROJECT_ROOT}/certs/local" ]]; then
        log_destruction "Removing local SSL certificates (--clean-certs flag specified)..."
        rm -rf "${PROJECT_ROOT}/certs/local"
    else
        log_info "Preserving local SSL certificates in certs/local/ for reuse (use --clean-certs to remove)"
    fi
    
    # Clean up any local data directories
    if [[ -d "${PROJECT_ROOT}/.data" ]]; then
        log_destruction "Removing local data directory..."
        rm -rf "${PROJECT_ROOT}/.data"
    fi
    
    # Clean up logs
    if [[ -d "${PROJECT_ROOT}/logs" ]]; then
        log_destruction "Removing log files..."
        rm -rf "${PROJECT_ROOT}/logs"
    fi
    
    # Docker system prune (remove unused images, containers, networks)
    log_step "Performing Docker system cleanup..."
    docker system prune -f --volumes || true
    
    log_success "Local environment cleanup completed"
}

# List S3 buckets for environment
list_s3_buckets() {
    local environment="$1"
    local bucket_prefix="harborlist-${environment}"
    
    log_step "Listing S3 buckets for environment: $environment"
    
    # Get list of buckets matching the environment
    local buckets
    buckets=$(aws s3api list-buckets --query "Buckets[?contains(Name, '${bucket_prefix}')].Name" --output text 2>/dev/null || echo "")
    
    if [[ -n "$buckets" ]]; then
        echo "Found S3 buckets:"
        echo "$buckets" | tr '\t' '\n' | while read -r bucket; do
            if [[ -n "$bucket" ]]; then
                echo "  - $bucket"
            fi
        done
    else
        log_info "No S3 buckets found for environment: $environment"
    fi
    
    echo "$buckets"
}

# Empty and delete S3 bucket
destroy_s3_bucket() {
    local bucket_name="$1"
    
    log_destruction "Destroying S3 bucket: $bucket_name"
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        log_info "Bucket $bucket_name does not exist, skipping..."
        return 0
    fi
    
    # Empty the bucket first (delete all objects and versions)
    log_step "Emptying S3 bucket: $bucket_name"
    aws s3 rm s3://"$bucket_name" --recursive || true
    
    # Delete all object versions if versioning is enabled
    log_step "Deleting all object versions in: $bucket_name"
    aws s3api list-object-versions --bucket "$bucket_name" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
        if [[ -n "$key" && -n "$version_id" ]]; then
            aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" || true
        fi
    done
    
    # Delete all delete markers
    aws s3api list-object-versions --bucket "$bucket_name" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
        if [[ -n "$key" && -n "$version_id" ]]; then
            aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" || true
        fi
    done
    
    # Delete the bucket
    log_destruction "Deleting S3 bucket: $bucket_name"
    aws s3api delete-bucket --bucket "$bucket_name" || true
    
    log_success "S3 bucket $bucket_name destroyed"
}

# Clean up AWS environment
cleanup_aws() {
    local environment="$1"
    
    log_step "Starting AWS environment cleanup for: $environment"
    
    confirm_action "This will destroy ALL AWS resources for environment '$environment' including S3 buckets and their contents" "$environment"
    
    # Change to infrastructure directory
    cd "${PROJECT_ROOT}/infrastructure"
    
    # List S3 buckets before destruction
    local buckets
    buckets=$(list_s3_buckets "$environment")
    
    # Destroy CDK stacks
    log_destruction "Destroying CDK stacks for environment: $environment"
    
    # Try to destroy the main stack
    local stack_name="HarborListStack-${environment}"
    if cdk list | grep -q "$stack_name"; then
        log_step "Destroying CDK stack: $stack_name"
        cdk destroy "$stack_name" --force || {
            log_warning "CDK destroy failed, continuing with manual cleanup..."
        }
    else
        log_info "CDK stack $stack_name not found, skipping..."
    fi
    
    # Clean up S3 buckets (CDK might not delete non-empty buckets)
    if [[ -n "$buckets" ]]; then
        log_step "Cleaning up S3 buckets..."
        echo "$buckets" | tr '\t' '\n' | while read -r bucket; do
            if [[ -n "$bucket" ]]; then
                destroy_s3_bucket "$bucket"
            fi
        done
    fi
    
    # Clean up any remaining resources using AWS CLI
    log_step "Scanning for remaining AWS resources..."
    
    # Clean up CloudFormation stacks
    local cf_stacks
    cf_stacks=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, 'harborlist') && contains(StackName, '${environment}')].StackName" --output text 2>/dev/null || echo "")
    
    if [[ -n "$cf_stacks" ]]; then
        echo "$cf_stacks" | tr '\t' '\n' | while read -r stack; do
            if [[ -n "$stack" ]]; then
                log_destruction "Deleting CloudFormation stack: $stack"
                aws cloudformation delete-stack --stack-name "$stack" || true
                
                # Wait for stack deletion (with timeout)
                log_step "Waiting for stack deletion: $stack"
                aws cloudformation wait stack-delete-complete --stack-name "$stack" --cli-read-timeout 0 --cli-connect-timeout 60 || {
                    log_warning "Stack deletion timeout for: $stack"
                }
            fi
        done
    fi
    
    # Clean up Lambda functions
    log_step "Cleaning up Lambda functions..."
    local lambda_functions
    lambda_functions=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'harborlist') && contains(FunctionName, '${environment}')].FunctionName" --output text 2>/dev/null || echo "")
    
    if [[ -n "$lambda_functions" ]]; then
        echo "$lambda_functions" | tr '\t' '\n' | while read -r function; do
            if [[ -n "$function" ]]; then
                log_destruction "Deleting Lambda function: $function"
                aws lambda delete-function --function-name "$function" || true
            fi
        done
    fi
    
    # Clean up DynamoDB tables
    log_step "Cleaning up DynamoDB tables..."
    local dynamo_tables
    dynamo_tables=$(aws dynamodb list-tables --query "TableNames[?contains(@, 'harborlist') && contains(@, '${environment}')]" --output text 2>/dev/null || echo "")
    
    if [[ -n "$dynamo_tables" ]]; then
        echo "$dynamo_tables" | tr '\t' '\n' | while read -r table; do
            if [[ -n "$table" ]]; then
                log_destruction "Deleting DynamoDB table: $table"
                aws dynamodb delete-table --table-name "$table" || true
            fi
        done
    fi
    
    # Clean up API Gateway APIs
    log_step "Cleaning up API Gateway APIs..."
    local api_gateways
    api_gateways=$(aws apigateway get-rest-apis --query "items[?contains(name, 'harborlist') && contains(name, '${environment}')].id" --output text 2>/dev/null || echo "")
    
    if [[ -n "$api_gateways" ]]; then
        echo "$api_gateways" | tr '\t' '\n' | while read -r api_id; do
            if [[ -n "$api_id" ]]; then
                log_destruction "Deleting API Gateway: $api_id"
                aws apigateway delete-rest-api --rest-api-id "$api_id" || true
            fi
        done
    fi
    
    # Clean up CloudWatch Log Groups
    log_step "Cleaning up CloudWatch Log Groups..."
    local log_groups
    log_groups=$(aws logs describe-log-groups --query "logGroups[?contains(logGroupName, 'harborlist') && contains(logGroupName, '${environment}')].logGroupName" --output text 2>/dev/null || echo "")
    
    if [[ -n "$log_groups" ]]; then
        echo "$log_groups" | tr '\t' '\n' | while read -r log_group; do
            if [[ -n "$log_group" ]]; then
                log_destruction "Deleting CloudWatch Log Group: $log_group"
                aws logs delete-log-group --log-group-name "$log_group" || true
            fi
        done
    fi
    
    cd "$PROJECT_ROOT"
    log_success "AWS environment cleanup completed for: $environment"
}

# Display cleanup summary
display_summary() {
    local environment="$1"
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     🎉 CLEANUP COMPLETE                      ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║  Environment: $environment${NC}"
    echo -e "${GREEN}║  Timestamp: $(date)${NC}"
    echo -e "${GREEN}║  Log file: $LOG_FILE${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    
    if [[ "$environment" == "local" ]]; then
        echo -e "${GREEN}║  ✅ Local Docker environment cleaned                         ║${NC}"
        echo -e "${GREEN}║  ✅ Containers, volumes, and networks removed               ║${NC}"
        if [[ "$CLEAN_CERTS" == "true" ]]; then
            echo -e "${GREEN}║  ✅ SSL certificates removed                                ║${NC}"
        else
            echo -e "${GREEN}║  ℹ️  SSL certificates preserved for reuse                   ║${NC}"
        fi
        echo -e "${GREEN}║  ✅ Development data cleared                                ║${NC}"
    else
        echo -e "${GREEN}║  ✅ AWS environment cleaned                                  ║${NC}"
        echo -e "${GREEN}║  ✅ CDK stacks destroyed                                    ║${NC}"
        echo -e "${GREEN}║  ✅ S3 buckets emptied and deleted                          ║${NC}"
        echo -e "${GREEN}║  ✅ AWS resources removed                                   ║${NC}"
    fi
    
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "Cleanup completed successfully for environment: $environment"
}

# Show usage information
show_usage() {
    echo "Usage: $0 <environment> [--force]"
    echo ""
    echo "Environments:"
    echo "  local    - Clean up local Docker development environment"
    echo "  dev      - Clean up AWS development environment"
    echo "  staging  - Clean up AWS staging environment"
    echo "  prod     - Clean up AWS production environment"
    echo ""
    echo "Options:"
    echo "  --force  - Skip confirmation prompts (USE WITH EXTREME CAUTION)"
    echo ""
    echo "Examples:"
    echo "  $0 local                    # Clean up local environment"
    echo "  $0 dev                      # Clean up AWS dev environment"
    echo "  $0 prod                     # Clean up AWS production (extra confirmation)"
    echo "  $0 staging --force          # Force cleanup without prompts"
    echo ""
}

# Main execution
main() {
    # Parse arguments
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    local environment="$1"
    shift # Remove environment from arguments
    
    # Parse flags
    FORCE_MODE="false"
    CLEAN_CERTS="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_MODE="true"
                shift
                ;;
            --clean-certs)
                CLEAN_CERTS="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Create log file
    touch "$LOG_FILE"
    
    # Start logging
    log_info "HarborList Environment Cleanup Started"
    log_info "Environment: $environment"
    log_info "Force Mode: $FORCE_MODE"
    log_info "Clean Certificates: $CLEAN_CERTS"
    log_info "Log File: $LOG_FILE"
    
    # Print header
    print_header "$environment"
    
    # Validate environment
    validate_environment "$environment"
    
    # Check prerequisites
    check_prerequisites "$environment"
    
    # Perform cleanup based on environment
    case "$environment" in
        local)
            cleanup_local
            ;;
        dev|staging|prod)
            cleanup_aws "$environment"
            ;;
    esac
    
    # Display summary
    display_summary "$environment"
}

# Execute main function with all arguments
main "$@"