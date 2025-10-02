#!/bin/bash
# Sync shared types from backend to frontend
# This ensures types stay in sync during development

echo "🔄 Syncing shared types from backend to frontend..."

# Remove old types
rm -f frontend/src/types/common.ts

# Copy current types from backend
cp backend/src/types/common.ts frontend/src/types/

echo "✅ Types synced successfully!"
echo "📁 Source: backend/src/types/common.ts"
echo "📁 Target: frontend/src/types/common.ts"