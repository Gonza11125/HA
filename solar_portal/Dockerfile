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

# Create s6-overlay service for backend
RUN mkdir -p /etc/services.d/backend
RUN echo '#!/usr/bin/with-contenv bashio' > /etc/services.d/backend/run \
    && echo 'bashio::log.info "Starting Solar Portal Backend..."' >> /etc/services.d/backend/run \
    && echo 'cd /app/backend' >> /etc/services.d/backend/run \
    && echo 'export BACKEND_PORT=5000' >> /etc/services.d/backend/run \
    && echo 'export NODE_ENV=production' >> /etc/services.d/backend/run \
    && echo 'exec npm start' >> /etc/services.d/backend/run \
    && chmod a+x /etc/services.d/backend/run

# Create s6-overlay service for frontend
RUN mkdir -p /etc/services.d/frontend
RUN echo '#!/usr/bin/with-contenv bashio' > /etc/services.d/frontend/run \
    && echo 'bashio::log.info "Starting Solar Portal Frontend..."' >> /etc/services.d/frontend/run \
    && echo 'cd /app/frontend' >> /etc/services.d/frontend/run \
    && echo 'exec serve -s dist -l 3000' >> /etc/services.d/frontend/run \
    && chmod a+x /etc/services.d/frontend/run

WORKDIR /app
