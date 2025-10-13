#!/bin/bash

# HarborList Admin User Creation Script
# 
# This script creates admin users across different environments.
# It supports both local development and cloud deployments.
#
# Author: HarborList Team
# Version: 1.0.0

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="local"
EMAIL="admin@harborlist.com"
NAME="HarborList Admin"
ROLE="super_admin"
PASSWORD=""
PERMISSIONS=""
FORCE=false
DRY_RUN=false
RESET_PASSWORD=false
UPDATE_ROLE=false

# Environment-specific configurations
get_env_config() {
    case $1 in
        local)
            echo "USERS_TABLE=harborlist-users AWS_REGION=us-east-1 DYNAMODB_ENDPOINT=http://localhost:8000"
            ;;
        dev)
            echo "USERS_TABLE=harborlist-users-dev AWS_REGION=us-east-1"
            ;;
        staging)
            echo "USERS_TABLE=harborlist-users-staging AWS_REGION=us-east-1"
            ;;
        prod)
            echo "USERS_TABLE=harborlist-users-prod AWS_REGION=us-east-1"
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print script header
print_header() {
    echo
    print_color $CYAN "╔══════════════════════════════════════════════════════════════╗"
    print_color $CYAN "║                 HarborList Admin User Creator                ║"
    print_color $CYAN "║              Operations Management Script v1.0              ║"
    print_color $CYAN "╚══════════════════════════════════════════════════════════════╝"
    echo
}

# Function to print usage information
print_usage() {
    cat << EOF
$(print_color $CYAN "🚀 HarborList Admin User Creation Script")

$(print_color $YELLOW "USAGE:")
    $0 [OPTIONS]

$(print_color $YELLOW "OPTIONS:")
    -e, --email <email>      Admin user email address [default: admin@harborlist.com]
    -n, --name <name>        Admin user full name [default: HarborList Admin]
    -r, --role <role>        Admin role [default: super_admin]
    -E, --environment <env>  Target environment (local, dev, staging, prod) [default: local]
    -p, --password <pass>    Custom password (if not provided, one will be generated)
    -P, --permissions <list> Comma-separated permissions (overrides role defaults)
    --reset-password        Reset password if user already exists
    --update-role           Update role for existing user
    -f, --force             Skip confirmation prompts
    -d, --dry-run           Show what would be done without executing
    -h, --help              Show this help message

$(print_color $YELLOW "AVAILABLE ROLES:")
    $(print_color $GREEN "super_admin") - Full system access (all permissions)
    $(print_color $GREEN "admin")       - User management, content moderation, analytics
    $(print_color $GREEN "moderator")   - Content moderation and audit log access
    $(print_color $GREEN "support")     - Limited support access (audit logs only)

$(print_color $YELLOW "AVAILABLE PERMISSIONS:")
    - user_management: Manage user accounts and profiles
    - content_moderation: Moderate listings and user content
    - analytics_view: View system analytics and reports
    - audit_log_view: Access audit logs and system events
    - system_config: Modify system configuration
    - financial_reports: Access financial and payment reports

$(print_color $YELLOW "EXAMPLES:")
    # Create default admin (admin@harborlist.com with super_admin role)
    $0

    # Create admin with custom email
    $0 --email admin@company.com

    # Reset password for existing admin
    $0 --reset-password

    # Update role for existing admin
    $0 --email admin@harborlist.com --role super_admin --update-role

    # Create a production admin with custom password
    $0 --environment prod \\
       --email admin@company.com \\
       --name "Production Admin" \\
       --role admin \\
       --password "SecurePass123!"

    # Create a moderator for staging with specific permissions
    $0 --environment staging \\
       --email mod@harborlist.com \\
       --name "Content Moderator" \\
       --role moderator \\
       --permissions "content_moderation,audit_log_view"

    # Dry run to see what would be created
    $0 --dry-run --email test@example.com --name "Test User" --role admin

$(print_color $YELLOW "ENVIRONMENT SETUP:")
    Each environment requires specific AWS credentials and table configurations:
    
    $(print_color $GREEN "Local:")     Uses local DynamoDB or default AWS credentials
    $(print_color $GREEN "Dev:")       Requires dev environment AWS profile/credentials
    $(print_color $GREEN "Staging:")   Requires staging environment AWS profile/credentials  
    $(print_color $GREEN "Production:") Requires production AWS profile/credentials

$(print_color $YELLOW "PREREQUISITES:")
    - Node.js and npm installed
    - TypeScript and ts-node available
    - AWS credentials configured for target environment
    - Backend dependencies installed (npm install in backend/)

EOF
}

