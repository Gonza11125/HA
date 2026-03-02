ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm

# Create app directory
WORKDIR /app

# Copy project (build context is repository root)
COPY backend ./backend
COPY frontend ./frontend
COPY agent ./agent

# Install backend
WORKDIR /app/backend
RUN npm install

# Install frontend
WORKDIR /app/frontend
RUN npm install

# Install agent
WORKDIR /app/agent
RUN npm install

# Create test script
WORKDIR /app
RUN mkdir -p /etc/services.d/solar-portal && \
    echo "#!/usr/bin/with-contenv bashio" > /etc/services.d/solar-portal/run && \
    echo "cd /app/backend && npm start &" >> /etc/services.d/solar-portal/run && \
    echo "exec tail -f /dev/null" >> /etc/services.d/solar-portal/run && \
    chmod +x /etc/services.d/solar-portal/run
