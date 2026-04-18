import { logger } from '../utils/logger';

const DEVELOPMENT_JWT_SECRET = 'development-only-jwt-secret-change-me';
const DEVELOPMENT_SESSION_SECRET = 'development-only-session-secret-change-me';

let warnedAboutDevelopmentSecret = false;
let warnedAboutDevelopmentSessionSecret = false;

function parseBooleanEnv(value: string | undefined): boolean {
  return String(value || '').trim().toLowerCase() === 'true';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getBackendHost(): string {
  const configuredHost = String(process.env.BACKEND_HOST || '').trim();
  return configuredHost || '0.0.0.0';
}

export function isStrictCorsEnabled(): boolean {
  return isProductionEnvironment() || parseBooleanEnv(process.env.STRICT_CORS);
}

export function shouldUseSecureCookies(): boolean {
  return isProductionEnvironment() || parseBooleanEnv(process.env.COOKIE_SECURE);
}

export function getCookieSameSite(): 'lax' | 'strict' | 'none' {
  const defaultValue = shouldUseSecureCookies() ? 'strict' : 'lax';
  const configuredValue = String(process.env.COOKIE_SAME_SITE || defaultValue).trim().toLowerCase();

  if (configuredValue === 'strict' || configuredValue === 'lax' || configuredValue === 'none') {
    return configuredValue;
  }

  return defaultValue;
}

export function getCookieDomain(): string | undefined {
  const configuredDomain = String(process.env.COOKIE_DOMAIN || '').trim();
  return configuredDomain || undefined;
}

export function getJwtSecret(): string {
  const configuredSecret = String(process.env.JWT_SECRET || '').trim();

  if (configuredSecret) {
    if (isProductionEnvironment() && configuredSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }

    return configuredSecret;
  }

  if (isProductionEnvironment()) {
    throw new Error('JWT_SECRET must be configured in production');
  }

  if (!warnedAboutDevelopmentSecret) {
    logger.warn('JWT_SECRET is not set. Using insecure development fallback.');
    warnedAboutDevelopmentSecret = true;
  }

  return DEVELOPMENT_JWT_SECRET;
}

export function getSessionSecret(): string {
  const configuredSecret = String(process.env.SESSION_SECRET || '').trim();

  if (configuredSecret) {
    if (isProductionEnvironment() && configuredSecret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters long in production');
    }

    return configuredSecret;
  }

  if (isProductionEnvironment()) {
    throw new Error('SESSION_SECRET must be configured in production');
  }

  if (!warnedAboutDevelopmentSessionSecret) {
    logger.warn('SESSION_SECRET is not set. Using insecure development fallback.');
    warnedAboutDevelopmentSessionSecret = true;
  }

  return DEVELOPMENT_SESSION_SECRET;
}

export function validateRuntimeConfig(): void {
  const corsOrigin = String(process.env.CORS_ORIGIN || '').trim();

  if (isStrictCorsEnabled() && !corsOrigin) {
    throw new Error('CORS_ORIGIN must be configured when STRICT_CORS is enabled or NODE_ENV=production');
  }

  getJwtSecret();
  getSessionSecret();

  if (shouldUseSecureCookies() && corsOrigin) {
    const insecureOrigins = corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.startsWith('http://'));

    if (insecureOrigins.length > 0) {
      logger.warn('COOKIE_SECURE is enabled while CORS_ORIGIN contains http:// origins', { insecureOrigins });
    }
  }

  if (getCookieSameSite() === 'none' && !shouldUseSecureCookies()) {
    logger.warn('COOKIE_SAME_SITE=none without COOKIE_SECURE may be rejected by browsers');
  }
}