# Function to validate email format
validate_email() {
    local email=$1
    if [[ ! $email =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_color $RED "❌ Error: Invalid email format: $email"
        exit 1
    fi
}

# Function to validate role
validate_role() {
    local role=$1
    case $role in
        super_admin|admin|moderator|support)
            return 0
            ;;
        *)
            print_color $RED "❌ Error: Invalid role: $role"
            print_color $YELLOW "Valid roles: super_admin, admin, moderator, support"
            exit 1
            ;;
    esac
}

# Function to validate environment
validate_environment() {
    local env=$1
    if ! get_env_config "$env" > /dev/null 2>&1; then
        print_color $RED "❌ Error: Invalid environment: $env"
        print_color $YELLOW "Valid environments: local, dev, staging, prod"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_color $BLUE "🔍 Checking prerequisites..."

    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        print_color $RED "❌ Error: Not in HarborList project directory"
        print_color $YELLOW "Please run this script from the HarborList project root or tools/operations/"
        exit 1
    fi

    # Check if backend directory exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        print_color $RED "❌ Error: Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_color $RED "❌ Error: Node.js is not installed"
        print_color $YELLOW "Please install Node.js: https://nodejs.org/"
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_color $RED "❌ Error: npm is not installed"
        exit 1
    fi

    # Check if ts-node is available
    if ! command -v npx &> /dev/null; then
        print_color $RED "❌ Error: npx is not available"
        exit 1
    fi

    # Check if backend dependencies are installed
    if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
        print_color $YELLOW "⚠️  Backend dependencies not found. Installing..."
        cd "$BACKEND_DIR"
        npm install
        cd - > /dev/null
    fi

    # Check if the TypeScript script exists
    if [[ ! -f "$BACKEND_DIR/scripts/create-admin-user.ts" ]]; then
        print_color $RED "❌ Error: Admin user creation script not found"
        print_color $YELLOW "Expected: $BACKEND_DIR/scripts/create-admin-user.ts"
        exit 1
    fi

    print_color $GREEN "✅ Prerequisites check passed"
}

# Function to set up environment variables
setup_environment() {
    local env=$1
    print_color $BLUE "🔧 Setting up environment for: $env"
    
    # Set environment-specific variables
    local env_config
    env_config=$(get_env_config "$env")
    export $env_config
    
    print_color $GREEN "✅ Environment configured:"
    echo "   USERS_TABLE: ${USERS_TABLE:-not set}"
    echo "   AWS_REGION: ${AWS_REGION:-not set}"
}

# Function to confirm user creation
confirm_creation() {
    if [[ $FORCE == true ]]; then
        return 0
    fi

    echo
    print_color $YELLOW "📋 Admin User Creation Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Email: $EMAIL"
    echo "   Name: $NAME"
    echo "   Role: $ROLE"
    [[ -n $PASSWORD ]] && echo "   Password: [provided]" || echo "   Password: [will be generated]"
    [[ -n $PERMISSIONS ]] && echo "   Permissions: $PERMISSIONS" || echo "   Permissions: [role defaults]"
    echo "   Users Table: ${USERS_TABLE:-not set}"
    echo "   AWS Region: ${AWS_REGION:-not set}"
    echo

    read -p "$(print_color $CYAN "Are you sure you want to create this admin user? [y/N]: ")" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color $YELLOW "❌ Operation cancelled by user"
        exit 0
    fi
}

