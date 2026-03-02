import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Authentication middleware - validates JWT token from cookies
 * Attaches userId and user role to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({ error: 'Unauthorized - no token provided' });
      return;
    }

    // Decode base64 token (basic JWT-like structure)
    let decoded: any;
    try {
      const decoded_str = Buffer.from(token, 'base64').toString('utf-8');
      decoded = JSON.parse(decoded_str);
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Validate token structure
    if (!decoded.userId || !decoded.email) {
      res.status(401).json({ error: 'Invalid token structure' });
      return;
    }

    // Attach user info to request
    (req as any).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'customer'
    };

    logger.debug(`Authenticated user: ${decoded.email}`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Admin authorization middleware - requires admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden - admin access required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

/**
 * Device token authentication - validates device JWT from agent
 */
export function authenticateDevice(req: Request, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined;

    // Try Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fall back to X-Device-Token header (for backward compatibility)
    if (!token) {
      token = req.headers['x-device-token'] as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized - no device token provided' });
      return;
    }

    // For simple JWT-like tokens (base64 encoded JSON)
    // In production, use proper JWT verification with signing key
    let decoded: any;
    try {
      if (token.startsWith('eyJ')) {
        // Standard JWT - decode without verification for dev
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          // Add padding if needed
          const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
          const decoded_str = Buffer.from(padded, 'base64').toString('utf-8');
          decoded = JSON.parse(decoded_str);
        }
      } else {
        // Custom base64 format
        const decoded_str = Buffer.from(token, 'base64').toString('utf-8');
        decoded = JSON.parse(decoded_str);
      }
    } catch (e) {
      res.status(401).json({ error: 'Invalid device token format' });
      return;
    }

    // Validate token structure
    if (!decoded.deviceId && !decoded.siteId) {
      res.status(401).json({ error: 'Invalid device token structure' });
      return;
    }

    // Attach device info to request
    (req as any).device = {
      deviceId: decoded.deviceId,
      siteId: decoded.siteId
    };

    logger.debug(`Authenticated device: ${decoded.deviceId}`);
    next();
  } catch (error) {
    logger.error('Device authentication error:', error);
    res.status(500).json({ error: 'Device authentication failed' });
  }
}
