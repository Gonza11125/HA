ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Install Node.js and dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    jq

# Set working directory
WORKDIR /app

# Copy project files (relative to repository root)
COPY backend ./backend
COPY frontend ./frontend
COPY agent ./agent

# Build backend
WORKDIR /app/backend
RUN npm install && npm run build || npm run build || true

# Build frontend
WORKDIR /app/frontend  
RUN npm install && npm run build || true

# Build agent
WORKDIR /app/agent
RUN npm install && npm run build || npm run build || true

# Install serve for frontend
RUN npm install -g serve

# Copy and setup entrypoint
WORKDIR /app
COPY addon/rootfs/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3000 5000

# Run entrypoint
CMD ["/entrypoint.sh"]
