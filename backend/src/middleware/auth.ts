import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret, getSessionSecret } from '../config/runtime';
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

interface AccessTokenPayload {
  userId: string;
  email?: string;
  role?: 'customer' | 'admin';
}

interface DeviceTokenPayload {
  deviceId: string;
  siteId: string;
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
    const token = req.headers['x-device-token'] as string;

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

function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const parsed = jwt.verify(token, getSessionSecret());
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.userId !== 'string') {
      return null;
    }

    return {
      userId: parsed.userId,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      role: parsed.role === 'admin' ? 'admin' : 'customer'
    };
  } catch {
    return null;
  }
}

function decodeDeviceToken(token: string): DeviceTokenPayload | null {
  try {
    const parsed = jwt.verify(token, getJwtSecret());
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    if (typeof parsed.deviceId !== 'string' || typeof parsed.siteId !== 'string') {
      return null;
    }

    return {
      deviceId: parsed.deviceId,
      siteId: parsed.siteId
    };
  } catch {
    return null;
  }
}