# Function to create admin user
create_admin_user() {
    print_color $BLUE "👤 Creating admin user..."

    # Build command arguments
    local cmd_args=()
    cmd_args+=(--email "$EMAIL")
    cmd_args+=(--name "$NAME")
    cmd_args+=(--role "$ROLE")
    
    [[ -n $PASSWORD ]] && cmd_args+=(--password "$PASSWORD")
    [[ -n $PERMISSIONS ]] && cmd_args+=(--permissions "$PERMISSIONS")
    [[ $RESET_PASSWORD == true ]] && cmd_args+=(--reset-password)
    [[ $UPDATE_ROLE == true ]] && cmd_args+=(--update-role)

    if [[ $DRY_RUN == true ]]; then
        print_color $YELLOW "🧪 DRY RUN - Would execute:"
        print_color $CYAN "cd $BACKEND_DIR && npm run create-admin -- ${cmd_args[*]}"
        return 0
    fi

    # Execute the TypeScript script
    cd "$BACKEND_DIR"
    if npm run create-admin -- "${cmd_args[@]}"; then
        print_color $GREEN "✅ Admin user created successfully!"
        
        # Additional post-creation information
        echo
        print_color $PURPLE "📝 Post-Creation Notes:"
        case $ENVIRONMENT in
            local)
                echo "   • Access admin panel at: http://local.harborlist.com/admin"
                echo "   • Use the generated credentials to log in"
                ;;
            dev)
                echo "   • Access admin panel at: https://dev-admin.harborlist.com/admin"
                echo "   • MFA setup will be required on first login"
                ;;
            staging)
                echo "   • Access admin panel at: https://staging-admin.harborlist.com/admin"
                echo "   • MFA setup will be required on first login"
                ;;
            prod)
                echo "   • Access admin panel at: https://admin.harborlist.com/admin"
                echo "   • MFA setup is MANDATORY for production"
                echo "   • Change password immediately after first login"
                ;;
        esac
        
        echo "   • Save generated credentials securely"
        echo "   • Set up MFA after first login"
        echo "   • Review user permissions and adjust if needed"
        
    else
        print_color $RED "❌ Failed to create admin user"
        exit 1
    fi
    
    cd - > /dev/null
}

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            -n|--name)
                NAME="$2"
                shift 2
                ;;
            -r|--role)
                ROLE="$2"
                shift 2
                ;;
            -E|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -p|--password)
                PASSWORD="$2"
                shift 2
                ;;
            -P|--permissions)
                PERMISSIONS="$2"
                shift 2
                ;;
            --reset-password)
                RESET_PASSWORD=true
                shift
                ;;
            --update-role)
                UPDATE_ROLE=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                print_color $RED "❌ Error: Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
}

# Function to validate arguments (all have defaults now)
validate_arguments() {
    # Display defaults being used
    if [[ $EMAIL == "admin@harborlist.com" ]]; then
        print_color $BLUE "📧 Using default email: admin@harborlist.com"
    fi
    if [[ $NAME == "HarborList Admin" ]]; then
        print_color $BLUE "👤 Using default name: HarborList Admin"
    fi
    if [[ $ROLE == "super_admin" ]]; then
        print_color $BLUE "🔑 Using default role: super_admin"
    fi

    # Validate individual fields
    validate_email "$EMAIL"
    validate_role "$ROLE"
    validate_environment "$ENVIRONMENT"
}

# Main function
main() {
    print_header

    # Parse command line arguments
    parse_arguments "$@"

    # Show help if no arguments provided
    if [[ $# -eq 0 ]]; then
        print_usage
        exit 0
    fi

    # Validate arguments
    validate_arguments

    # Check prerequisites
    check_prerequisites

    # Set up environment
    setup_environment "$ENVIRONMENT"

    # Confirm creation (unless forced or dry run)
    if [[ $DRY_RUN == false ]]; then
        confirm_creation
    fi

    # Create the admin user
    create_admin_user

    print_color $GREEN "🎉 Admin user creation process completed!"
}

# Run main function with all arguments
main "$@"