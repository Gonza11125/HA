ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm bash

# Create app directory
WORKDIR /app

# Copy project files
COPY backend /app/backend
COPY frontend /app/frontend
COPY agent /app/agent

# Install dependencies (no build)
RUN cd /app/backend && npm install --omit=dev
RUN cd /app/frontend && npm install
RUN cd /app/agent && npm install --omit=dev

# Copy entrypoint
COPY addon/rootfs/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3000 5000

# Start
CMD ["/entrypoint.sh"]
