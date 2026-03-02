import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getConnectionStatus, getHistory, getLiveData } from '../services/liveDataStore';

const router = Router();

// GET /api/data/current - Get current real-time data
router.get('/current', async (req: Request, res: Response) => {
  try {
    return res.json(getLiveData());
  } catch (error) {
    logger.error('Failed to get current data:', error);
    return res.status(500).json({ error: 'Failed to fetch current data' });
  }
});

// GET /api/data/history - Get historical data (mock)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    return res.json(getHistory(hours));
  } catch (error) {
    logger.error('Failed to get history data:', error);
    return res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// GET /api/data/status - Get connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    return res.json(getConnectionStatus());
  } catch (error) {
    logger.error('Failed to get status:', error);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
