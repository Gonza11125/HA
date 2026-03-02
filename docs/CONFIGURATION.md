# Configuration Guide

## Backend Configuration

### Environment Variables

Create `.env` in the root directory and set these values:

#### Database
```
DATABASE_URL=postgresql://user:password@localhost:5432/solar_portal
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=solar_portal
```

#### JWT & Sessions
```
JWT_SECRET=your-min-32-character-secret-key-here
REFRESH_TOKEN_SECRET=another-32-character-secret-key-here
SESSION_SECRET=third-32-character-secret-key-here
```

#### Cookies (Security)
```
COOKIE_SECURE=false  # true in production (requires HTTPS)
COOKIE_SAME_SITE=lax  # strict, lax, or none
COOKIE_MAX_AGE=2592000000  # 30 days in milliseconds
```

#### Email (Optional for MVP)
```
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_EXPIRY=86400  # 24 hours

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@solarportal.com

PASSWORD_RESET_ENABLED=true
PASSWORD_RESET_EXPIRY=3600  # 1 hour
```

#### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=5     # global limit
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5  # stricter for auth endpoints
```

#### CORS
```
CORS_ORIGIN=http://localhost:3000
```

## Frontend Configuration

### Environment Variables

Frontend uses `.env` or is configured through `vite.config.ts`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Agent Configuration

### config.json

Copy `agent/config.example.json` to `agent/config.json`:

```json
{
  "haUrl": "http://localhost:8123",
  "haToken": "YOUR_LONG_LIVED_ACCESS_TOKEN",
  "cloudUrl": "http://localhost:5000/api",
  "pollingInterval": 30000,
  "entityMappings": [
    {
      "type": "power_now",
      "entityId": "sensor.solar_power",
      "friendlyName": "Current Power",
      "unit": "W"
    },
    {
      "type": "energy_today",
      "entityId": "sensor.solar_energy_today",
      "friendlyName": "Energy Today",
      "unit": "kWh"
    }
  ]
}
```

### .env

```
LOG_LEVEL=info
CONFIG_PATH=./config.json
```

## Home Assistant Setup

### Creating a Long-Lived Access Token

1. Go to Home Assistant UI
2. Click your profile icon (bottom left)
3. Scroll down to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a name like "Solar Portal Agent"
6. Copy the token and keep it secure
7. Add to `agent/config.json` under `haToken`

### Required Home Assistant Entities

The agent needs access to these entities. Create them using:
- Integrations (e.g., solaredge_modbus, solarlog)
- Template sensors
- Custom components

Example entity IDs to monitor:
- `sensor.solar_power` - Current power output (W)
- `sensor.solar_energy_today` - Daily energy (kWh)
- `sensor.battery_soc` - Battery state of charge (%)

### HTTPS & Security Setup

For production deployment:

```bash
# Docker with Nginx and Let's Encrypt
# See docs/DEPLOYMENT.md for full guide

# Self-signed certificate for testing:
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## Docker Compose Customization

### Production Settings

Edit `docker-compose.yml` and uncomment the nginx service:

```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
```

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres solar_portal > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres solar_portal < backup.sql
```

## Development Tips

### Reset Database

```bash
# Stop containers
docker-compose down

# Remove volume
docker volume rm solar_portal_postgres_data

# Restart
docker-compose up
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Access Database

```bash
docker-compose exec postgres psql -U postgres -d solar_portal
```

### Hot Reload

Source files in volumes automatically trigger recompilation:
- Backend: `ts-node-dev` watches and rebuilds
- Frontend: Vite HMR enabled
- Both support hot reload without container restart

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL service is healthy: `docker-compose ps`
2. Check connection string in `.env`
3. Verify database exists: `docker-compose exec postgres psql -U postgres -l`

### Agent Can't Connect to Home Assistant
1. Ensure HA URL is correct and accessible
2. Verify HA token is valid and not expired
3. Check HA is running: `curl http://localhost:8123/api/`
4. Check entity IDs exist in HA

### Agent Won't Pair
1. Verify pairing code matches what was generated in admin
2. Check if code has expired (default 15 min)
3. Look at backend logs: `docker-compose logs backend`

### CORS Errors in Frontend
1. Check `CORS_ORIGIN` matches frontend URL
2. Ensure cookies have correct SameSite setting
3. Verify HTTPS in production

### Email Issues
1. Check SMTP credentials
2. some providers require app passwords (not account password)
3. Check email is enabled: `EMAIL_VERIFICATION_ENABLED=true`
