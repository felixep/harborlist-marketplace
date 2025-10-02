#!/bin/bash

# Cloudflare Tunnel Configuration Backup Script
# This script creates backups of tunnel configuration files and uploads them to S3

set -e

# Configuration
BACKUP_DIR="/opt/cloudflare-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tunnel-config-backup-$DATE.tar.gz"
LOG_FILE="/var/log/tunnel-backup.log"
RETENTION_DAYS=30

# S3 configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="dev-environment/tunnel-configs"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Create configuration backup
create_backup() {
    log "Starting backup creation..."
    
    # Check if configuration files exist
    if [ ! -f "/etc/cloudflared/config.yml" ]; then
        log "ERROR: Configuration file not found at /etc/cloudflared/config.yml"
        exit 1
    fi
    
    # Create backup archive
    tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
        /etc/cloudflared/config.yml \
        /etc/cloudflared/*.json \
        /etc/systemd/system/cloudflared.service \
        2>/dev/null || {
        log "ERROR: Failed to create backup archive"
        exit 1
    }
    
    log "Backup created: $BACKUP_DIR/$BACKUP_FILE"
    
    # Verify backup integrity
    if tar -tzf "$BACKUP_DIR/$BACKUP_FILE" >/dev/null 2>&1; then
        log "Backup integrity verified"
    else
        log "ERROR: Backup integrity check failed"
        exit 1
    fi
}

# Upload to S3 if configured
upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading backup to S3..."
        
        if aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE"; then
            log "Backup uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE"
        else
            log "WARNING: Failed to upload backup to S3"
        fi
    else
        log "S3 backup not configured (BACKUP_S3_BUCKET not set)"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
    local_count=$(find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" | wc -l)
    log "Local backups remaining: $local_count"
    
    # S3 cleanup if configured
    if [ -n "$S3_BUCKET" ]; then
        # Note: This requires AWS CLI with appropriate permissions
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | \
        awk '{print $4}' | \
        grep "tunnel-config-backup-" | \
        while read -r file; do
            file_date=$(echo "$file" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            if [ -n "$file_date" ]; then
                file_timestamp=$(date -d "${file_date:0:8} ${file_date:9:2}:${file_date:11:2}:${file_date:13:2}" +%s 2>/dev/null || echo "0")
                current_timestamp=$(date +%s)
                age_days=$(( (current_timestamp - file_timestamp) / 86400 ))
                
                if [ "$age_days" -gt "$RETENTION_DAYS" ]; then
                    aws s3 rm "s3://$S3_BUCKET/$file"
                    log "Deleted old S3 backup: $file"
                fi
            fi
        done
    fi
}

# Create system health snapshot
create_health_snapshot() {
    local health_file="$BACKUP_DIR/system-health-$DATE.txt"
    
    {
        echo "=== System Health Snapshot - $DATE ==="
        echo ""
        echo "=== Tunnel Service Status ==="
        systemctl status cloudflared || echo "Service status check failed"
        echo ""
        echo "=== System Resources ==="
        echo "CPU and Memory:"
        top -bn1 | head -5
        echo ""
        echo "Disk Usage:"
        df -h
        echo ""
        echo "=== Network Connectivity ==="
        echo "Ping Cloudflare DNS:"
        ping -c 3 1.1.1.1 || echo "Ping failed"
        echo ""
        echo "=== Recent Tunnel Logs ==="
        journalctl -u cloudflared -n 20 --no-pager || echo "Log retrieval failed"
        echo ""
        echo "=== Configuration Files ==="
        echo "Config file exists:"
        ls -la /etc/cloudflared/config.yml || echo "Config file not found"
        echo "Credentials files:"
        ls -la /etc/cloudflared/*.json || echo "Credentials files not found"
    } > "$health_file"
    
    log "System health snapshot created: $health_file"
    
    # Upload health snapshot to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        aws s3 cp "$health_file" "s3://$S3_BUCKET/$S3_PREFIX/health-snapshots/" || \
        log "WARNING: Failed to upload health snapshot to S3"
    fi
}

# Main execution
main() {
    log "=== Starting Cloudflare Tunnel Backup ==="
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log "ERROR: This script must be run as root"
        exit 1
    fi
    
    create_backup_dir
    create_backup
    create_health_snapshot
    upload_to_s3
    cleanup_old_backups
    
    log "=== Backup completed successfully ==="
    
    # Display backup summary
    echo ""
    echo "Backup Summary:"
    echo "- Backup file: $BACKUP_DIR/$BACKUP_FILE"
    echo "- Size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
    echo "- Local backups: $(find "$BACKUP_DIR" -name "tunnel-config-backup-*.tar.gz" | wc -l)"
    if [ -n "$S3_BUCKET" ]; then
        echo "- S3 location: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE"
    fi
}

# Run main function
main "$@"