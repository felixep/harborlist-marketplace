#!/bin/bash

# Build script for Lambda functions

echo "Building backend Lambda functions..."

# Clean previous build
rm -rf dist/

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create deployment packages for each function
mkdir -p dist/packages

# Function directories
FUNCTIONS=("auth-service" "listing" "search" "media" "email" "stats-service")

for func in "${FUNCTIONS[@]}"; do
    echo "Packaging $func function..."
    
    # Create function package directory
    mkdir -p "dist/packages/$func"
    
    # Copy built files maintaining directory structure
    if [ "$func" = "media" ]; then
        # For media function, maintain the directory structure
        mkdir -p "dist/packages/$func/media"
        cp -r "dist/$func/"* "dist/packages/$func/media/"
        cp -r "dist/shared/" "dist/packages/$func/"
        cp -r "dist/types/" "dist/packages/$func/"
    else
        cp -r "dist/$func/" "dist/packages/$func/"
        cp -r "dist/shared/" "dist/packages/$func/"
        cp -r "dist/types/" "dist/packages/$func/"
    fi
    
    # Copy package.json and install production dependencies
    cp package.json "dist/packages/$func/"
    cd "dist/packages/$func"
    
    # For media function, install sharp for Linux Lambda environment
    if [ "$func" = "media" ]; then
        echo "Installing sharp for Linux Lambda environment..."
        # Remove any existing sharp installation
        rm -rf node_modules/sharp
        # Install sharp specifically for Linux x64
        npm install --platform=linux --arch=x64 sharp --silent
        # Also install other production dependencies
        npm install --production --silent
    else
        npm install --production --silent
    fi
    
    cd ../../../
    
    # Create ZIP file for Lambda deployment
    cd "dist/packages/$func"
    zip -r "../$func.zip" . -q
    cd ../../../
    
    echo "✅ $func function packaged"
done

echo "🚀 All Lambda functions built and packaged successfully!"
echo "📦 Deployment packages available in dist/packages/"
