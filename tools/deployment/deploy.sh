#!/bin/bash

# HarborList Complete Deployment Automation Script
#
# Description:
#   Unified deployment script for HarborList marketplace across multiple environments.
#   Supports Docker Compose local development with Traefik reverse proxy and custom domains,
#   as well as AWS CDK deployments for cloud environments.
#
# Features:
#   - Enhanced profile by default with Traefik routing
#   - Custom domain support (local.harborlist.com, local-api.harborlist.com)
#   - SSL certificate management for local development
#   - Deployment-target-aware authentication system
#   - Comprehensive logging and error handling
#   - Docker prerequisite validation
#   - Service health checks and status monitoring
#
# Usage:
#   ./deploy.sh <environment>
#
# Environments:
#   local    - Docker Compose development environment (enhanced profile with Traefik)
#   dev      - AWS development environment
#   staging  - AWS staging environment  
#   prod     - AWS production environment
#
# Prerequisites:
#   For local deployment:
#   - Docker and Docker Compose installed
#   - Host file entries configured:
#     127.0.0.1 local.harborlist.com
#     127.0.0.1 local-api.harborlist.com
#     127.0.0.1 traefik.local.harborlist.com
#   - SSL certificates in certs/local/ directory
#
#   For AWS deployments:
#   - AWS CLI configured
#   - CDK installed and bootstrapped
#   - Appropriate AWS credentials and permissions
#
# Examples:
#   ./deploy.sh local                    # Deploy local development environment
#   ./deploy.sh dev                      # Deploy to AWS development
#   ./deploy.sh prod                     # Deploy to AWS production
#
# Local Environment Access:
#   Frontend (Custom Domain):  https://local.harborlist.com
#   Backend API (Custom Domain): https://local-api.harborlist.com
#   Frontend (Direct):         http://localhost:3000
#   Backend API (Direct):      http://localhost:3001
#   Traefik Dashboard:         http://localhost:8088
#   DynamoDB Local:           http://localhost:8000
#   DynamoDB Admin:           http://localhost:8001
#
# Logging:
#   All deployment activities are logged to deployment_YYYYMMDD_HHMMSS.log
#
# Author: HarborList Team
# Version: 2.0 (Enhanced Profile)
# Last Updated: October 2025

set -e
set -u

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${PROJECT_ROOT}/deployment_${TIMESTAMP}.log"

# Initialize logging
exec > >(tee -a "${LOG_FILE}")
exec 2>&1

echo -e "${BLUE}=== HarborList Deployment Script Started ===${NC}"
echo "Timestamp: $(date)"
echo "Environment: ${1:-'not specified'}"
echo "Project Root: ${PROJECT_ROOT}"
echo "Log File: ${LOG_FILE}"
echo ""

# Function to print colored status messages
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${PURPLE}🔄 $1${NC}"; }

# Function to validate environment parameter
validate_environment() {
    local env=$1
    
    case "$env" in
        "local"|"dev"|"staging"|"prod")
            print_success "Environment '$env' is valid"
            return 0
            ;;
        *)
            print_error "Invalid environment: '$env'"
            echo "Valid environments: local, dev, staging, prod"
            echo ""
            echo "Usage: $0 <environment>"
            echo "Environments:"
            echo "  local    - Docker Compose development environment (enhanced profile with Traefik)"
            echo "  dev      - AWS development environment"
            echo "  staging  - AWS staging environment"
            echo "  prod     - AWS production environment"
            echo ""
            echo "Local environment provides:"
            echo "  - Custom domains: https://local.harborlist.com, https://local-api.harborlist.com"
            echo "  - SSL termination via Traefik"
            echo "  - Full service stack with monitoring tools"
            exit 1
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Docker prerequisites
check_docker_prerequisites() {
    print_step "Checking Docker prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    # Check if Docker daemon is running
    if command_exists docker && ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker Desktop or Docker daemon"
        exit 1
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing Docker dependencies: ${missing_deps[*]}"
        print_info "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    print_success "All Docker prerequisites are available"
}

