#!/bin/bash
set -e

echo "🚀 Solar Portal Starting..."

# Default config
export HA_URL="${HA_URL:-http://homeassistant:8123}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
export BACKEND_PORT="${BACKEND_PORT:-5000}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export DATA_DIR="/data/solar-portal"
export DB_FILE="$DATA_DIR/sqlite.db"

# Create data directory
mkdir -p "$DATA_DIR"

echo "Configuration:"
echo "  Frontend Port: $FRONTEND_PORT"
echo "  Backend Port: $BACKEND_PORT"
echo "  HA URL: $HA_URL"

# Create backend environment file
cat > /app/backend/.env << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
CORS_ORIGIN=*
LOG_LEVEL=$LOG_LEVEL
HA_URL=$HA_URL
DATABASE_URL=sqlite:$DB_FILE
JWT_SECRET=$(date +%s | sha256sum | base64 | head -c 32)
EOF

echo "✅ Configuration ready"

# Initialize database
touch "$DB_FILE"

echo "Starting backend..."
cd /app/backend
if [ -f "dist/index.js" ]; then
    node dist/index.js &
else
    npm start &
fi

echo "Starting frontend..."
cd /app/frontend
if [ -d "dist" ]; then
    http-server dist -p $FRONTEND_PORT -c-1 &
else
    npm run dev -- --port $FRONTEND_PORT &
fi

echo "✅ Solar Portal started!"
echo "Frontend: http://homeassistant:$FRONTEND_PORT"
echo "Backend: http://homeassistant:$BACKEND_PORT"

# Keep container running
wait
