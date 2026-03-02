# Database Schema

## Overview

PostgreSQL database schema for Solar Portal. Uses UUID primary keys and timestamps for audit trail.

## Tables

### users
User accounts with email/password authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `email` (unique) - for login lookups

### sites
Installation/house records. Each user has 1 site (MVP), expandable to many.

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(511),
  timezone VARCHAR(63) DEFAULT 'UTC',
  status VARCHAR(50) DEFAULT 'offline',  -- 'online', 'offline', 'error'
  last_data_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Relationships:**
- `user_id` → `users.id` (one-to-one for MVP)

### devices
Hardware agents running on Raspberry Pi.

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  device_token VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  mac_address VARCHAR(17),
  model VARCHAR(255),
  version VARCHAR(255),
  paired_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'offline',  -- 'online', 'offline', 'error'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `device_token` (unique)
- `site_id` (foreign key)

### pairing_codes
Temporary codes for device pairing. Time-limited.

```sql
CREATE TABLE pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by_device_id UUID REFERENCES devices(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Feature:**
- Auto-cleanup: SQL job deletes expired codes daily
- Example code format: `ABC123DEF456` (12 chars, alphanumeric)

### entity_mappings
Maps Home Assistant entity IDs to portal metric types.

```sql
CREATE TABLE entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,  -- 'power_now', 'energy_today', etc.
  ha_entity_id VARCHAR(255) NOT NULL,
  unit_of_measurement VARCHAR(50),
  friendly_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_id, entity_type)
);
```

**Purpose:**
- Configuration: which HA entity maps to which portal field
- Admin sets up during initial install
- Agent reads this to determine what to collect

### data_points
Time-series data (historical). Indexed for fast range queries.

```sql
CREATE TABLE data_points (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,  -- 'power_now', 'energy_today', etc.
  value NUMERIC NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Characteristics:**
- High volume table (100k+ rows expected)
- **Indexes:**
  - `(site_id, timestamp DESC)` - dashboard queries
  - `(timestamp)` - cleanup queries
- **Retention:** Keep last 90 days (auto-cleanup job)
- **Aggregation:** Store hourly/daily aggregates separately for efficiency

### current_values
Latest snapshot per site. Updated frequently, small table.

```sql
CREATE TABLE current_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
  power_now NUMERIC,
  energy_today NUMERIC,
  battery_soc NUMERIC,
  voltage NUMERIC,
  current NUMERIC,
  temperature NUMERIC,
  last_update TIMESTAMP,
  data_age_minutes INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:**
- Fast dashboard display (no range query needed)
- One row per site
- Updated on each agent push

### audit_logs
Immutable audit trail for compliance.

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,  -- 'login', 'pairing_reset', 'config_change', etc.
  resource_type VARCHAR(100),    -- 'user', 'site', 'device', etc.
  resource_id UUID,
  changes JSONB,                 -- what changed
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Properties:**
- Immutable (never updated or deleted)
- **Indexes:** `(user_id, created_at DESC)`, `(resource_type, resource_id)`
- **Retention:** Keep forever (GDPR: can anonymize user_id)
- **Example log entry:**
  ```json
  {
    "action": "pairing_reset",
    "resource_type": "device",
    "resource_id": "device-uuid",
    "changes": {
      "previous_device_id": "old-uuid",
      "new_device_id": null,
      "reason": "manual_reset"
    },
    "user_id": "admin-uuid",
    "ip_address": "192.168.1.100"
  }
  ```

### email_verification_tokens
Temporary tokens for email verification.

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Cleanup:**
- Delete expired tokens daily
- Delete when email verified
- One token per user (unique constraint)

### password_reset_tokens
Temporary tokens for password reset flow.

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Cleanup:**
- Delete used tokens after 24 hours
- Delete expired tokens
- Each reset request creates new token

## Views (Optional)

### site_summary
Denormalized view for admin dashboard.

```sql
CREATE VIEW site_summary AS
SELECT
  s.id,
  s.name,
  s.status,
  u.email as owner_email,
  d.status as device_status,
  d.last_seen_at,
  cv.power_now,
  cv.battery_soc,
  cv.last_update
FROM sites s
JOIN users u ON s.user_id = u.id
LEFT JOIN devices d ON s.id = d.site_id
LEFT JOIN current_values cv ON s.id = cv.site_id;
```

## Maintenance Jobs

### Daily: Cleanup Expired Tokens
```sql
DELETE FROM email_verification_tokens WHERE expires_at < NOW();
DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used_at IS NULL;
DELETE FROM pairing_codes WHERE expires_at < NOW();
```

### Weekly: Aggregate Old Data
```sql
-- Create hourly aggregates
INSERT INTO data_points_hourly (site_id, metric_type, value_avg, value_min, value_max, hour)
SELECT
  site_id,
  metric_type,
  AVG(value),
  MIN(value),
  MAX(value),
  DATE_TRUNC('hour', timestamp)
FROM data_points
WHERE timestamp < NOW() - INTERVAL '1 day'
GROUP BY site_id, metric_type, DATE_TRUNC('hour', timestamp);

-- Delete old granular data
DELETE FROM data_points WHERE timestamp < NOW() - INTERVAL '7 days';
```

### Monthly: Retention
```sql
-- Keep detailed data for last 30 days
-- Keep aggregated data for last year
DELETE FROM data_points_hourly WHERE hour < NOW() - INTERVAL '1 year';

-- Archive very old audit logs
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 years';
```

## Query Examples

### Dashboard: Current Values for Site
```sql
SELECT
  s.name,
  s.status,
  cv.power_now,
  cv.energy_today,
  cv.battery_soc,
  cv.last_update,
  d.status as device_status,
  EXTRACT(EPOCH FROM (NOW() - cv.last_update)) / 60 as minutes_since_update
FROM sites s
LEFT JOIN current_values cv ON s.id = cv.site_id
LEFT JOIN devices d ON s.id = d.site_id
WHERE s.id = $1;
```

### Graphs: Last 24 Hours
```sql
SELECT
  timestamp,
  value
FROM data_points
WHERE
  site_id = $1
  AND metric_type = $2
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp ASC;
```

### Admin: Site Status Overview
```sql
SELECT
  s.id,
  s.name,
  s.status,
  COUNT(DISTINCT d.id) as device_count,
  MAX(cv.last_update) as last_data,
  COUNT(CASE WHEN d.status = 'online' THEN 1 END) as online_devices
FROM sites s
LEFT JOIN devices d ON s.id = d.site_id
LEFT JOIN current_values cv ON s.id = cv.site_id
GROUP BY s.id, s.name, s.status;
```

### User Login History
```sql
SELECT
  DATE(created_at) as login_date,
  COUNT(*) as login_count
FROM audit_logs
WHERE
  user_id = $1
  AND action = 'login'
GROUP BY DATE(created_at)
ORDER BY login_date DESC;
```

## Performance Considerations

### Indexes

All major foreign keys and query filters indexed:
```
sites(user_id)
devices(site_id, status)
data_points(site_id, timestamp DESC)
audit_logs(user_id, action, created_at DESC)
```

### Partitioning (Future)

For large scale (millions of data points):
```sql
-- Partition data_points by month
CREATE TABLE data_points_2024_01 PARTITION OF data_points
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Caching

- Cache `current_values` with 30-second TTL
- Cache `entity_mappings` with 24-hour TTL
- Cache `site summary` with 5-minute TTL

## Migrations

Using raw SQL instead of ORM for MVP.

Create migration files:
- `migrations/001_initial_schema.sql`
- `migrations/002_add_indexes.sql`

Run on startup:
```typescript
// backend/src/scripts/migrate.ts
```

---

**Last Updated**: March 1, 2026  
**Version**: 0.1.0 (MVP)
