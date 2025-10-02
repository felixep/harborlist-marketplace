#!/bin/bash

# HarborList Local Admin Setup Script
# This script sets up a local admin user for development/testing

set -e

echo "🚀 HarborList Local Admin Setup"
echo "================================"

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if ts-node is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not available. Please install Node.js and npm"
    exit 1
fi

# Set default environment variables for local development
export USERS_TABLE=${USERS_TABLE:-"boat-users"}
export AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "📋 Configuration:"
echo "   Users Table: $USERS_TABLE"
echo "   AWS Region: $AWS_REGION"
echo ""

# Default admin details for local development
DEFAULT_EMAIL="admin@harborlist.local"
DEFAULT_NAME="Local Admin"
DEFAULT_ROLE="super_admin"

# Check if admin already exists (optional check)
echo "🔍 Checking for existing admin user..."

# Create the admin user
echo "👤 Creating local admin user..."
echo "   Email: $DEFAULT_EMAIL"
echo "   Name: $DEFAULT_NAME"
echo "   Role: $DEFAULT_ROLE"
echo ""

# Run the admin creation script
npm run create-admin -- \
    --email "$DEFAULT_EMAIL" \
    --name "$DEFAULT_NAME" \
    --role "$DEFAULT_ROLE"

echo ""
echo "✅ Local admin setup complete!"
echo ""
echo "🌐 Next steps:"
echo "1. Start your frontend development server"
echo "2. Navigate to http://localhost:3000/admin/login"
echo "3. Use the credentials shown above to log in"
echo "4. Set up MFA when prompted"
echo ""
echo "💡 Tips:"
echo "- Save the generated password securely"
echo "- Use an authenticator app for MFA setup"
echo "- Change the password after first login"
echo ""