#!/bin/bash
set -e

echo "[INFO] ========================================="
echo "[INFO] Solar Portal Add-on Starting..."
echo "[INFO] ========================================="

# Start backend
cd /app/backend
echo "[INFO] Starting backend on port 5000..."
NODE_ENV=production PORT=5000 npm start &
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

echo "[INFO] ========================================="
echo "[INFO] Solar Portal is running!"
echo "[INFO] Frontend: http://YOUR_IP:3000"
echo "[INFO] Backend:  http://YOUR_IP:5000"
echo "[INFO] ========================================="

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
