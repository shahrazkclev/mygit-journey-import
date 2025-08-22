#!/bin/bash

# Netlify build script for the Email Campaign Manager
echo "🚀 Starting Netlify build process..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️ Building the project..."
npm run build

# Copy _redirects to build directory
echo "📄 Copying _redirects file..."
cp public/_redirects build/_redirects

echo "✅ Build completed successfully!"
echo "📁 Build output is in: frontend/build/"