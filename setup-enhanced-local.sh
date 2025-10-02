#!/bin/bash

# Enhanced HarborList Local Development Setup with Traefik
# This script sets up a complete Cloudflare-like environment using Traefik

set -e

echo "🐳 HarborList Enhanced Local Development Setup"
echo "=============================================="
echo "🔥 Now with Traefik (Cloudflare simulation)!"
echo ""

# Configuration
COMPOSE_FILE="docker-compose.local.yml"
PROFILE="enhanced"
HOSTS_FILE="/etc/hosts"

# Function to add hosts entries
setup_hosts() {
    echo "🌐 Setting up local domain entries..."
    
    # Check if entries already exist
    if ! grep -q "# HarborList Enhanced Local Development" "$HOSTS_FILE"; then
        echo "Adding domain entries to $HOSTS_FILE (requires sudo)..."
        
        sudo tee -a "$HOSTS_FILE" > /dev/null << 'EOF'

#!/bin/bash
# Enhanced Local Development Environment Setup with Traefik
# This script sets up the enhanced environment with SSL-enabled domains

set -e

echo "🔥 Setting up enhanced HarborList development environment..."

# Generate SSL certificates if they don't exist
if [ ! -f "./certs/local/server-cert.pem" ]; then
    echo "🔒 Generating SSL certificates for local development..."
    ./scripts/generate-ssl-certs.sh
else
    echo "✅ SSL certificates already exist"
fi

# Add local domains to /etc/hosts if not already present
HOSTS_FILE="/etc/hosts"
DOMAINS=(
    "127.0.0.1 local.harborlist.com"
    "127.0.0.1 local-api.harborlist.com" 
    "127.0.0.1 traefik.local.harborlist.com"
)
EOF
        echo "✅ Domain entries added"
    else
        echo "✅ Domain entries already exist"
    fi
}

# Function to create directories
setup_directories() {
    echo "📁 Creating required directories..."
    
    mkdir -p traefik-config
    mkdir -p cdn-content
    mkdir -p cdn-content/images
    mkdir -p cdn-content/assets
    mkdir -p cdn-content/docs
    
    # Create sample CDN content
    if [ ! -f "cdn-content/index.html" ]; then
        cat > cdn-content/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>HarborList CDN</title>
</head>
<body>
    <h1>🚢 HarborList Local CDN</h1>
    <p>This simulates Cloudflare CDN functionality</p>
    <ul>
        <li><a href="/health">Health Check</a></li>
        <li><a href="/images/">Images</a></li>
        <li><a href="/assets/">Assets</a></li>
        <li><a href="/docs/">Documents</a></li>
    </ul>
</body>
</html>
EOF
    fi
    
    echo "✅ Directories created"
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
}

# Function to start services
start_services() {
    echo "🚀 Starting enhanced services with Traefik..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose --profile "$PROFILE" -f "$COMPOSE_FILE" up -d
    else
        docker compose --profile "$PROFILE" -f "$COMPOSE_FILE" up -d
    fi
    
    echo "✅ Services started"
}

# Function to wait for services
wait_for_services() {
    echo "⏳ Waiting for services to be ready..."
    
    # Wait for Traefik
    echo "   Waiting for Traefik..."
    until curl -s http://localhost:8080/api/rawdata > /dev/null 2>&1; do
        sleep 2
    done
    
    # Wait for DynamoDB
    echo "   Waiting for DynamoDB..."
    until curl -s http://localhost:8000 > /dev/null 2>&1; do
        sleep 2
    done
    
    # Wait for LocalStack
    echo "   Waiting for LocalStack..."
    until curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; do
        sleep 2
    done
    
    # Wait for frontend through Traefik
    echo "   Waiting for frontend..."
    until curl -s -H "Host: local.harborlist.com" http://localhost > /dev/null 2>&1; do
        sleep 2
    done
    
    echo "✅ All services ready"
}

# Function to setup database
setup_database() {
    echo "🗄️ Setting up database..."
    
    if [ -f "backend/scripts/setup-local-db.sh" ]; then
        cd backend
        ./scripts/setup-local-db.sh
        cd ..
    else
        echo "⚠️ Database setup script not found, skipping..."
    fi
}

# Function to display information
show_info() {
    echo ""
    echo "🎉 Enhanced HarborList Local Development Environment Ready!"
    echo "=========================================================="
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:         https://local.harborlist.com"
    echo "   API:              https://api.local.harborlist.com"
    echo "   CDN:              https://cdn.local.harborlist.com"
    echo "   DynamoDB Admin:   http://dynamodb.local.harborlist.com"
    echo "   LocalStack:       http://localstack.local.harborlist.com"
    echo "   Traefik Dashboard: http://traefik.local.harborlist.com"
    echo ""
    echo "🛠️ Management URLs:"
    echo "   Traefik Dashboard: http://localhost:8080"
    echo "   DynamoDB Local:    http://localhost:8000"
    echo "   LocalStack:        http://localhost:4566"
    echo "   Redis:             redis://localhost:6379"
    echo ""
    echo "✨ Enhanced Features:"
    echo "   🔒 SSL/TLS termination (self-signed certs)"
    echo "   🚦 Rate limiting (mimics Cloudflare)"
    echo "   🛡️ Security headers"
    echo "   📊 Access logging"
    echo "   🗜️ Gzip compression"
    echo "   🚀 CDN simulation with caching"
    echo "   🔄 Load balancing ready"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Create admin user: npm run dev:admin"
    echo "   2. View logs: npm run dev:logs"
    echo "   3. Monitor Traefik: open http://traefik.local.harborlist.com"
    echo ""
    echo "💡 Pro Tips:"
    echo "   - Traefik automatically discovers new services"
    echo "   - SSL certificates are auto-generated"
    echo "   - Rate limiting protects against abuse"
    echo "   - CDN serves static content with proper headers"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    setup_hosts
    setup_directories
    start_services
    wait_for_services
    setup_database
    show_info
}

# Execute main function
main "$@"