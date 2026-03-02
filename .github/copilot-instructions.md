# GitHub Copilot Instructions for Solar Portal

You are assisting with development of the Solar Portal - a secure web customer portal for Home Assistant solar installations.

## Project Context

- **Type**: Full-stack web application (Node.js + React)
- **Architecture**: Cloud backend, Raspberry Pi agent, React frontend
- **Security**: Critical - handles user auth, payment data (future), and system access
- **Status**: MVP (0.1.0)

## Key Requirements

### Security (Non-negotiable)
- All authentication via secure HTTP-only cookies
- Passwords: Argon2 hash
- HA tokens: ONLY stored locally on Raspberry, never in cloud
- API: Request validation, rate limiting, CORS
- Database: Parameterized queries, encrypted connections

### Architecture
- Monorepo: `/backend` (Express.js), `/frontend` (React), `/agent` (Node.js)
- Database: PostgreSQL with UUID primary keys
- Deployment: Docker Compose, single VPS or docker hub

### MVP Features
1. User registration/login with email verification
2. Customer dashboard with solar data (power, energy, battery)
3. Device pairing with code expiry
4. Agent data collection and push to cloud
5. Admin interface for site/user management

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types without reasoning
- Interface for all data structures
- JSDoc for exported functions

### React
- Functional components with hooks
- Zustand for state management (simple)
- Tailwind CSS for styling
- Responsive design (mobile-first)

### Node.js/Express
- Middleware for auth, rate limiting, logging
- Try-catch with proper error handling
- Async/await (no callbacks)
- Parameterized SQL queries

## File Structure

```
backend/src/
  routes/         # POST /auth/login, GET /sites, etc.
  middleware/     # authenticate(), errorHandler(), rateLimiter()
  services/       # UserService, SiteService, etc.
  models/         # Database queries (not ORM for MVP)
  config/         # database.ts, environment.ts
  utils/          # logger.ts, email.ts, validation.ts

frontend/src/
  pages/          # LoginPage, DashboardPage, etc. (route-level)
  components/     # Button, Card, Chart, etc. (reusable)
  hooks/          # useAuthStore, useApi, etc.
  utils/          # api.ts for axios config

agent/src/
  ha-client.ts    # Home Assistant integration
  cloud-client.ts # API to cloud backend
  data-collector.ts # Main polling/collection logic
  logger.ts       # Logging
```

## CLI Commands

```bash
# Development
cd backend && npm run dev       # Backend hot-reload
cd frontend && npm run dev      # React HMR
npm run migrate                 # Database migrations

# Docker
docker compose up -d            # Start all services
docker compose down             # Stop all services
docker compose logs -f backend  # View backend logs

# Testing/Linting
npm run test                    # Unit tests
npm run lint                    # ESLint
npm run format                  # Prettier
```

## Common Patterns

### API Response
```typescript
// Success
res.json({ data: {...}, message: 'Success' })

// Error
res.status(400).json({ error: 'Invalid input', code: 'VALIDATION_ERROR' })
```

### Protected Route
```typescript
router.post('/api/endpoint', authenticate, handler)

// Admin route
router.get('/api/admin/users', authenticate, requireAdmin, handler)
```

### State Management (Frontend)
```typescript
const { user, setUser } = useAuthStore()  // Zustand
```

## What to Avoid

❌ Storing HA tokens in cloud DB
❌ Passwords in logs
❌ Using localStorage for sensitive data
❌ SQL concatenation (always parameterize)
❌ Hardcoded secrets in code
❌ New dependencies without review
❌ `any` types in TypeScript
❌ Direct DB queries in routes (use services)

## When Adding a Feature

1. Create issue with requirements
2. Create branch: `feature/description`
3. Update database schema if needed (migrations)
4. Implement backend route + service
5. Add frontend UI + API client
6. Write tests
7. Update docs
8. Create PR with link to issue

## Documentation

Keep these updated:
- `/docs/API.md` - API endpoint reference
- `/docs/CONFIGURATION.md` - Setup guide
- `/docs/SECURITY.md` - Security considerations
- `/docs/DATABASE.md` - Schema reference
- `README.md` - Project overview

## Contact & Questions

- For architecture questions, refer to design docs
- For security issues, see SECURITY.md
- For deployment, see DEPLOYMENT.md
- For agent setup, see AGENT.md

---

**Last Updated**: March 1, 2026
**Version**: 0.1.0
