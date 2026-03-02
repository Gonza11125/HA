FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Runtime
ENV CONFIG_PATH=/config/config.json
ENV LOG_LEVEL=info

# Volume for config persistence
VOLUME ["/config"]

# Start
CMD ["npm", "start"]
