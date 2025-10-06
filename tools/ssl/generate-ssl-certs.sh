#!/bin/bash
# Generate SSL certificates for local development
# This script creates self-signed certificates for local.harborlist.com domains

set -e

echo "🔒 Generating SSL certificates for local development..."

# Create certificates directory
mkdir -p ./certs/local

# Generate CA key and certificate
echo "📋 Creating Certificate Authority..."
openssl genrsa -out ./certs/local/ca-key.pem 4096
openssl req -new -x509 -sha256 -key ./certs/local/ca-key.pem -out ./certs/local/ca-cert.pem -days 365 \
  -subj "/C=US/ST=CA/L=San Francisco/O=HarborList Local Dev/CN=HarborList Local CA"

# Generate server key
echo "🔑 Generating server key..."
openssl genrsa -out ./certs/local/server-key.pem 4096

# Create certificate signing request
echo "📝 Creating certificate signing request..."
openssl req -new -sha256 -key ./certs/local/server-key.pem -out ./certs/local/server.csr \
  -subj "/C=US/ST=CA/L=San Francisco/O=HarborList Local Dev/CN=local.harborlist.com"

# Create extensions file for SAN (Subject Alternative Names)
cat > ./certs/local/server-ext.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = San Francisco
O = HarborList Local Dev
CN = local.harborlist.com

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = local.harborlist.com
DNS.2 = local-api.harborlist.com
DNS.3 = traefik.local.harborlist.com
DNS.4 = localhost
IP.1 = 127.0.0.1
EOF

# Generate signed certificate
echo "🏆 Generating signed certificate..."
openssl x509 -req -sha256 -in ./certs/local/server.csr -CA ./certs/local/ca-cert.pem -CAkey ./certs/local/ca-key.pem \
  -out ./certs/local/server-cert.pem -days 365 -extensions v3_req -extfile ./certs/local/server-ext.cnf -CAcreateserial

# Set permissions
chmod 600 ./certs/local/server-key.pem
chmod 644 ./certs/local/server-cert.pem ./certs/local/ca-cert.pem

# Clean up temporary files
rm ./certs/local/server.csr ./certs/local/server-ext.cnf

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificates created in ./certs/local/:"
echo "   - ca-cert.pem (Certificate Authority)"
echo "   - server-cert.pem (Server certificate)" 
echo "   - server-key.pem (Private key)"
echo ""
echo "🔧 To trust the CA certificate on macOS:"
echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/local/ca-cert.pem"
echo ""
echo "🔧 To trust the CA certificate on Linux:"
echo "   sudo cp ./certs/local/ca-cert.pem /usr/local/share/ca-certificates/harborlist-local-ca.crt"
echo "   sudo update-ca-certificates"
echo ""
echo "🌐 Domains covered:"
echo "   - local.harborlist.com"
echo "   - local-api.harborlist.com" 
echo "   - traefik.local.harborlist.com"
echo "   - localhost"