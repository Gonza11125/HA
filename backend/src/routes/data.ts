import { Router, Response } from 'express';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getAllConnectionStatuses, getAllHistory, getAllLiveData, getConnectionStatus, getHistory, getLiveData } from '../services/liveDataStore';

const router = Router();

function parseSiteId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveRequestedSite(req: AuthRequest): { allSites: boolean; siteId?: string; status?: number; error?: string } {
  const requestedSiteId = parseSiteId(req.query.siteId);

  if (!req.user) {
    return { allSites: false, status: 401, error: 'Nejste přihlášen' };
  }

  if (req.user.role === 'admin') {
    if (requestedSiteId) {
      return { allSites: false, siteId: requestedSiteId };
    }

    return { allSites: true };
  }

  if (!req.user.siteId) {
    return { allSites: false, status: 403, error: 'Uživatel nemá přiřazený siteId' };
  }

  if (requestedSiteId && requestedSiteId !== req.user.siteId) {
    return { allSites: false, status: 403, error: 'Nemáte přístup k jiné lokalitě' };
  }

  return { allSites: false, siteId: req.user.siteId };
}

router.use(authenticate);
router.use(apiRateLimiter);

router.get('/current', async (req: AuthRequest, res: Response) => {
  try {
    const resolvedSite = resolveRequestedSite(req);
    if (resolvedSite.status) {
      return res.status(resolvedSite.status).json({ error: resolvedSite.error });
    }

    if (resolvedSite.allSites) {
      return res.json({ sites: getAllLiveData() });
    }

    return res.json(getLiveData(resolvedSite.siteId!));
  } catch (error) {
    logger.error('Failed to get current data:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst aktuální data' });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = Number.parseFloat(req.query.hours as string);
    const hours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    const resolvedSite = resolveRequestedSite(req);

    if (resolvedSite.status) {
      return res.status(resolvedSite.status).json({ error: resolvedSite.error });
    }

    if (resolvedSite.allSites) {
      return res.json({ sites: getAllHistory(hours) });
    }

    return res.json(getHistory(resolvedSite.siteId!, hours));
  } catch (error) {
    logger.error('Failed to get history data:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst historická data' });
  }
});

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const resolvedSite = resolveRequestedSite(req);
    if (resolvedSite.status) {
      return res.status(resolvedSite.status).json({ error: resolvedSite.error });
    }

    if (resolvedSite.allSites) {
      return res.json({ sites: getAllConnectionStatuses() });
    }

    return res.json(getConnectionStatus(resolvedSite.siteId!));
  } catch (error) {
    logger.error('Failed to get status:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst stav' });
  }
});

export default router;
