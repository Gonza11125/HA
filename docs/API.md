# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via:
- JWT token in `Authorization: Bearer <token>` header, OR
- `accessToken` in HTTP-only cookie

Agent endpoints use:
- `X-Device-Token: <device_token>` header

## Response Format

All responses are JSON:

```json
{
  "data": {...},
  "error": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Errors:
```json
{
  "error": "Error message",
  "details": {...}
}
```

## Endpoints

### Authentication

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "passwordConfirm": "secure_password",
  "fullName": "John Doe",
  "agreeToTerms": true
}
```

**Response:** 201 Created
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "message": "Account created. Please verify your email."
}
```

#### POST /auth/login
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "rememberMe": true
}
```

**Response:** 200 OK
- Sets secure HTTP-only cookies
- `accessToken`: Short-lived (12 hours or less)
- `refreshToken`: Long-lived (30 days if rememberMe=true)

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

#### POST /auth/logout
Invalidate current session.

**Response:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

#### POST /auth/forgot-password
Request password reset link.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** 200 OK (always, even if user doesn't exist)
```json
{
  "message": "If account exists, password reset email has been sent"
}
```

#### POST /auth/reset-password
Reset password using token from email.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "password": "new_password",
  "passwordConfirm": "new_password"
}
```

**Response:** 200 OK
```json
{
  "message": "Password reset successfully"
}
```

#### POST /auth/verify-email
Verify email using token from email.

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response:** 200 OK
```json
{
  "message": "Email verified successfully"
}
```

### User

#### GET /users/me
Get current user profile.

**Required Auth:** Yes

**Response:** 200 OK
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "emailVerified": true,
  "lastLogin": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-10T15:30:00Z"
}
```

#### PUT /users/me
Update current user profile.

**Required Auth:** Yes

**Request:**
```json
{
  "fullName": "Jane Doe"
}
```

**Response:** 200 OK
```json
{
  "message": "Profile updated successfully"
}
```

#### POST /users/change-password
Change password.

**Required Auth:** Yes

**Request:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password",
  "passwordConfirm": "new_password"
}
```

**Response:** 200 OK
```json
{
  "message": "Password changed successfully"
}
```

### Sites (Installations)

#### GET /sites
List all sites for current user.

**Required Auth:** Yes

**Query Parameters:**
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:** 200 OK
```json
{
  "sites": [
    {
      "id": "uuid",
      "name": "Home Solar System",
      "address": "123 Main St",
      "timezone": "Europe/Prague",
      "status": "online",
      "lastDataReceivedAt": "2024-01-15T10:25:00Z",
      "createdAt": "2024-01-10T15:30:00Z"
    }
  ],
  "total": 1
}
```

#### GET /sites/:id
Get single site details.

**Required Auth:** Yes

**Response:** 200 OK
```json
{
  "id": "uuid",
  "name": "Home Solar System",
  "address": "123 Main St",
  "timezone": "Europe/Prague",
  "status": "online",
  "lastDataReceivedAt": "2024-01-15T10:25:00Z",
  "device": {
    "id": "uuid",
    "name": "Agent 1",
    "status": "online",
    "pairedAt": "2024-01-10T15:30:00Z"
  },
  "currentValues": {
    "powerNow": 2450,
    "energyToday": 12.5,
    "batterySoc": 85,
    "lastUpdate": "2024-01-15T10:25:00Z"
  }
}
```

#### POST /sites
Create new site.

**Required Auth:** Yes

**Request:**
```json
{
  "name": "Home Solar System",
  "address": "123 Main St",
  "timezone": "Europe/Prague"
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "name": "Home Solar System",
  "pairingCode": "ABC123DEF456",
  "pairingCodeExpiresAt": "2024-01-15T10:45:00Z"
}
```

#### GET /sites/:id/data
Get historical data for site.

**Required Auth:** Yes

**Query Parameters:**
- `timeRange`: "24h", "7d", "30d" (default: "24h")
- `metric`: "power_now", "energy_today", "battery_soc" (default: "power_now")

**Response:** 200 OK
```json
{
  "metric": "power_now",
  "unit": "W",
  "timeRange": "24h",
  "data": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "value": 0
    },
    {
      "timestamp": "2024-01-15T06:30:00Z",
      "value": 2450
    }
  ]
}
```

### Agent

#### POST /agent/pair
Pair agent to cloud (called by agent).

**Request:**
```json
{
  "pairingCode": "ABC123DEF456"
}
```

**Response:** 200 OK
```json
{
  "deviceToken": "device_jwt_token",
  "siteId": "uuid",
  "expiresIn": 31536000
}
```

#### POST /agent/push
Push data from agent to cloud.

**Required Auth:** Device Token

**Request:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "metrics": {
    "power_now": 2450,
    "energy_today": 12.5,
    "battery_soc": 85
  },
  "health": {
    "lastDataAge": 0,
    "agentHealth": "healthy"
  }
}
```

