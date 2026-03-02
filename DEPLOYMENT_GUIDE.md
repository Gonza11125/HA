# Solar Portal - Complete Setup & Deployment Guide

## 🚀 System Overview

Solar Portal is a secure cloud-based customer portal for Home Assistant solar installations. It enables real-time monitoring of solar generation, battery levels, and system health from anywhere.

**Architecture:**
- **Backend**: Express.js + TypeScript on port 5000
- **Frontend**: React + Vite on port 3000  
- **Agent**: Node.js Raspberry Pi agent collecting Home Assistant data
- **Database**: PostgreSQL (mock mode in development)

---

## 📋 Prerequisites

- Node.js 18+
- Home Assistant with accessible API token
- PostgreSQL 12+ (for production)
- Raspberry Pi 4+ (for agent)

---

## 🔧 Development Setup

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Agent
cd ../agent
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
NODE_ENV=development
BACKEND_PORT=5000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=24h

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Agent** (`agent/config.json`):
```json
{
  "haUrl": "http://192.168.1.100:8123",
  "haToken": "YOUR_HA_TOKEN",
  "cloudUrl": "http://localhost:5000/api",
  "pollingInterval": 5000,
  "entityMappings": [
    {
      "type": "power_now",
      "entityId": "sensor.your_power_sensor",
      "friendlyName": "Power Output",
      "unit": "W"
    }
  ]
}
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 - Agent:**
```bash
cd agent
npm run dev
# Starts data collection
```

---

## 👤 User Workflow

### 1. Register (First Account Only)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "fullName": "Admin User"
  }'
```

**Requirements:**
- Email must be valid format
- Password minimum 8 characters
- Only ONE account can be registered per installation

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

Response includes secure httpOnly cookie with JWT token.

### 3. Get Pairing Code
```bash
curl http://localhost:5000/api/agent/pairing-code
```

Returns: `{"pairingCode": "150N6E"}`

The pairing code is **fixed** per installation (not randomized).

### 4. Pair Device (Raspberry Pi Agent)

In agent config, enter the pairing code:
```bash
# Agent will pair automatically on startup
# Or manually via:
curl -X POST http://localhost:5000/api/agent/pair \
  -H "Content-Type: application/json" \
  -d '{"pairingCode": "150N6E"}'
```

Response includes device token for ongoing authentication.

### 5. View Dashboard

Open: `http://localhost:3000`

Login with registered account. Dashboard displays:
- **Real-time Power**: Current output/input in watts
- **Daily Energy**: kWh generated/consumed today
- **Battery**: State of charge and voltage
- **System Status**: Online/offline, last sync time
- **Historical Chart**: 24-hour power trend

---

## 🔒 Security Features

### Authentication
- Passwords hashed with PBKDF2 (100,000 iterations)
- JWT tokens in secure httpOnly cookies
- SameSite strict protection
- HTTPS only in production

### API Protection
- Rate limiting: 100 req/15min global, 5 auth attempts/15min
- CORS restricted to allowed origins
- Input validation on all endpoints
- Parameterized database queries

### Device Authentication
- Device tokens issued on pairing
- Device-specific data isolation
- No Home Assistant tokens stored in cloud

### Best Practices
- Secrets managed via environment variables
- No sensitive data in logs
- HTTPS mandatory in production
- Regular security audits

---

## 📊 API Reference

### Authentication Endpoints

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "User Name"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**GET /api/auth/registration-status**
Returns: `{canRegister: boolean, usersCount: number}`

### Agent Endpoints

**GET /api/agent/pairing-code**
Returns stable pairing code for this installation.

**POST /api/agent/pair**
```json
{"pairingCode": "150N6E"}
```
Returns device token for future authentications.

**POST /api/agent/push** (Device Auth Required)
Agent pushes telemetry data every 5 seconds.

### Data Endpoints

**GET /api/data/current**
Returns latest telemetry snapshot.

**GET /api/data/history**
Returns last 24 hours of telemetry data points.

**GET /api/data/status**
Returns connection status and sync times.

---

## 🐳 Docker Deployment

### Build Images
```bash
docker build -t solar-portal-backend ./backend
docker build -t solar-portal-frontend ./frontend
docker build -t solar-portal-agent ./agent
```

### Deploy with Docker Compose
```bash
docker compose up -d
```

Services:
- Backend: port 5000
- Frontend: port 3000
- PostgreSQL: port 5432
- Agent: internal, connects to backend

---

## 📱 Production Deployment

### Recommendations

1. **SSL/TLS**: Use Let's Encrypt via Nginx reverse proxy
2. **Database**: Connect to managed PostgreSQL instance
3. **Secrets**: Use environment variables or secret manager
4. **Monitoring**: Wire up application logging and alerts
5. **Backups**: Regular database backups
6. **Updates**: Keep Node.js and dependencies patched

### Environment Variables (Production)

```env
NODE_ENV=production
BACKEND_PORT=5000
CORS_ORIGIN=https://yourdomain.com

DATABASE_URL=postgresql://user:pass@db.example.com/solar_portal
JWT_SECRET=<generate-random-key>
JWT_EXPIRATION=7d

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional
SENDGRID_API_KEY=<for-email-notifications>
SENTRY_DSN=<for-error-tracking>
```

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","fullName":"Test"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Get current data
curl -b cookies.txt http://localhost:5000/api/data/current
```

### Automated Tests
```bash
npm run test
npm run lint
npm run format
```

---

## 🐛 Troubleshooting

### Agent not pushing data
1. Verify Home Assistant URL and token are correct
2. Check entity mappings match actual HA entities
3. Ensure pairing code matches
4. Review agent logs in development server output

### Dashboard shows "Offline"
- Check agent console for connection errors
- Verify Home Assistant webhook connectivity
- Restart agent after changing settings

### Login fails
1. Verify account was registered (only one account)
2. Check password matches registration
3. Clear browser cookies and try again

### 404 errors for endpoints
- Verify backend is running on port 5000
- Check CORS settings include your frontend origin
- Ensure routes are imported in main app file

---

## 📚 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/       # Auth, rate limiting, error handling
│   │   ├── services/         # Business logic
│   │   ├── config/           # Database, environment
│   │   └── utils/            # Logging, validation
│   ├── dist/                 # Compiled JavaScript
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Route components
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # API client, helpers
│   ├── dist/                 # Vite build output
│   └── package.json
│
├── agent/
│   ├── src/
│   │   ├── data-collector.ts # Main agent logic
│   │   ├── ha-client.ts      # Home Assistant API
│   │   ├── cloud-client.ts   # Backend connection
│   │   └── logger.ts         # Logging
│   ├── dist/                 # Compiled JavaScript
│   ├── config.json           # Agent configuration
│   └── package.json
│
└── docker-compose.yml        # Multi-container setup
```

---

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Monitor agent logs for errors
- Verify data is being collected

**Monthly:**
- Check for package updates: `npm outdated`
- Review authentication logs
- Test backup/restore procedures

**Quarterly:**
- Security updates: `npm audit fix`
- Database optimization
- Capacity planning

### Upgrade Process

```bash
# Backend
cd backend
npm install
npm run build
# Test in staging environment first

# Frontend  
cd frontend
npm install
npm run build

# Restart services
docker compose down
docker compose up -d
```

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review logs in terminal output
3. Verify all services are running
4. Check GitHub issues
5. Contact development team

---

## 📄 License

MIT License - See LICENSE file

---

**Last Updated**: March 2, 2026  
**Version**: 0.1.0
