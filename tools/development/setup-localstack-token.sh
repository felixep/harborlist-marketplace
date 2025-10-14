#!/bin/bash

# Setup LocalStack Pro Auth Token
#
# This script helps configure the LocalStack Pro authentication token
# required for using Cognito IDP and other Pro features.
#
# Usage: ./setup-localstack-token.sh [token]
#
# If no token is provided, the script will prompt for it.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_LOCAL_FILE="${PROJECT_ROOT}/.env.local"

echo -e "${BLUE}=== LocalStack Pro Auth Token Setup ===${NC}"
echo ""

# Check if .env.local exists
if [[ ! -f "${ENV_LOCAL_FILE}" ]]; then
    print_error ".env.local file not found at ${ENV_LOCAL_FILE}"
    print_info "Please run the deployment script first to create the base configuration"
    exit 1
fi

# Get token from command line argument or prompt
if [[ $# -eq 1 ]]; then
    TOKEN="$1"
else
    echo ""
    print_info "LocalStack Pro Auth Token Setup"
    echo ""
    echo "To use LocalStack Pro features (including Cognito IDP), you need an auth token."
    echo ""
    echo "Steps to get your token:"
    echo "1. Go to https://app.localstack.cloud/"
    echo "2. Sign up or log in to your account"
    echo "3. Navigate to your profile/settings"
    echo "4. Copy your API token"
    echo ""
    echo "Note: LocalStack Pro offers a free tier with Cognito support."
    echo ""
    read -p "Enter your LocalStack Pro auth token: " TOKEN
fi

# Validate token format (basic check)
if [[ -z "${TOKEN}" ]]; then
    print_error "No token provided"
    exit 1
fi

if [[ "${TOKEN}" == "your-localstack-pro-auth-token-here" ]]; then
    print_error "Please provide a real LocalStack Pro auth token"
    print_info "Get your token from https://app.localstack.cloud/"
    exit 1
fi

# Update .env.local file
print_info "Updating .env.local file..."

# Create a temporary file for the update
TEMP_FILE=$(mktemp)

# Replace the token line in .env.local
while IFS= read -r line; do
    if [[ $line == LOCALSTACK_AUTH_TOKEN=* ]]; then
        echo "LOCALSTACK_AUTH_TOKEN=${TOKEN}" >> "${TEMP_FILE}"
    else
        echo "$line" >> "${TEMP_FILE}"
    fi
done < "${ENV_LOCAL_FILE}"

# Replace the original file
mv "${TEMP_FILE}" "${ENV_LOCAL_FILE}"

print_success "LocalStack Pro auth token updated in .env.local"

# Verify the update
if grep -q "LOCALSTACK_AUTH_TOKEN=${TOKEN}" "${ENV_LOCAL_FILE}"; then
    print_success "Token successfully configured"
else
    print_error "Failed to update token in .env.local"
    exit 1
fi

echo ""
print_info "Next steps:"
echo "1. Restart LocalStack services: docker-compose -f docker-compose.local.yml restart localstack"
echo "2. Run the deployment script: ./tools/deployment/deploy.sh local"
echo "3. Test Cognito functionality"

echo ""
print_warning "Security note:"
echo "- Keep your LocalStack Pro token secure"
echo "- Don't commit .env.local to version control"
echo "- The token is already added to .gitignore"

echo ""
print_success "LocalStack Pro auth token setup completed!"