**Response:** 200 OK
```json
{
  "message": "Data received",
  "nextPushIn": 30000
}
```

#### GET /agent/config
Get agent configuration.

**Required Auth:** Device Token

**Response:** 200 OK
```json
{
  "config": {
    "pollingInterval": 30000,
    "entityMappings": [
      {
        "type": "power_now",
        "entityId": "sensor.solar_power"
      }
    ]
  }
}
```

#### POST /agent/ping
Health check (no data).

**Required Auth:** Device Token

**Response:** 200 OK
```json
{
  "status": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Admin

All admin endpoints require `role: "admin"`.

#### GET /admin/dashboard
Get admin dashboard stats.

**Required Auth:** Yes + Admin Role

**Response:** 200 OK
```json
{
  "stats": {
    "totalUsers": 42,
    "totalSites": 38,
    "onlineSites": 35,
    "dataPointsToday": 51200,
    "avgResponseTime": 125
  }
}
```

#### GET /admin/users
List all users.

**Required Auth:** Yes + Admin Role

**Query Parameters:**
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset
- `search`: Search by email or name
- `role`: Filter by role

**Response:** 200 OK
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "customer",
      "emailVerified": true,
      "lastLogin": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-10T15:30:00Z"
    }
  ],
  "total": 42
}
```

#### GET /admin/sites
List all sites.

**Required Auth:** Yes + Admin Role

**Response:** 200 OK
```json
{
  "sites": [
    {
      "id": "uuid",
      "name": "Site Name",
      "user": {
        "id": "uuid",
        "email": "owner@example.com"
      },
      "status": "online",
      "device": {
        "id": "uuid",
        "status": "online",
        "lastSeen": "2024-01-15T10:25:00Z"
      }
    }
  ],
  "total": 38
}
```

#### POST /admin/sites/:id/pairing-code
Generate new pairing code.

**Required Auth:** Yes + Admin Role

**Request:**
```json
{
  "expiryMinutes": 15
}
```

**Response:** 200 OK
```json
{
  "pairingCode": "ABC123DEF456",
  "expiresAt": "2024-01-15T10:45:00Z"
}
```

#### POST /admin/sites/:id/reset-pairing
Reset device pairing (unpair existing device).

**Required Auth:** Yes + Admin Role

**Response:** 200 OK
```json
{
  "message": "Device pairing reset. New pairing code: XYZ789"
}
```

#### GET /admin/audit-logs
View audit logs.

**Required Auth:** Yes + Admin Role

**Query Parameters:**
- `limit`: Results per page (default: 50)
- `offset`: Pagination
- `action`: Filter by action type
- `userId`: Filter by user
- `startDate`: ISO date filter
- `endDate`: ISO date filter

**Response:** 200 OK
```json
{
  "logs": [
    {
      "id": 1234,
      "action": "login",
      "user": {
        "id": "uuid",
        "email": "user@example.com"
      },
      "resourceType": "user_session",
      "ipAddress": "192.168.1.100",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 890
}
```

## Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated or invalid credentials
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error

## Error Response

```json
{
  "error": "Invalid email or password",
  "code": "AUTH_INVALID_CREDENTIALS",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Error codes:
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_NOT_VERIFIED`
- `AUTH_EMAIL_EXISTS`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `INTERNAL_ERROR`

---

**Last Updated**: March 1, 2026
**Version**: 0.1.0
