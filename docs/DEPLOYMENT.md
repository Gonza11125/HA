# Deployment Guide

Production deployment of Solar Portal on VPS/Server.

## Prerequisites

- VPS with 2GB+ RAM, 20GB+ storage (DigitalOcean, Linode, etc.)
- Domain name (e.g., solarportal.example.com)
- Ubuntu 22.04 LTS recommended
- Root or sudo access

## Architecture

```
┌─────────────────────────────────────────┐
│         Internet / User                 │
└──────────────┬──────────────────────────┘
               │
               ▼ HTTPS (port 443)
┌─────────────────────────────────────────┐
│     Nginx (Reverse Proxy)               │
│  - SSL/TLS termination                 │
│  - Load balancing (future)              │
│  - Gzip compression                     │
│  - Static file serving                  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
 ┌──────────┐    ┌──────────┐
 │ Frontend │    │ Backend  │
 │ (React)  │    │(Express) │
 └──────────┘    └────┬─────┘
                      │
                      ▼
             ┌──────────────────┐
             │  PostgreSQL DB   │
             │  (persistent)    │
             └──────────────────┘
```

## 1. Server Preparation

### Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### Clone Repository

```bash
# Create app directory
mkdir -p /opt/solarportal
cd /opt/solarportal

# Clone repo (or upload files)
git clone https://github.com/yourorg/solar-portal.git .

# Or using SCP:
# scp -r local/path/* user@server:/opt/solarportal/
```

## 2. SSL/TLS Certificate

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop any running services
docker compose down 2>/dev/null || true

# Generate certificate
sudo certbot certonly --standalone \
  -d solarportal.example.com \
  -d www.solarportal.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# Permissions
sudo chown -R $USER:$USER /etc/letsencrypt
```

### Copy Certificates to App Directory

```bash
# Create certs directory
mkdir -p certs

# Copy certificates
sudo cp /etc/letsencrypt/live/solarportal.example.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/solarportal.example.com/privkey.pem certs/
sudo chown $USER:$USER certs/*
sudo chmod 644 certs/*
```

### Auto-Renew Certificates

```bash
# Add cron job
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/solarportal.example.com/* /opt/solarportal/certs/" | sudo crontab -
```

## 3. Configuration

### Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit with production values
nano .env
```

**Key production settings:**
```env
NODE_ENV=production
BACKEND_PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@postgres:5432/solar_portal

JWT_SECRET=generate-with: openssl rand -base64 32
REFRESH_TOKEN_SECRET=generate-with: openssl rand -base64 32
SESSION_SECRET=generate-with: openssl rand -base64 32

COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

CORS_ORIGIN=https://solarportal.example.com

EMAIL_VERIFICATION_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@solarportal.example.com

VITE_API_BASE_URL=https://solarportal.example.com/api
```

### Generate Secure Secrets

```bash
# Generate 3 unique secrets
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32

# Use these for JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET
```

## 4. Nginx Configuration

Create `nginx.conf`:

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Upstream services
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name solarportal.example.com www.solarportal.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name solarportal.example.com www.solarportal.example.com;

        # SSL Certificates
        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;

        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Frontend (React SPA)
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # SPA: serve index.html for non-file requests
            try_files $uri $uri/ /index.html;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts for long-polling
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend/health;
            access_log off;
        }
    }
}
```

### Update docker-compose.yml

Uncomment Nginx service and mount config:

```yaml
  nginx:
    image: nginx:alpine
    container_name: solar_portal_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - frontend
      - backend
    networks:
      - solar_portal_network
    restart: unless-stopped
```

## 5. Database Setup

### Create PostgreSQL Backup Strategy

```bash
# Create backup script
mkdir -p backups
cat > backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/solarportal/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U postgres solar_portal | \
  gzip > "$BACKUP_DIR/solar_portal_$TIMESTAMP.sql.gz"
# Keep last 30 backups
ls -t "$BACKUP_DIR"/* | tail -n +31 | xargs rm -f
EOF

chmod +x backups/backup.sh

# Daily backups via cron
echo "0 2 * * * /opt/solarportal/backups/backup.sh" | crontab -
```

### Initialize Database

```bash
# Start services
docker compose up -d

# Wait for database to be ready
sleep 10

# Run migrations
docker compose exec backend npm run migrate

# Verify
docker compose exec postgres psql -U postgres -d solar_portal -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

## 6. Start Services

```bash
# Build images
docker compose build

# Start all services
docker compose up -d

# Verify all running
docker compose ps

# Check logs
docker compose logs -f
```

## 7. Monitoring & Logs

### System Monitoring

```bash
# CPU/Memory usage
docker stats

# Disk space
df -h
du -sh /opt/solarportal/*
```

### Log Rotation

Set up with `logrotate`:

```bash
sudo nano /etc/logrotate.d/solarportal
```

```
/opt/solarportal/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 nobody nobody
    sharedscripts
}
```

### View Logs

```bash
# All services
docker compose logs -f --tail 100

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Nginx access logs
docker compose exec nginx tail -f /var/log/nginx/access.log
```

## 8. Maintenance

### Database Backups

```bash
# Manual backup
docker compose exec -T postgres pg_dump -U postgres solar_portal > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres solar_portal < backup.sql
```

### Update Services

```bash
# Stop
docker compose down

# Pull latest
git pull
docker compose build --no-cache

# Start
docker compose up -d

# Verify
docker compose logs -f
```

### Health Checks

```bash
# API health
curl https://solarportal.example.com/health

# Database health
docker compose exec postgres pg_isready -U postgres

# Portal access
curl -I https://solarportal.example.com
```

## 9. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check
sudo ufw status
```

## 10. Monitoring Tools (Optional)

### Simple Monitoring Script

```bash
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    echo "Services:"
    docker compose ps
    echo ""
    echo "Disk Usage:"
    du -sh /opt/solarportal/*
    echo ""
    echo "Database Size:"
    docker compose exec -T postgres psql -U postgres -d solar_portal -c \
      "SELECT pg_size_pretty(pg_database_size('solar_portal'));"
    echo ""
    sleep 300
done > monitor.log 2>&1 &
EOF

chmod +x monitor.sh
./monitor.sh
```

### Better: Using Monitoring Services

- **Sentry**: Error tracking (optional)
- **Datadog**: Application monitoring (optional)
- **Uptime Robot**: Ping monitoring (free)

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill if needed
sudo kill -9 PID
```

### Certificate Renewal Issue

```bash
# Check certificate expiry
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew --force-renewal

# Fix if needed
sudo chown $USER:$USER /etc/letsencrypt
cp /etc/letsencrypt/live/*/fullchain.pem certs/
cp /etc/letsencrypt/live/*/privkey.pem certs/
docker compose restart nginx
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Restart database
docker compose restart postgres

# Connect manually
docker compose exec postgres psql -U postgres -d solar_portal
```

### Out of Memory

```bash
# Check usage
free -h
docker stats

# Increase VPS RAM if needed
# Or reduce workers in nginx.conf: worker_processes 1
```

---

**Last Updated**: March 1, 2026  
**Version**: 0.1.0
