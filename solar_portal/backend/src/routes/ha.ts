import { Request, Response, Router } from 'express';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { AuthRequest, authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createHACommand, getHACommand, getHAEntities } from '../services/haControlStore';

const router = Router();
const DEFAULT_SITE_ID = 'demo-site';

function getSiteIdForRequest(req: AuthRequest): string {
  if (req.user?.role === 'admin' && typeof req.query.siteId === 'string' && req.query.siteId.trim()) {
    return req.query.siteId.trim();
  }

  return DEFAULT_SITE_ID;
}

function parseDomains(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
}

router.get('/entities', authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const siteId = getSiteIdForRequest(authReq);
    const domains = parseDomains(req.query.domains);
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId.trim() : undefined;
    const entities = getHAEntities({ siteId, domains, deviceId });

    return res.json({ data: entities, siteId, count: entities.length });
  } catch (error) {
    logger.error('Failed to get HA entities:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst HA entity' });
  }
});

router.post('/commands', authenticate, apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nejste přihlášen' });
    }

    const { entityId, action, payload, deviceId } = req.body as {
      entityId?: string;
      action?: string;
      payload?: Record<string, unknown>;
      deviceId?: string;
    };

    if (!entityId || !action || !deviceId) {
      return res.status(400).json({ error: 'Pole entityId, action a deviceId jsou povinná' });
    }

    const command = createHACommand({
      siteId: getSiteIdForRequest(authReq),
      deviceId,
      entityId,
      action,
      payload,
      requestedByUserId: userId,
    });

    return res.status(201).json({ data: command, message: 'Příkaz byl zařazen do fronty' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nepodařilo se vytvořit příkaz';
    const statusCode = message === 'Entity not found' || message === 'Action is not allowed for entity domain' ? 400 : 500;
    if (statusCode === 500) {
      logger.error('Failed to create HA command:', error);
    }

    return res.status(statusCode).json({ error: message });
  }
});

router.get('/commands/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const command = getHACommand(req.params.id);
    if (!command) {
      return res.status(404).json({ error: 'Příkaz nebyl nalezen' });
    }

    return res.json({ data: command });
  } catch (error) {
    logger.error('Failed to get HA command:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst stav příkazu' });
  }
});

export default router;