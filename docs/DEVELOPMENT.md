# Development Setup & Guidelines

## Local Development Environment

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 15 (or via Docker)
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone <repo> && cd <repo>

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../agent && npm install
cd ..

# Copy environment template
cp .env.example .env

# Generate secure values (edit after)
echo "Update .env with your values"
nano .env
```

### Start Development Services

**Terminal 1: Database**
```bash
docker run -d \
  --name solar_postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=solar_portal \
  -p 5432:5432 \
  postgres:15-alpine
```

**Terminal 2: Backend**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
# Auto-reloads on file changes
```

**Terminal 3: Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
# HMR enabled
```

**Terminal 4: Agent (optional)**
```bash
cd agent
cp config.example.json config.json
# Edit config.json with local HA details
npm run dev
```

### Quick Commands

```bash
# Backend
npm run dev        # Start with hot-reload
npm run build      # TypeScript compile
npm run lint       # Check for issues
npm run format     # Auto-format code

# Frontend
npm run dev        # Start dev server with HMR
npm run build      # Production build
npm run preview    # Preview production build

# Backend - Database
npm run migrate    # Run migrations
```

## Development Workflow

### Creating a Feature

1. **Create branch**
   ```bash
   git checkout -b feature/user-login
   ```

2. **Code your feature**
   - Keep commits atomic
   - Write clear commit messages
   - Follow code style (see below)

3. **Test manually**
   - Browser: http://localhost:3000
   - API: http://localhost:5000/api
   - Check browser console for errors

4. **Run tests**
   ```bash
   cd backend && npm test
   cd ../frontend && npm test
   ```

5. **Push & create PR**
   ```bash
   git push origin feature/user-login
   # Opens PR on GitHub - add description
   ```

### Code Style

#### TypeScript/JavaScript

Use prettier/eslint:
```bash
# Format entire project
npm run format

# Check for linting issues
npm run lint

# Fix issues automatically
npm run lint -- --fix
```

**Guidelines:**
- 2-space indentation
- Single quotes
- No semicolons (prettier handles)
- Type everything in TypeScript
- Document complex functions with JSDoc

**Example:**
```typescript
/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid email
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
```

#### React Components

```typescript
// Functional components with hooks
import { useState, useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
}

export function Modal({ title, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    }
  }, [])

  return (
    <div className="modal">
      <h2>{title}</h2>
    </div>
  )
}
```

### File Structure

**Backend:**
```
src/
  ├── routes/        # API endpoints grouped by feature
  │   ├── auth.ts
  │   ├── users.ts
  │   └── sites.ts
  ├── middleware/    # Authentication, logging, etc.
  ├── services/      # Business logic
  ├── models/        # Database models/queries
  ├── config/        # Configuration
  ├── utils/         # Helper functions
  └── index.ts       # Main entry point
```

**Frontend:**
```
src/
  ├── components/    # Reusable components
  │   ├── Button.tsx
  │   └── Card.tsx
  ├── pages/         # Page components (routes)
  │   ├── LoginPage.tsx
  │   └── DashboardPage.tsx
  ├── hooks/         # Custom React hooks
  ├── utils/         # Helper functions
  ├── App.tsx        # Root component
  └── index.tsx      # ReactDOM render
```

## Testing

### Backend Unit Tests

```bash
cd backend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

Example test:
```typescript
// src/utils/email.test.ts
import { validateEmail } from './email'

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Debugging

### Backend

**VS Code Debug Configuration:**
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "preLaunchTask": "tsc: build - backend",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**Browser Console:**
- Open DevTools (F12)
- Check for console errors
- Network tab to see API calls

### Frontend

**React DevTools:**
- Install React DevTools browser extension
- Debug components, state, hooks
- Trace re-renders

**API Calls:**
```typescript
// Enable request logging in src/utils/api.ts
apiClient.interceptors.request.use((config) => {
  console.log('Request:', config.url, config.data)
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    console.log('Response:', response.data)
    return response
  }
)
```

### Docker Issues

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Enter container
docker compose exec backend sh
docker compose exec postgres psql -U postgres

# Rebuild without cache
docker compose build --no-cache
```

## Common Issues & Solutions

### Database Connection Error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Start database
docker run -d \
  --name solar_postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=solar_portal \
  -p 5432:5432 \
  postgres:15-alpine

# Or with docker-compose
docker compose up -d postgres
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::5000`

**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 PID

# Or change port in .env
BACKEND_PORT=5001
```

### Module Not Found

**Problem:** `Cannot find module 'express'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Hot Reload Not Working

**Problem:** Changes don't trigger rebuild

**Solution:**
```bash
# Restart ts-node-dev
# Ctrl+C then npm run dev again

# Check file watching
ulimit -n  # Should be > 1000
```

## Git Workflow

### Commit Guidelines

```
feat: Add user authentication
fix: Correct database query race condition
docs: Update deployment guide
style: Format code with prettier
refactor: Extract email service to separate file
test: Add tests for rate limiter
chore: Update dependencies
```

Format: `<type>: <description>`

### Pull Requests

1. Write descriptive title
2. Link related issues
3. Describe what changed and why
4. Include testing notes

Example:
```markdown
## Description
Implements user registration with email verification as per issue #15.

## Changes
- Added POST /auth/register endpoint
- Created email verification flow
- Added unit tests for validation

## Testing
- Test with new user registration
- Verify email is sent
- Check verification link works
```

## Performance Profiling

### Backend

```bash
# Enable profiling
NODE_OPTIONS=--prof node dist/index.js

# Generate summary
node --prof-process isolate-*.log > profile.txt
cat profile.txt
```

### Frontend

**Lighthouse:**
```bash
# In Chrome DevTools → Lighthouse
# Run performance audit
```

## Security Considerations

When developing:
- ✅ Use HTTPS for all API calls (.env has HTTPS option)
- ✅ Never log sensitive data
- ✅ Validate all inputs
- ✅ Use parameterized queries
- ✅ Don't expose error details
- ✅ Keep dependencies updated

```bash
# Check for vulnerabilities
npm audit
npm audit fix  # Auto-fix if safe
```

---

**Last Updated**: March 1, 2026  
**Version**: 0.1.0
