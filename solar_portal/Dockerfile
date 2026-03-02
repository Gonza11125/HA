# ARG must be before first FROM to be available for final stage
ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest

# Build stage - Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build stage - Backend
FROM node:18-alpine AS backend-builder
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Final stage - Home Assistant base image
FROM ${BUILD_FROM}

# Install Node.js 18 and PostgreSQL client
RUN apk add --no-cache \
    nodejs \
    npm \
    postgresql-client

# Install serve for frontend (lightweight static server)
RUN npm install -g serve

# Copy built backend
WORKDIR /app/backend
COPY --from=backend-builder /build/dist ./dist
COPY --from=backend-builder /build/node_modules ./node_modules
COPY --from=backend-builder /build/package.json ./

# Copy built frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /build/dist ./dist

# Copy startup script
COPY run.sh /
RUN chmod +x /run.sh

WORKDIR /app

# Start services directly (no s6-overlay services needed for simple case)
CMD ["/run.sh"]
