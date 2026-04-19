# Solar Portal - Security Documentation

## Overview

The Solar Portal is built with security as a primary concern. This document outlines all security measures implemented.

## Authentication & Authorization

### Password Security

- **Hashing**: Argon2 (industry best practice)
- **No plaintext**: Passwords never stored in logs or databases in plaintext
- **Reset tokens**: Time-limited (1 hour default)
- **Verification**: Email required before account activation

### Session Management

#### Remember Me (Persistent Sessions)
```
- Enabled: checkbox on login
- Duration: 30 days (configurable)
- Storage: Secure HTTP-only cookie
- Token: JWT refresh token (server-signed, time-limited)
```

#### Regular Sessions
```
- Duration: 12 hours (configurable)
- Storage: HTTP-only cookie
- Automatic refresh: before expiration
- Logout: invalidates all tokens
```

### Cookie Security

All authentication cookies use:
- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Transmitted only over HTTPS (production)
- **SameSite=Lax**: Prevents CSRF attacks
- **Domain**: Set to portal domain only

Example:
```typescript
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 12 * 60 * 60 * 1000
})
```

## Data Protection

### Home Assistant Integration

**Critical Design**: 
- HA tokens **never** transmitted to browser
- HA tokens **never** stored in cloud database
- HA tokens **only** on Raspberry Pi, locally

**Agent to HA Connection**:
- Local connection (Raspberry → HA on same local network)
- Long-lived access token stored only on Raspberry
- Token never sent to cloud

**Agent to Cloud Connection**:
- HTTPS only
- Device token (not HA token)
- Cryptographic signature (optional: HMAC-SHA256)

### Data Encryption

```typescript
// In Transit
- All API endpoints: HTTPS only
- Agent communication: HTTPS + Device Token
- Database connections: SSL/TLS

// At Rest
- Sensitive fields hashed or encrypted
- Passwords: Argon2
- Tokens: JWT (signed, not encrypted)
- Database: TLS connection
```

## Rate Limiting & Abuse Prevention

### Global Rate Limiting
```
- 100 requests per 15 minutes per IP
- Applied to all routes except /health
```

### Authentication Rate Limiting
```
- 5 login attempts per 15 minutes per IP
- Temporary account lockout after excessive failures
- Incremental delays between attempts
```

### Brute Force Protection
```
- Account lockout: After 5 failed attempts
- Duration: 30 minutes
- Email notification on suspicious activity
```

## Input Validation & Sanitization

### Email Validation
```typescript
// RFC 5322 regex validation
// DNS MX record verification (optional)
```

### Password Requirements
```
- Minimum 8 characters (configurable)
- Supports all Unicode characters
- No pattern restrictions (allow passphrases)
- Salted with Argon2 (per-user salt)
```

### SQL Injection Protection
```typescript
// Parameterized queries (pg library)
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]  // Parameter, not concatenated
)
```

### XSS Protection
```
- React escapes by default
- Helmet.js security headers
- Content-Security-Policy enabled
- No innerHTML without sanitization
```

### CSRF Protection
```typescript
// SameSite cookies prevent CSRF
// Consider adding CSRF tokens for state-changing operations
app.use(helmet.csrfProtection())
```

## API Security

### Installation Password (Non-Resettable Design)

**Critical**: Each Raspberry Pi installation has a **single installation password** that:
- Is generated **once** on first user registration
- **Cannot be reset** or regenerated
- Is required for all user authentication
- Must be remembered or securely stored by users

**Why This Design?**
1. **Single source of truth** - One password protects entire installation
2. **Eliminates password recovery complexity** - No email reset tokens
3. **Prevents unauthorized account creation** - Without this password, new users cannot register
4. **User accountability** - Users must actively remember/maintain the password
5. **Backup protection** - Even if database is compromised, password cannot be reset

**Implementation**:
```typescript
// Can only be called ONCE during startup
export function generatePasswordOnFirstRegistration(): string {
  if (installationPasswords.has(INSTALLATION_ID)) {
    throw new Error('Password already exists and cannot be reset')
  }
  // Generate and store password
}

// Verification includes rate limiting
export function verifyPassword(providedPassword: string): boolean {
  // Max 10 attempts per 15 minutes
  // No password reset or recovery
}
```

**User Experience**:
- First registration generates password automatically
- Password shown ONCE with large warning
- User must copy and store securely
- If lost, installation must be reset (all users lose access)

