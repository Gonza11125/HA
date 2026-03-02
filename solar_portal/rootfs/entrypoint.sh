#!/bin/bash
set -e

echo "🚀 Solar Portal Test Starting..."

# Simple test - just run backend
cd /app/backend
echo "Starting backend..."
npm start &

# Keep running
tail -f /dev/null
