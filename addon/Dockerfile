ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Install Node.js and npm
RUN apk add --no-cache \
    nodejs \
    npm \
    postgresql-client \
    curl \
    bash \
    jq

# Set working directory
WORKDIR /app

# Copy the entire solar-portal project
COPY backend ./backend
COPY frontend ./frontend
COPY agent ./agent

# Build backend
WORKDIR /app/backend
RUN npm ci --only=production && npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm ci && npm run build && rm -rf node_modules

# Build and setup agent
WORKDIR /app/agent
RUN npm ci --only=production && npm run build

# Copy entry scripts
COPY rootfs/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create s6 service structure for Home Assistant
RUN mkdir -p /etc/s6-overlay/s6-rc.d/backend/run
RUN mkdir -p /etc/s6-overlay/s6-rc.d/frontend/run
RUN mkdir -p /etc/s6-overlay/s6-rc.d/agent/run

# Create service files for s6-overlay
RUN mkdir -p /etc/s6-overlay/s6-rc.d/user/contents.d

# Backend service
RUN echo '#!/bin/bash\ncd /app/backend && exec npm start' > /etc/s6-overlay/s6-rc.d/backend/run && \
    chmod +x /etc/s6-overlay/s6-rc.d/backend/run && \
    echo 'backend' >> /etc/s6-overlay/s6-rc.d/user/contents.d/backend

# Frontend service
RUN echo '#!/bin/bash\ncd /app/frontend && exec node -e "import(\"vite\").then(m => m.createServer({root:\"/app/frontend\", middlewareMode: true})).catch(e => process.exit(1))" || npx http-server /app/frontend/dist -p 3000 -c-1' > /etc/s6-overlay/s6-rc.d/frontend/run && \
    chmod +x /etc/s6-overlay/s6-rc.d/frontend/run && \
    echo 'frontend' >> /etc/s6-overlay/s6-rc.d/user/contents.d/frontend

# Agent service (optional, runs only if configured)
RUN echo '#!/bin/bash\ncd /app/agent && exec npm start' > /etc/s6-overlay/s6-rc.d/agent/run && \
    chmod +x /etc/s6-overlay/s6-rc.d/agent/run

# Setup working directory
WORKDIR /app

# Install simple http-server for frontend
RUN npm install -g http-server
