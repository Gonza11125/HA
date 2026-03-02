# Solar Portal - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Option 1: Full Docker Stack (Recommended)

```bash
# 1. Clone/extract project
cd ~/projects/solar-portal

# 2. Set up environment
cp .env.example .env

# 3. Generate secrets (edit .env after)
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# 4. Start services
docker compose up -d

# 5. Run migrations
docker compose exec backend npm run migrate

# 6. Access
# Frontend:   http://localhost:3000
# API:        http://localhost:5000/api
# DB:         localhost:5432
```

**Check status:**
```bash
docker compose ps
docker compose logs -f backend
```

## Option 2: Local Development (3 Terminals)

**Terminal 1: Database**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=solar_portal \
  -p 5432:5432 \
  postgres:15-alpine
```

**Terminal 2: Backend**
```bash
cd backend
npm install
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solar_portal" > .env
npm run dev
# Runs on port 5000
```

**Terminal 3: Frontend**
```bash
cd frontend
npm install
npm run dev
# Runs on port 3000
```

**Optional Terminal 4: Agent**
```bash
cd agent
npm install
cp config.example.json config.json
# Edit config.json with your HA details
npm run dev
```

## First Steps After Starting

### 1. Check Health
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok",...}
```

### 2. View Database
```bash
docker compose exec postgres psql -U postgres -d solar_portal -c "SELECT * FROM users;"
```

### 3. Check Backend Logs
```bash
docker compose logs -f backend
# Should show database initialization
```

### 4. Visit Frontend
Open **http://localhost:3000** in browser

## Creating First User (Manual SQL for MVP)

Until registration endpoint is implemented:

```bash
# Insert test user (password hash for "password123")
docker compose exec postgres psql -U postgres -d solar_portal << EOF
INSERT INTO users (email, password_hash, full_name, email_verified)
VALUES ('demo@example.com', '\$2a\$10\$...hash...', 'Demo User', true);
EOF
```

## Project Structure Overview

```
HA/
├── backend/          # Express.js API server
│   └── src/
│       ├── routes/   # API endpoints
│       └── middleware/ # Auth, rate limiting
├── frontend/         # React web portal
│   └── src/
│       ├── pages/    # Dashboard, Login, etc.
│       └── components/ # Reusable UI components
├── agent/            # Raspberry Pi data collector
│   └── src/
│       ├── ha-client.ts # Home Assistant integration
│       └── cloud-client.ts # Cloud API client
├── docs/             # Documentation
├── docker-compose.yml # Full stack definition
└── .env.example      # Environment template
```

## Common Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Restart a service
docker compose restart backend

# Access database
docker compose exec postgres psql -U postgres -d solar_portal

# Rebuild images
docker compose build --no-cache

# Fresh start
docker compose down -v
docker compose up -d
docker compose exec backend npm run migrate
```

## What's Next?

### To Build Authentication
- [ ] Update [backend/src/routes/auth.ts](backend/src/routes/auth.ts) - registration, login endpoints
- [ ] Implement password hashing (Argon2)
- [ ] Add email verification flow
- [ ] Update [frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx) - login form

### To Build Dashboard
- [ ] Create [frontend/src/components/PowerCard.tsx](frontend/src/components/PowerCard.tsx) - display current power
- [ ] Create [frontend/src/components/EnergyChart.tsx](frontend/src/components/EnergyChart.tsx) - power graph
- [ ] Update [backend/src/routes/sites.ts](backend/src/routes/sites.ts) - data endpoints

### To Set Up Agent
- [ ] Configure [agent/config.example.json](agent/config.example.json) for your HA installation
- [ ] Get long-lived token from Home Assistant
- [ ] Test HA entity IDs
- [ ] Start agent and monitor logs

### To Deploy
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Use docker-compose on VPS
- Set up Nginx reverse proxy
- Configure Let's Encrypt SSL

## Troubleshooting

### Port Already in Use
```bash
# Kill process using port
lsof -i :5000     # Find process
kill -9 PID       # Kill it
```

### Database Connection Error
```bash
# Ensure database is running
docker compose ps postgres

# Or restart
docker compose restart postgres
```

### Frontend Can't Reach Backend
```bash
# Check CORS_ORIGIN in .env
# Should match your frontend URL
CORS_ORIGIN=http://localhost:3000
```

### Services Won't Start
```bash
# Check Docker
docker --version
docker compose version

# View error logs
docker compose logs backend

# Try rebuild
docker compose build --no-cache
```

## Useful Docker Commands

```bash
# Start services in background
docker compose up -d

# View running services
docker compose ps

# Follow service logs
docker compose logs -f SERVICE_NAME

# Execute command in service
docker compose exec SERVICE_NAME COMMAND

# Stop services
docker compose down

# Clean everything (removes volumes too!)
docker compose down -v
```

## Next Reading

1. **Security**: [docs/SECURITY.md](docs/SECURITY.md) - understand security model
2. **Database**: [docs/DATABASE.md](docs/DATABASE.md) - schema reference
3. **API**: [docs/API.md](docs/API.md) - endpoint documentation
4. **Configuration**: [docs/CONFIGURATION.md](docs/CONFIGURATION.md) - setup details
5. **Development**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - coding standards

## Questions?

- Check the [README.md](README.md) for overview
- See `docs/` folder for detailed documentation
- Check `docs/SECURITY.md` for security questions
- See `docs/AGENT.md` for Raspberry Pi setup

---

🚀 You're ready to develop! Happy coding!
