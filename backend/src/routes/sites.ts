import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { listAccessibleSites } from '../services/siteAccessStore';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nejste přihlášen' });
    }

    const sites = listAccessibleSites(req.user.role, req.user.siteId);
    return res.json({
      sites,
      count: sites.length
    });
  } catch (error) {
    logger.error('Get sites error:', error);
    return res.status(500).json({ error: 'Operace selhala' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nejste přihlášen' });
    }

    const sites = listAccessibleSites(req.user.role, req.user.siteId);
    const site = sites.find((item) => item.siteId === req.params.id);
    if (!site) {
      return res.status(404).json({ error: 'Lokalita nebyla nalezena' });
    }

    return res.json({ site });
  } catch (error) {
    logger.error('Get site error:', error);
    return res.status(500).json({ error: 'Operace selhala' });
  }
});

router.post('/', authenticate, async (_req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'Vytváření lokalit zatím není implementováno' });
});

router.get('/:id/data', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nejste přihlášen' });
  }

  const sites = listAccessibleSites(req.user.role, req.user.siteId);
  const site = sites.find((item) => item.siteId === req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Lokalita nebyla nalezena' });
  }

  return res.json({
    site,
    message: 'Použijte /api/data/* endpointy pro čtení dat lokality.'
  });
});

export default router;