**Security Trade-off**: 
- Pro: Impossible to brute-force or socially engineer password reset
- Con: Lost password = system inaccessible (requires full reset)

See [INSTALLATION_PASSWORD.md](INSTALLATION_PASSWORD.md) for detailed user guide.

### Authentication Endpoints
```
POST /api/auth/register    - Rate limited, email verification required
POST /api/auth/login       - Rate limited, returns secure cookie
POST /api/auth/logout      - Invalidates tokens
POST /api/auth/forgot-password - Token-based reset (no user enumeration)
```

### Protected Endpoints
```typescript
// Require valid JWT in cookie
router.get('/api/users/me', authenticate, handler)

// Require device token
router.post('/api/agent/push', authenticateDevice, handler)

// Require admin role
router.get('/api/admin/users', authenticate, requireAdmin, handler)
```

### Error Messages

**Secure Practice**:
- Don't reveal user existence
- Don't reveal password requirements in errors
- Generic messages: "Invalid email or password"
- Detailed logging server-side only

```typescript
// ❌ Insecure
res.status(401).json({ error: 'User not found' })

// ✅ Secure
res.status(401).json({ error: 'Invalid email or password' })
```

## CORS Configuration

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN,  // Strict single origin
  credentials: true,                 // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

- Only allows specified origin
- Cookies only with credentials: true
- No wildcard (*) in production

## Deployment Security

### TLS/SSL

```bash
# Let's Encrypt with Nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain/privkey.pem;
    
    # Strong ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Private VPN Deployments

For a private WireGuard-only deployment, transport encryption can be delegated to the VPN tunnel instead of public HTTPS.

Rules for that exception:

- only expose the WireGuard UDP port publicly
- keep web ports off the public router or firewall
- set `COOKIE_SECURE=false` only for the private VPN origin
- never reuse this mode for a public domain or public IP deployment

### Headers Security

```typescript
app.use(helmet())  // Sets security headers:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security: max-age=31536000
```

### Environment Variables

```bash
# Never commit these
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Use Docker secrets for production
# Use environment variable files with proper permissions
chmod 600 .env
```

### Database Security

```sql
-- Principle of least privilege
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE solar_portal TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;

-- Encrypted connections
# In docker-compose or heroku config:
sslmode=require
```

## Monitoring & Logging

### Audit Logging

```typescript
// Log all sensitive operations
{
  action: 'login',
  user_id: userId,
  ip_address: req.ip,
  user_agent: req.get('user-agent'),
  timestamp: new Date()
}
```

### Security Alerts

Monitor for:
- Multiple failed logins
- Unusual geographic login patterns
- Large data exports
- Admin permission changes
- Pairing code resets

### Log Storage

```
- Logs stored server-side only
- No sensitive data in logs
- Rotation: Daily, full year retention
- Backup: Encrypted, off-site
```

## Incident Response

### Procedures

1. **Suspected Breach**
   - Invalidate all sessions
   - Force password reset
   - Notify users

2. **HA Token Compromise**
   - Generate new HA token
   - Rotate device token
   - Re-pair agent

3. **Database Breach**
   - Passwords already hashed (Argon2 expensive)
   - Tokens invalid after breach
   - Implement CAPTCHA for login

## Security Checklist

- [ ] All passwords hashed with Argon2
- [ ] All tokens time-limited and server-validated
- [ ] HTTPS enforced in production
- [ ] Database connections encrypted
- [ ] Rate limiting on auth endpoints
- [ ] CORS properly configured
- [ ] Email verification required
- [ ] Admin routes protected
- [ ] Secrets in environment variables
- [ ] Audit logs stored server-side
- [ ] Error messages don't leak information
- [ ] Parameterized SQL queries
- [ ] Security headers enabled
- [ ] CSRF protection enabled
- [ ] Device tokens unique per agent

## Third-Party Security

### Dependencies

```bash
# Check for vulnerabilities
npm audit

# Update packages
npm audit fix
npm update
```

### Trusted Sources
- Docker Hub: Official images only (node:18-alpine, postgres:15-alpine)
- npm: Packages from trusted authors
- GitHub: Verify repository history

## Questions or Reports

Found a security issue?
- **Do not** open public issues
- Email security team with details
- Allow 48 hours for response
- Follow responsible disclosure

---

**Last Updated**: March 1, 2026
**Version**: 0.1.0 (MVP)
