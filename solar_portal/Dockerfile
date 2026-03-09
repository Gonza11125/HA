# Home Assistant base image argument
ARG BUILD_FROM

# Build stage - Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts || npm install
COPY frontend/ ./
RUN npm run build

# Build stage - Backend
FROM node:18-alpine AS backend-builder
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci --ignore-scripts || npm install
COPY backend/ ./
RUN npm run build

# Build stage - Agent
FROM node:18-alpine AS agent-builder
WORKDIR /build
COPY agent/package*.json ./
RUN npm ci --ignore-scripts || npm install
COPY agent/ ./
RUN npm run build

# Final stage - Use Home Assistant base image
FROM $BUILD_FROM

# Install additional tools and PostgreSQL
RUN apk add --no-cache \
    bash \
    postgresql \
    postgresql-client \
    && mkdir -p /run/postgresql \
    && chown postgres:postgres /run/postgresql

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

# Copy built agent
WORKDIR /app/agent
COPY --from=agent-builder /build/dist ./dist
COPY --from=agent-builder /build/node_modules ./node_modules
COPY --from=agent-builder /build/package.json ./

# Copy startup script
COPY run.sh /
RUN chmod +x /run.sh

WORKDIR /app

# Start services directly (no s6-overlay services needed for simple case)
CMD ["/run.sh"]
