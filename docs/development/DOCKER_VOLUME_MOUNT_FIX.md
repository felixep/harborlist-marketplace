# Docker Volume Mount File Update Fix

## Issue: sed -i fails with "Resource busy" on Docker Volume Mounts

### Problem Description

When running `setup-local-cognito.sh` inside the `init-cognito` Docker container, the script failed with:

```
sed: cannot rename .env.local: Resource busy
```

**Exit Code**: 4

### Root Cause

The `.env.local` file is mounted as a Docker volume in the `init-cognito` container:

```yaml
volumes:
  - ./.env.local:/workspace/.env.local
```

The `sed -i.bak` command:
1. Creates a temporary file with the changes
2. Attempts to **rename** the temp file to replace the original
3. The rename operation fails on Docker volume mounts because the inode is managed by the Docker daemon

### Solution

Replaced `sed -i` with a Docker-volume-friendly approach using `awk` and direct file writes:

#### Before (Failed)
```bash
update_or_append() {
    local key=$1
    local value=$2
    local file=$3
    
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"  # ❌ Fails on volume mount
    else
        echo "${key}=${value}" >> "$file"
    fi
}
```

#### After (Works)
```bash
update_or_append() {
    local key=$1
    local value=$2
    local file=$3
    local temp_file="/tmp/$(basename $file).tmp"
    
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Use awk to update, write to temp, then cat back (no rename)
        awk -v key="$key" -v value="$value" \
            'BEGIN {found=0} 
             $0 ~ "^"key"=" {print key"="value; found=1; next} 
             {print} 
             END {if(!found) print key"="value}' "$file" > "$temp_file"
        cat "$temp_file" > "$file"  # ✅ Direct write, no rename
        rm -f "$temp_file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}
```

### Why This Works

1. **awk** creates a new file with the changes in `/tmp/`
2. **cat** writes the content directly to the mounted file (no rename operation)
3. Docker volume mount allows **writes** but not **renames**

### Files Modified

- **tools/development/setup-local-cognito.sh**
  - Updated `update_env_local()` function
  - Removed `.bak` file cleanup (no longer created)

### Testing

```bash
# Clean deployment
./tools/deployment/cleanup.sh local --force

# Deploy with fix
./tools/deployment/deploy.sh local

# Verify Pool IDs were written
grep "POOL_ID" .env.local
```

Expected output:
```bash
CUSTOMER_USER_POOL_ID=us-east-1_xxxxx
CUSTOMER_USER_POOL_CLIENT_ID=xxxxx
STAFF_USER_POOL_ID=us-east-1_xxxxx
STAFF_USER_POOL_CLIENT_ID=xxxxx
```

### Key Learnings

#### Docker Volume Mounts

1. **Mounted files are special** - They're not regular files but bind mounts
2. **Writes work** - You can write directly to the file
3. **Renames fail** - Operations that rename/move files fail
4. **Sed -i uses rename** - This is why it fails on mounts

#### Best Practices for File Updates in Containers

✅ **DO**:
- Use direct writes: `cat newcontent > file`
- Use redirection: `command > file`
- Use awk with temp files and cat back

❌ **DON'T**:
- Use `sed -i` (uses rename)
- Use `mv` to replace files
- Assume file operations work like on host

#### Alternative Solutions

**Option 1**: Use temp file and cat (current solution)
```bash
awk '...' file > /tmp/temp && cat /tmp/temp > file
```

**Option 2**: Read entire file, modify in memory, write back
```bash
content=$(sed 's/pattern/replacement/' file)
echo "$content" > file
```

**Option 3**: Use perl in-place editing (if available)
```bash
perl -pi -e 's/pattern/replacement/' file  # Works on some systems
```

### Related Issues

- Exit code 4 from init-cognito container
- Similar issues may affect any script modifying mounted files
- cleanup.sh doesn't have this issue (runs on host, not in container)

### Version History

- **v1.0** (2025-10-17) - Initial fix for Docker volume mount file updates
- Issue discovered after successful Cognito pool creation
- All pools and groups created successfully before file update failed

## Related Documentation

- [Docker Init Container Fixes](./DOCKER_INIT_CONTAINER_FIXES.md)
- [Cognito Deployment Flow](./COGNITO_DEPLOYMENT_FLOW.md)
- [Docker Documentation: Bind Mounts](https://docs.docker.com/storage/bind-mounts/)
