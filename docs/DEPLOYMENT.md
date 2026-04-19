# Deployment Guide

Production deployment of Solar Portal on VPS/Server.

This repository now ships with a dedicated production stack:

- [docker-compose.prod.yml](../docker-compose.prod.yml) for VPS deployment
- [docker-compose.wireguard.yml](../docker-compose.wireguard.yml) for private home-server deployment over WireGuard
- [nginx.conf](../nginx.conf) for HTTPS reverse proxying
- [nginx.wireguard.conf](../nginx.wireguard.conf) for private HTTP reverse proxying inside WireGuard
- [NO_DOMAIN_REMOTE_ACCESS.md](NO_DOMAIN_REMOTE_ACCESS.md) for secure access without buying a domain yet
- [WIREGUARD_HOME_SERVER.md](WIREGUARD_HOME_SERVER.md) for the dedicated WireGuard setup

Keep [docker-compose.yml](../docker-compose.yml) for local development. Do not repurpose it for internet-facing production.

If you already have a home server and want the portal reachable only after VPN login, use [WIREGUARD_HOME_SERVER.md](WIREGUARD_HOME_SERVER.md) instead of the public HTTPS flow below.

## Prerequisites

- VPS with 2GB+ RAM, 20GB+ storage (DigitalOcean, Linode, etc.)
- Domain name (e.g., solarportal.example.com) or a secure tunnel URL
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
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

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
# Create cert directories
mkdir -p certs certbot/www

# Copy certificates
sudo cp /etc/letsencrypt/live/solarportal.example.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/solarportal.example.com/privkey.pem certs/
sudo chown $USER:$USER certs/*
sudo chmod 644 certs/*
```

### Auto-Renew Certificates

```bash
# Add cron job
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/solarportal.example.com/fullchain.pem /opt/solarportal/certs/fullchain.pem && cp /etc/letsencrypt/live/solarportal.example.com/privkey.pem /opt/solarportal/certs/privkey.pem && docker compose -f /opt/solarportal/docker-compose.prod.yml exec nginx nginx -s reload" | sudo crontab -
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
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@postgres:5432/solar_portal

JWT_SECRET=generate-with: openssl rand -base64 32
REFRESH_TOKEN_SECRET=generate-with: openssl rand -base64 32
SESSION_SECRET=generate-with: openssl rand -base64 32

COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
COOKIE_DOMAIN=solarportal.example.com

CORS_ORIGIN=https://solarportal.example.com
STRICT_CORS=true

EMAIL_VERIFICATION_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@solarportal.example.com

VITE_API_BASE_URL=/api
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

The reverse proxy configuration is already committed in [nginx.conf](../nginx.conf). It publishes:

- `/` to the frontend container
- `/api/` to the backend container
- `/health` to the backend health endpoint

If you need per-domain `server_name` values, update the `server_name` directives in that file before deployment.

Key behavior:

- HTTP on port 80 redirects to HTTPS
- TLS terminates at Nginx
- Frontend and backend stay on the internal Docker network only
- The backend sees `X-Forwarded-*` headers so secure cookies work behind the proxy

## 5. Start Production Stack

```bash
# Build and start production containers
docker compose -f docker-compose.prod.yml up -d --build

# Follow logs
docker compose -f docker-compose.prod.yml logs -f nginx backend frontend
```

## 6. Verify Deployment

```bash
# Reverse proxy health
curl -I https://solarportal.example.com/health

# Frontend
curl -I https://solarportal.example.com/

# API preflight check
curl -i https://solarportal.example.com/api/auth/registration-status
```

Expected result:

- `https://solarportal.example.com/` returns the frontend
- `https://solarportal.example.com/api/...` reaches the backend through Nginx
- Browser requests stay same-origin, so the frontend uses `/api` without CORS issues

## 7. Database Setup

### Create PostgreSQL Backup Strategy

```bash
# Create backup script
mkdir -p backups
cat > backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/solarportal/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres solar_portal | \
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
docker compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
sleep 10

# Run migrations
docker compose -f docker-compose.prod.yml exec backend npm run migrate

# Verify
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d solar_portal -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

## 8. Monitoring & Logs

```bash
# CPU/Memory usage
docker compose -f docker-compose.prod.yml ps
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
docker compose -f docker-compose.prod.yml logs -f --tail 100

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f postgres

# Nginx access logs
docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log
```

## 9. Maintenance

### Database Backups

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres solar_portal > backup.sql

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres solar_portal < backup.sql
```

### Update Services

```bash
# Stop
docker compose -f docker-compose.prod.yml down

# Pull latest
git pull
docker compose -f docker-compose.prod.yml build --no-cache

# Start
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml logs -f
```

### Health Checks

```bash
# API health
curl https://solarportal.example.com/health

# Database health
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Portal access
curl -I https://solarportal.example.com
```

## 10. Firewall Configuration

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

## 11. Monitoring Tools (Optional)

### Simple Monitoring Script

```bash
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    echo "Services:"
    docker compose -f docker-compose.prod.yml ps
    echo ""
    echo "Disk Usage:"
    du -sh /opt/solarportal/*
    echo ""
    echo "Database Size:"
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d solar_portal -c \
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
docker compose -f docker-compose.prod.yml restart nginx
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check logs
docker compose -f docker-compose.prod.yml logs postgres

# Restart database
docker compose -f docker-compose.prod.yml restart postgres

# Connect manually
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d solar_portal
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

**Last Updated**: April 18, 2026  
**Version**: 0.1.0
