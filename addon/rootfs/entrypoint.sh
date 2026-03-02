#!/bin/bash
set -eu

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Define constants
CONFIG_PATH="/data/options.json"
DATA_DIR="/data/solar-portal"
DB_FILE="$DATA_DIR/sqlite.db"

# Create data directory
mkdir -p "$DATA_DIR"

# Read configuration from Home Assistant
if [ -f "$CONFIG_PATH" ]; then
    export HA_URL=$(jq -r '.ha_url // "http://homeassistant:8123"' "$CONFIG_PATH" 2>/dev/null || echo "http://homeassistant:8123")
    export FRONTEND_PORT=$(jq -r '.frontend_port // 3000' "$CONFIG_PATH" 2>/dev/null || echo "3000")
    export BACKEND_PORT=$(jq -r '.backend_port // 5000' "$CONFIG_PATH" 2>/dev/null || echo "5000")
    export LOG_LEVEL=$(jq -r '.log_level // "info"' "$CONFIG_PATH" 2>/dev/null || echo "info")
    export ENABLE_AGENT=$(jq -r '.enable_agent // false' "$CONFIG_PATH" 2>/dev/null || echo "false")
else
    export HA_URL="http://homeassistant:8123"
    export FRONTEND_PORT=3000
    export BACKEND_PORT=5000
    export LOG_LEVEL="info"
    export ENABLE_AGENT="false"
fi

echo -e "${GREEN}🚀 Solar Portal Add-on Starting${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Log configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  📍 Home Assistant: $HA_URL"
echo "  🌐 Frontend Port: $FRONTEND_PORT"
echo "  📡 Backend Port: $BACKEND_PORT"
echo "  📝 Log Level: $LOG_LEVEL"
echo "  🤖 Agent Enabled: $ENABLE_AGENT"

# Create backend environment file
echo -e "${YELLOW}Setting up Backend...${NC}"
cat > /app/backend/.env << EOF
NODE_ENV=production
BACKEND_PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
CORS_ORIGIN=*
LOG_LEVEL=$LOG_LEVEL
HA_URL=$HA_URL
DATABASE_URL=sqlite:$DB_FILE
JWT_SECRET=$(head -c 32 /dev/urandom | base64)
EOF

echo "✅ Backend environment configured"

# Create agent environment file (if enabled)
if [ "$ENABLE_AGENT" = "true" ]; then
    echo -e "${YELLOW}Setting up Agent...${NC}"
    cat > /app/agent/.env << EOF
HA_URL=$HA_URL
CLOUD_URL=http://localhost:$BACKEND_PORT/api
LOG_LEVEL=$LOG_LEVEL
NODE_ENV=production
EOF
    echo "✅ Agent environment configured"
fi

# Initialize database if needed
if [ ! -f "$DB_FILE" ]; then
    echo -e "${YELLOW}Creating database...${NC}"
    # Database initialization happens in backend startup
    touch "$DB_FILE"
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services configured!${NC}"
echo -e "${GREEN}🌐 Frontend: http://homeassistant:$FRONTEND_PORT${NC}"
echo -e "${GREEN}📡 Backend API: http://homeassistant:$BACKEND_PORT/api${NC}"
echo ""
echo -e "${YELLOW}⏳ Starting services...${NC}"

# Start backend
cd /app/backend
echo "Starting backend on port $BACKEND_PORT..."
node dist/index.js &
BACKEND_PID=$!

# Start frontend
cd /app/frontend
echo "Starting frontend on port $FRONTEND_PORT..."
if [ -d "dist" ]; then
    serve -s dist -l $FRONTEND_PORT &
else
    echo "Frontend dist not found, skipping..."
fi
FRONTEND_PID=$!

# Start agent if enabled
if [ "$ENABLE_AGENT" = "true" ]; then
    cd /app/agent
    echo "Starting agent..."
    node dist/index.js &
    AGENT_PID=$!
fi

echo -e "${GREEN}✅ All services started!${NC}"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
