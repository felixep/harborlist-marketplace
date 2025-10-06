# SSL Certificate Management Tools

This directory contains tools for managing SSL certificates in the HarborList marketplace development environment.

## 📋 Available Tools

### `generate-ssl-certs.sh`
Generates self-signed SSL certificates for local development with custom domains.

**Purpose:**
- Creates Certificate Authority (CA) for local development
- Generates server certificates with proper Subject Alternative Names (SAN)  
- Supports multiple domains: `local.harborlist.com`, `local-api.harborlist.com`, `traefik.local.harborlist.com`
- Enables HTTPS in local development environment

**Usage:**
```bash
# Direct execution
./tools/ssl/generate-ssl-certs.sh

# Via npm script
npm run dev:setup:ssl
```

**Generated Files:**
- `./certs/local/ca-cert.pem` - Certificate Authority certificate
- `./certs/local/server-cert.pem` - Server certificate  
- `./certs/local/server-key.pem` - Private key

**Trust Certificate on macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/local/ca-cert.pem
```

**Trust Certificate on Linux:**
```bash
sudo cp ./certs/local/ca-cert.pem /usr/local/share/ca-certificates/harborlist-local-ca.crt
sudo update-ca-certificates
```

## 🔗 Integration

The SSL certificates are automatically used by:
- **Traefik** reverse proxy for HTTPS termination
- **Docker Compose** enhanced profile for local development
- **Custom domains** configured in `/etc/hosts`

## 📚 Documentation

For more information about SSL setup and troubleshooting:
- [SSL Encryption Guide](../../docs/deployment/ssl-encryption.md)
- [Local Development Troubleshooting](../../docs/troubleshooting/local-development.md)
- [Docker Profiles Guide](../../docs/deployment/docker-profiles-guide.md)

## 🔧 Prerequisites

- OpenSSL installed on your system
- Write permissions to `./certs/local/` directory
- Docker and Docker Compose for SSL integration

---

*Part of the HarborList tools ecosystem - organized under `tools/` for better maintainability.*