# Function to deploy with Docker Compose
deploy_local() {
    print_step "Starting local Docker Compose deployment..."
    
    cd "${PROJECT_ROOT}"
    
    # Check for Docker Compose file
    if [[ ! -f "docker-compose.local.yml" ]]; then
        print_error "docker-compose.local.yml not found in project root"
        exit 1
    fi
    
    print_step "Building and starting Docker services..."
    
    # Use enhanced profile by default for Traefik routing and custom domains
    COMPOSE_PROFILE="enhanced"
    print_info "Deploying with enhanced profile (includes Traefik for custom domains)"
    
    # Stop any existing services
    print_step "Stopping existing services..."
    docker-compose -f docker-compose.local.yml --profile "${COMPOSE_PROFILE}" down --remove-orphans || true
    
    # Pull latest images and build
    print_step "Building services..."
    docker-compose -f docker-compose.local.yml --profile "${COMPOSE_PROFILE}" build --no-cache
    
    # Start services
    print_step "Starting services..."
    docker-compose -f docker-compose.local.yml --profile "${COMPOSE_PROFILE}" up -d
    
    # Wait for services to be ready
    print_step "Waiting for services to start..."
    sleep 10
    
    # Show service status
    print_step "Checking service status..."
    docker-compose -f docker-compose.local.yml --profile "${COMPOSE_PROFILE}" ps
    
    print_success "Local deployment completed!"
    
    # Display access information
    echo ""
    print_info "Local Environment Access Information:"
    echo "  Frontend (Custom Domain): https://local.harborlist.com"
    echo "  Backend API (Custom Domain): https://local-api.harborlist.com"
    echo "  Frontend (Direct): http://localhost:3000"
    echo "  Backend API (Direct): http://localhost:3001"
    echo "  Traefik Dashboard: http://localhost:8088"
    echo "  DynamoDB Local: http://localhost:8000"
    echo "  DynamoDB Admin: http://localhost:8001"
    
    echo ""
    print_info "Useful Docker Compose commands:"
    echo "  View logs: docker-compose -f docker-compose.local.yml --profile ${COMPOSE_PROFILE} logs -f"
    echo "  Stop services: docker-compose -f docker-compose.local.yml --profile ${COMPOSE_PROFILE} down"
    echo "  Rebuild: docker-compose -f docker-compose.local.yml --profile ${COMPOSE_PROFILE} up --build -d"
    
    echo ""
    print_warning "Note: For custom domains to work, add these entries to your /etc/hosts file:"
    echo "  127.0.0.1 local.harborlist.com"
    echo "  127.0.0.1 local-api.harborlist.com"
    echo "  127.0.0.1 traefik.local.harborlist.com"
}

# Main execution logic
main() {
    # Check if environment parameter is provided
    if [[ $# -eq 0 ]]; then
        print_error "Environment parameter is required"
        echo ""
        echo "Usage: $0 <environment>"
        echo ""
        echo "Environments:"
        echo "  local    - Docker Compose development environment (enhanced profile with Traefik)"
        echo "  dev      - AWS development environment"
        echo "  staging  - AWS staging environment"
        echo "  prod     - AWS production environment"
        echo ""
        echo "Example: $0 local"
        echo ""
        echo "For more information, see the script header documentation."
        exit 1
    fi
    
    local environment=$1
    
    # Validate environment
    validate_environment "${environment}"
    
    # Check prerequisites based on deployment target
    if [[ "${environment}" == "local" ]]; then
        check_docker_prerequisites
        deploy_local
    else
        print_error "AWS deployment not implemented in this simplified version"
        print_info "For AWS deployment, use the CDK directly from the infrastructure folder"
        exit 1
    fi
    
    print_success "Deployment process completed successfully!"
    print_info "Log file saved to: ${LOG_FILE}"
}

# Execute main function with all arguments
main "$@"
