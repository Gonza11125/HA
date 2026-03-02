ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash

# Set working directory
WORKDIR /app

# Copy entire project
COPY . /app

# Install backend dependencies
WORKDIR /app/backend
RUN npm install && \
    npm run build || echo "Backend build skipped"

# Install frontend dependencies  
WORKDIR /app/frontend
RUN npm install && \
    npm run build || echo "Frontend build skipped"

# Install agent dependencies
WORKDIR /app/agent
RUN npm install && \
    npm run build || echo "Agent build skipped"

# Install http-server globally
RUN npm install -g http-server

# Setup entrypoint
WORKDIR /app
RUN chmod +x /app/addon/rootfs/entrypoint.sh

# Expose ports
EXPOSE 3000 5000

# Run entrypoint
CMD ["/app/addon/rootfs/entrypoint.sh"]
