import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'solar_portal',
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

export async function initializeDatabase(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection successful:', result.rows[0]);
    
    // Run migrations
    await runMigrations();
  } catch (error) {
    logger.warn('Database connection failed:', error);
    logger.warn('Running in development mode without database');
    // Don't throw - allow app to continue without DB in development
  }
}

export async function runMigrations(): Promise<void> {
  // This will be expanded with actual migration logic
  logger.info('Running database migrations...');
  try {
    // Create tables if they don't exist
    await createTables();
    logger.info('Migrations completed');
  } catch (error) {
    logger.warn('Migration failed:', error);
    logger.warn('Continuing without migrations - running in mock mode');
    // Don't throw - allow app to continue
  }
}

async function createTables(): Promise<void> {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      email_verified BOOLEAN DEFAULT false,
      email_verified_at TIMESTAMP,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Sites (Installations)
    `CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(511),
      timezone VARCHAR(63) DEFAULT 'UTC',
      status VARCHAR(50) DEFAULT 'offline',
      last_data_received_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Devices (Agents)
    `CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      device_token VARCHAR(255) NOT NULL UNIQUE,
      device_name VARCHAR(255),
      mac_address VARCHAR(17),
      model VARCHAR(255),
      version VARCHAR(255),
      paired_at TIMESTAMP,
      last_seen_at TIMESTAMP,
      status VARCHAR(50) DEFAULT 'offline',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Pairing Codes
    `CREATE TABLE IF NOT EXISTS pairing_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      code VARCHAR(20) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      used_by_device_id UUID REFERENCES devices(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Entity Mappings (HA entity -> Portal field)
    `CREATE TABLE IF NOT EXISTS entity_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      ha_entity_id VARCHAR(255) NOT NULL,
      unit_of_measurement VARCHAR(50),
      friendly_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(site_id, entity_type)
    )`,

    // Data Points (Time series data)
    `CREATE TABLE IF NOT EXISTS data_points (
      id BIGSERIAL PRIMARY KEY,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      metric_type VARCHAR(50) NOT NULL,
      value NUMERIC NOT NULL,
      unit VARCHAR(50),
      timestamp TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Current Values (Latest snapshot)
    `CREATE TABLE IF NOT EXISTS current_values (
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
    )`,

    // Audit Log
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      resource_type VARCHAR(100),
      resource_id UUID,
      changes JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Email Verification Tokens
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Password Reset Tokens
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Create indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_devices_site_id ON devices(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_data_points_site_id ON data_points(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_data_points_timestamp ON data_points(timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at ON pairing_codes(expires_at)`
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (error) {
      logger.error('Error executing migration query:', error);
      throw error;
    }
  }
}

export function getPool(): Pool {
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<any>> {
  return pool.query<any>(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
