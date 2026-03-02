# Implementation Roadmap

Complete feature checklist for Solar Portal MVP development.

## Phase 1: Authentication & User Management ⭐

### Registration & Login
- [ ] `POST /auth/register` - User registration endpoint
  - [ ] Validate email format
  - [ ] Check password strength
  - [ ] Hash password with Argon2
  - [ ] Create user in database
  - [ ] Send verification email
  - [ ] Return 201 with user ID

- [ ] `POST /auth/login` - Login endpoint
  - [ ] Find user by email
  - [ ] Verify password hash
  - [ ] Generate JWT access token
  - [ ] Generate refresh token (if remember-me)
  - [ ] Set secure cookies
  - [ ] Return user data + tokens

- [ ] `POST /auth/logout` - Clear session
  - [ ] Invalidate refresh token
  - [ ] Clear cookies
  - [ ] Return 200 OK

### Email Verification
- [ ] Send verification email on registration
- [ ] `POST /auth/verify-email` - Verify token from email
- [ ] Block login until email verified

### Password Reset
- [ ] `POST /auth/forgot-password` - Request reset
  - [ ] Check user exists (don't reveal)
  - [ ] Create time-limited reset token
  - [ ] Send reset link via email
  
- [ ] `POST /auth/reset-password` - Reset with token
  - [ ] Validate token and expiry
  - [ ] Hash new password
  - [ ] Update in database
  - [ ] Invalidate all sessions

### Frontend Auth Pages
- [ ] LoginPage form (email, password, remember-me)
- [ ] RegisterPage form (email, password confirm, terms)
- [ ] ForgotPasswordPage
- [ ] ResetPasswordPage
- [ ] VerifyEmailPage

## Phase 2: Site & Device Management

### Site Management (Backend)
- [ ] `POST /sites` - Create new site
  - [ ] Validate input
  - [ ] Link to current user
  - [ ] Create entry
  
- [ ] `GET /sites` - List user's sites
  - [ ] Return all sites for user
  - [ ] Include device status
  - [ ] Include latest values

- [ ] `GET /sites/:id` - Get site details
  - [ ] Include device info
  - [ ] Include current values
  - [ ] Include last update time

### Device Pairing
- [ ] `POST /agent/pair` - Pair device
  - [ ] Validate pairing code
  - [ ] Check code not expired
  - [ ] Generate device token
  - [ ] Create device entry
  - [ ] Return device token

- [ ] Pairing code generation (admin)
  - [ ] Generate random code (12 char)
  - [ ] Set 15-minute expiry
  - [ ] Store in database

- [ ] Reset pairing (admin)
  - [ ] Find device for site
  - [ ] Generate new code
  - [ ] Clear old device entry

### Frontend Site Pages
- [ ] SitesListPage - Show all user sites
- [ ] SiteDetailPage - View single site
- [ ] CreateSitePage - Add new site

## Phase 3: Data Collection & Storage

### Agent Data Push (Backend)
- [ ] `POST /agent/push` - API endpoint
  - [ ] Authenticate with device token
  - [ ] Accept metrics payload
  - [ ] Store in data_points table
  - [ ] Update current_values
  - [ ] Update site.last_data_received_at
  - [ ] Return 200 OK

- [ ] Data validation
  - [ ] Check metrics are numbers
  - [ ] Validate entity types
  - [ ] Store unit of measurement

### Database Operations
- [ ] Store time-series data (data_points)
- [ ] Update latest values (current_values)
- [ ] Update site status (online/offline)
- [ ] Implement data cleanup (keep 90 days)

### Agent Implementation
- [ ] HAClient.getState() - Read HA entities
- [ ] HAClient.getAllStates() - Get all states
- [ ] CloudClient.pushData() - Send to cloud
- [ ] DataCollector - Main polling loop
  - [ ] Start polling on schedule
  - [ ] Collect from HA
  - [ ] Push to cloud
  - [ ] Handle failures gracefully

- [ ] Agent Configuration
  - [ ] Support config.json file
  - [ ] Support environment variables
  - [ ] Allow pairing code in config
  - [ ] Save device token after pairing

## Phase 4: Dashboard & Visualization

### Dashboard (Frontend)
- [ ] DashboardPage main layout
- [ ] PowerCard - Show current power (W)
- [ ] EnergyCard - Show energy today (kWh)
- [ ] BatteryCard - Show battery SOC (%)
- [ ] StatusCard - Show online/offline status
- [ ] LastUpdateCard - Show "2 minutes ago" etc.

### Data Display
- [ ] `GET /sites/:id/data` - Fetch historical data
  - [ ] Query based on timeRange
  - [ ] Return time series
  - [ ] Support 24h, 7d, 30d views

- [ ] PowerChart - Recharts component
  - [ ] Line chart of last 24 hours
  - [ ] Responsive layout
  - [ ] Show tooltips on hover
  - [ ] Support time range selection

- [ ] EnergyChart - Bar chart
- [ ] BatteryChart - Area chart

## Phase 5: User Profile & Settings

### Profile Page (Frontend)
- [ ] Display user email
- [ ] Display full name
- [ ] Change full name
- [ ] Change password form
- [ ] Logout all sessions button

### Backend Profile Endpoints
- [ ] `GET /users/me` - Current user info
- [ ] `PUT /users/me` - Update profile
- [ ] `POST /users/change-password` - Change password

## Phase 6: Admin Interface

### Admin Dashboard
- [ ] Overview stats
  - [ ] Total users
  - [ ] Total sites
  - [ ] Online sites count
  - [ ] Data points today

### User Management
- [ ] `GET /admin/users` - List users
  - [ ] Show email, name, role
  - [ ] Show join date
  - [ ] Show last login
  - [ ] Search/filter

- [ ] User detail view
  - [ ] See their sites
  - [ ] Resend verification email
  - [ ] Reset password for them
  - [ ] Change role

### Site Management
- [ ] `GET /admin/sites` - List all sites
  - [ ] Show owner, status, last data
  - [ ] Search by address/name

- [ ] Site detail view
  - [ ] View device details
  - [ ] Generate pairing code
  - [ ] Reset pairing
  - [ ] View recent data
  - [ ] Change entity mappings

### Audit Logs
- [ ] `GET /admin/audit-logs` - View logs
  - [ ] Filter by action
  - [ ] Filter by user
  - [ ] Filter by date range
  - [ ] Pagination

## Phase 7: Configuration & Entity Mapping

### Entity Mapping (Backend)
- [ ] Store mapping of HA entity_id → portal field
- [ ] Admin endpoint to update mappings
- [ ] Agent fetches configuration on startup

### Admin UI for Configuration
- [ ] Select HA entities for site
  - [ ] Choose power entity
  - [ ] Choose energy entity
  - [ ] Choose battery entity
  - [ ] Optional: voltage, current, temp

## Phase 8: Security & Testing

### Authentication Security
- [ ] Rate limit login attempts
- [ ] Account lockout after N failures
- [ ] CSRF protection on forms
- [ ] XSS protection
- [ ] SQL injection prevention (parameterized)

### Testing
- [ ] Unit tests (backend)
  - [ ] Auth functions
  - [ ] Data validation
  - [ ] Database queries
  
- [ ] Unit tests (frontend)
  - [ ] Component rendering
  - [ ] State management
  - [ ] API client

- [ ] Integration tests
  - [ ] Login flow
  - [ ] Data push from agent
  - [ ] Data display

### Documentation
- [ ] API documentation (in API.md)
- [ ] Database schema (in DATABASE.md)
- [ ] Deployment guide (in DEPLOYMENT.md)
- [ ] Configuration guide (in CONFIGURATION.md)

## Phase 9: Deployment & DevOps

### Dockerization
- [ ] Backend Dockerfile ✅ (done)
- [ ] Frontend Dockerfile ✅ (done)
- [ ] Agent Dockerfile ✅ (done)
- [ ] docker-compose.yml ✅ (done)

### Deployment Configuration
- [ ] Nginx reverse proxy configuration
- [ ] SSL/TLS setup (Let's Encrypt)
- [ ] Environment variables for production
- [ ] Database migrations on startup
- [ ] Health check endpoints

### Monitoring
- [ ] Application health check endpoint
- [ ] Logging (rotation, retention)
- [ ] Error tracking
- [ ] Performance monitoring (optional)

## Phase 10: Polish & MVP Launch

### User Experience
- [ ] Error messages (user-friendly)
- [ ] Loading states
- [ ] Empty states (no data yet)
- [ ] Responsive design (mobile)
- [ ] Dark mode (optional)

### Performance
- [ ] Database query optimization
- [ ] Frontend bundle size
- [ ] Image optimization
- [ ] Caching strategy

### Final Testing
- [ ] End-to-end testing
- [ ] Browser compatibility
- [ ] Mobile responsiveness
- [ ] Load testing

## Priority Order (Recommended)

### Week 1 (Backend Foundation)
1. Authentication (register/login/logout)
2. Email verification
3. User endpoints (/users/me)
4. Database schema validation

### Week 2 (Frontend + Integration)
1. Login/Register pages
2. Site management (create, list)
3. Device pairing
4. Pairing code generation

### Week 3 (Data Pipeline)
1. Agent data push endpoint
2. Agent HA integration
3. Data storage (data_points, current_values)
4. Dashboard data endpoint

### Week 4 (Dashboard & Visualization)
1. Dashboard page layout
2. Power/Energy/Battery cards
3. Simple chart
4. Status indicator

### Week 5 (Admin + Polish)
1. Admin dashboard
2. User/site management
3. Audit logs
4. Testing & bug fixes

### Week 6-7 (Deployment & Launch)
1. Docker setup
2. Deployment to VPS
3. SSL/TLS
4. Monitoring
5. Launch!

## Done ✅

- [x] Project structure created
- [x] Backend template (Express.js, TypeScript)
- [x] Frontend template (React, TypeScript, Vite)
- [x] Agent template (Node.js, TypeScript)
- [x] Docker configuration
- [x] Database schema design
- [x] Security middleware templates
- [x] API route templates
- [x] Documentation structure
- [x] Development setup guide

## To Start Coding

1. Pick **Phase 1** (Authentication)
2. Start with `backend/src/routes/auth.ts`
3. Implement registration endpoint
4. Add Argon2 password hashing
5. Create tests
6. Build frontend LoginPage
7. Test with API calls

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for coding guidelines!
