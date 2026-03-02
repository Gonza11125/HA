#!/bin/bash
set -e

echo "[INFO] ========================================="
echo "[INFO] Solar Portal Add-on Starting..."
echo "[INFO] ========================================="

# Initialize and start PostgreSQL
echo "[INFO] Initializing PostgreSQL database..."
mkdir -p /data/postgres
chown postgres:postgres /data/postgres

# Initialize database if not exists
if [ ! -d "/data/postgres/base" ]; then
    su postgres -c "initdb -D /data/postgres"
    echo "[INFO] PostgreSQL initialized"
fi

# Start PostgreSQL
su postgres -c "postgres -D /data/postgres" &
POSTGRES_PID=$!
echo "[INFO] PostgreSQL started with PID $POSTGRES_PID"

# Wait for PostgreSQL to be ready
echo "[INFO] Waiting for PostgreSQL to be ready..."
sleep 5

# Create database if not exists
su postgres -c "psql -lqt" | cut -d \| -f 1 | grep -qw solar_portal || su postgres -c "createdb solar_portal"
echo "[INFO] Database 'solar_portal' ready"

# Start backend
cd /app/backend
echo "[INFO] Starting backend on port 5000..."
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_NAME=solar_portal NODE_ENV=production PORT=5000 npm start &
BACKEND_PID=$!
echo "[INFO] Backend started with PID $BACKEND_PID"

# Give backend time to start
sleep 3

# Start frontend
cd /app/frontend
echo "[INFO] Starting frontend on port 3000..."
serve -s dist -l 3000 &
FRONTEND_PID=$!
echo "[INFO] Frontend started with PID $FRONTEND_PID"

# Give frontend time to start
sleep 2

# Start agent (data collector)
cd /app/agent
echo "[INFO] Starting agent (data collector)..."
node dist/index.js &
AGENT_PID=$!
echo "[INFO] Agent started with PID $AGENT_PID"

echo "[INFO] ========================================="
echo "[INFO] Solar Portal is running!"
echo "[INFO] Frontend: http://YOUR_IP:3000"
echo "[INFO] Backend:  http://YOUR_IP:5000"
echo "[INFO] Agent:    Collecting data from Home Assistant"
echo "[INFO] ========================================="

# Wait for all processes
wait $POSTGRES_PID $BACKEND_PID $FRONTEND_PID $AGENT_PID
