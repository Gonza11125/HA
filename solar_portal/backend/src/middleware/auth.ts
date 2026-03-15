import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'customer' | 'admin';
  };
  device?: {
    id: string;
    siteId: string;
  };
  cookies: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies.accessToken || extractTokenFromHeader(req);

    if (!token) {
      res.status(401).json({ error: 'Chybí autentizační token' });
      return;
    }

    const decoded = decodeAccessToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Token je neplatný nebo vypršel' });
      return;
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'customer'
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    res.status(401).json({ error: 'Token je neplatný nebo vypršel' });
  }
}

export function authenticateDevice(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = req.headers['x-device-token'] as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Chybí token zařízení' });
      return;
    }

    const decoded = decodeDeviceToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Neplatný token zařízení' });
      return;
    }

    req.device = {
      id: decoded.deviceId,
      siteId: decoded.siteId
    };

    next();
  } catch (error) {
    logger.warn('Device authentication failed:', error);
    res.status(401).json({ error: 'Neplatný token zařízení' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Nejste přihlášen' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Vyžadován přístup administrátora' });
    return;
  }

  next();
}

function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function decodeAccessToken(token: string): { userId: string; email?: string; role?: 'customer' | 'admin' } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed?.userId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function decodeDeviceToken(token: string): { deviceId: string; siteId: string } | null {
  try {
    if (token.startsWith('eyJ')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
        const raw = Buffer.from(padded, 'base64').toString('utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.deviceId && parsed?.siteId) {
          return parsed;
        }
      }
      return null;
    }

    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed?.deviceId || !parsed?.siteId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
