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

# Create single s6-overlay service for Solar Portal
RUN mkdir -p /etc/services.d/solar-portal
RUN echo '#!/usr/bin/with-contenv bash' > /etc/services.d/solar-portal/run \
    && echo 'set -e' >> /etc/services.d/solar-portal/run \
    && echo 'echo "[INFO] Starting Solar Portal services..."' >> /etc/services.d/solar-portal/run \
    && echo '' >> /etc/services.d/solar-portal/run \
    && echo '# Start backend in background' >> /etc/services.d/solar-portal/run \
    && echo 'cd /app/backend' >> /etc/services.d/solar-portal/run \
    && echo 'echo "[INFO] Starting backend on port 5000..."' >> /etc/services.d/solar-portal/run \
    && echo 'NODE_ENV=production npm start &' >> /etc/services.d/solar-portal/run \
    && echo 'BACKEND_PID=$!' >> /etc/services.d/solar-portal/run \
    && echo '' >> /etc/services.d/solar-portal/run \
    && echo '# Start frontend in foreground' >> /etc/services.d/solar-portal/run \
    && echo 'cd /app/frontend' >> /etc/services.d/solar-portal/run \
    && echo 'echo "[INFO] Starting frontend on port 3000..."' >> /etc/services.d/solar-portal/run \
    && echo 'exec serve -s dist -l 3000' >> /etc/services.d/solar-portal/run \
    && chmod a+x /etc/services.d/solar-portal/run

WORKDIR /app

# Start s6-overlay as PID 1
CMD [ "/init" ]
