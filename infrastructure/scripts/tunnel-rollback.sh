#!/bin/bash

# Cloudflare Tunnel Emergency Rollback Script
# This script provides automated rollback capabilities for tunnel configuration

set -e

# Configuration
BACKUP_DIR="/opt/cloudflare-backups"
CONFIG_DIR="/etc/cloudflared"
LOG_FILE="/var/log/tunnel-rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Colored output functions
error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
        exit 1
    fi
}

# List available backups
list_backups() {
    echo ""
    echo "Available configuration backups:"
    echo "================================="
    
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" -type f | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    for i in "${!backups[@]}"; do
        local backup_file="${backups[$i]}"
        local backup_name=$(basename "$backup_file")
        local backup_date=$(echo "$backup_name" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
        local formatted_date=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        echo "$((i+1)). $backup_name"
        echo "   Date: $formatted_date"
        echo "   Size: $file_size"
        echo "   Path: $backup_file"
        echo ""
    done
    
    echo "${#backups[@]} backup(s) found"
}

# Validate backup file
validate_backup() {
    local backup_file="$1"
    
    log "Validating backup file: $backup_file"
    
    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if it's a valid tar.gz file
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        error "Invalid backup file (not a valid tar.gz): $backup_file"
        return 1
    fi
    
    # Check if it contains expected files
    local expected_files=("etc/cloudflared/config.yml" "etc/systemd/system/cloudflared.service")
    for expected_file in "${expected_files[@]}"; do
        if ! tar -tzf "$backup_file" | grep -q "$expected_file"; then
            error "Backup file missing expected file: $expected_file"
            return 1
        fi
    done
    
    success "Backup file validation passed"
    return 0
}

# Create pre-rollback backup
create_pre_rollback_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_rollback_file="$BACKUP_DIR/pre-rollback-backup-$timestamp.tar.gz"
    
    log "Creating pre-rollback backup..."
    
    if [ -f "$CONFIG_DIR/config.yml" ]; then
        tar -czf "$pre_rollback_file" \
            "$CONFIG_DIR/config.yml" \
            "$CONFIG_DIR"/*.json \
            /etc/systemd/system/cloudflared.service \
            2>/dev/null || {
            warning "Failed to create complete pre-rollback backup"
        }
        
        if [ -f "$pre_rollback_file" ]; then
            success "Pre-rollback backup created: $pre_rollback_file"
        fi
    else
        warning "No current configuration found to backup"
    fi
}

# Stop tunnel service
stop_tunnel_service() {
    log "Stopping Cloudflare tunnel service..."
    
    if systemctl is-active --quiet cloudflared; then
        systemctl stop cloudflared
        sleep 5
        
        if systemctl is-active --quiet cloudflared; then
            error "Failed to stop cloudflared service"
            return 1
        else
            success "Cloudflared service stopped"
        fi
    else
        log "Cloudflared service was not running"
    fi
    
    return 0
}

# Restore configuration from backup
restore_configuration() {
    local backup_file="$1"
    
    log "Restoring configuration from backup: $backup_file"
    
    # Extract backup to root filesystem
    if tar -xzf "$backup_file" -C /; then
        success "Configuration files restored"
    else
        error "Failed to restore configuration files"
        return 1
    fi
    
    # Set correct permissions
    chown -R cloudflared:cloudflared "$CONFIG_DIR"
    chmod 600 "$CONFIG_DIR"/*.json 2>/dev/null || true
    chmod 644 "$CONFIG_DIR/config.yml"
    
    # Reload systemd if service file was restored
    systemctl daemon-reload
    
    return 0
}

# Start tunnel service
start_tunnel_service() {
    log "Starting Cloudflare tunnel service..."
    
    # Enable service if not enabled
    if ! systemctl is-enabled --quiet cloudflared; then
        systemctl enable cloudflared
    fi
    
    # Start service
    systemctl start cloudflared
    sleep 10
    
    # Check if service started successfully
    if systemctl is-active --quiet cloudflared; then
        success "Cloudflared service started successfully"
        
        # Show service status
        echo ""
        echo "Service Status:"
        systemctl status cloudflared --no-pager -l
        
        return 0
    else
        error "Failed to start cloudflared service"
        
        # Show recent logs
        echo ""
        echo "Recent logs:"
        journalctl -u cloudflared -n 20 --no-pager
        
        return 1
    fi
}

# Test connectivity
test_connectivity() {
    local domain="${1:-dev.harborlist.com}"
    
    log "Testing connectivity to $domain..."
    
    # Wait a bit for tunnel to establish connection
    sleep 30
    
    # Test HTTP connectivity
    if curl -s -I "https://$domain" | head -1 | grep -q "200"; then
        success "Website is accessible: https://$domain"
        return 0
    else
        error "Website is not accessible: https://$domain"
        
        # Show tunnel logs for debugging
        echo ""
        echo "Recent tunnel logs:"
        journalctl -u cloudflared -n 10 --no-pager
        
        return 1
    fi
}

# Interactive rollback
interactive_rollback() {
    echo ""
    echo "=== Cloudflare Tunnel Configuration Rollback ==="
    echo ""
    
    list_backups
    
    echo ""
    read -p "Select backup number to restore (or 'q' to quit): " selection
    
    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        log "Rollback cancelled by user"
        exit 0
    fi
    
    # Validate selection
    local backups=($(find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" -type f | sort -r))
    local backup_index=$((selection - 1))
    
    if [ "$backup_index" -lt 0 ] || [ "$backup_index" -ge "${#backups[@]}" ]; then
        error "Invalid selection: $selection"
        exit 1
    fi
    
    local selected_backup="${backups[$backup_index]}"
    
    echo ""
    echo "Selected backup: $(basename "$selected_backup")"
    echo ""
    read -p "Are you sure you want to rollback to this configuration? (y/N): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log "Rollback cancelled by user"
        exit 0
    fi
    
    perform_rollback "$selected_backup"
}

# Automated rollback (latest backup)
automated_rollback() {
    log "Performing automated rollback to latest backup..."
    
    local latest_backup=$(find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" -type f | sort -r | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup files found for automated rollback"
        exit 1
    fi
    
    log "Using latest backup: $(basename "$latest_backup")"
    perform_rollback "$latest_backup"
}

# Perform the actual rollback
perform_rollback() {
    local backup_file="$1"
    
    log "=== Starting rollback process ==="
    
    # Validate backup
    if ! validate_backup "$backup_file"; then
        exit 1
    fi
    
    # Create pre-rollback backup
    create_pre_rollback_backup
    
    # Stop service
    if ! stop_tunnel_service; then
        exit 1
    fi
    
    # Restore configuration
    if ! restore_configuration "$backup_file"; then
        error "Configuration restoration failed"
        exit 1
    fi
    
    # Start service
    if ! start_tunnel_service; then
        error "Service startup failed after rollback"
        exit 1
    fi
    
    # Test connectivity
    if test_connectivity; then
        success "Rollback completed successfully!"
        log "=== Rollback process completed ==="
    else
        error "Rollback completed but connectivity test failed"
        log "Manual intervention may be required"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --interactive    Interactive rollback (select backup)"
    echo "  -a, --auto          Automated rollback (latest backup)"
    echo "  -l, --list          List available backups"
    echo "  -f, --file FILE     Rollback to specific backup file"
    echo "  -t, --test DOMAIN   Test connectivity to domain (default: dev.harborlist.com)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -i                                    # Interactive rollback"
    echo "  $0 -a                                    # Automated rollback to latest"
    echo "  $0 -f /opt/cloudflare-backups/backup.tar.gz  # Rollback to specific file"
    echo "  $0 -l                                    # List available backups"
    echo "  $0 -t dev.harborlist.com                # Test connectivity only"
}

# Main function
main() {
    check_root
    
    case "${1:-}" in
        -i|--interactive)
            interactive_rollback
            ;;
        -a|--auto)
            automated_rollback
            ;;
        -l|--list)
            list_backups
            ;;
        -f|--file)
            if [ -z "$2" ]; then
                error "Backup file path required"
                show_usage
                exit 1
            fi
            perform_rollback "$2"
            ;;
        -t|--test)
            test_connectivity "${2:-dev.harborlist.com}"
            ;;
        -h|--help)
            show_usage
            ;;
        "")
            echo "No option specified. Use -h for help."
            show_usage
            exit 1
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"