import express, { Router, Request, Response } from 'express';
import { authenticateDevice } from '../middleware/authentication';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { updateLiveDataFromAgent } from '../services/liveDataStore';

const router = Router();
const DEFAULT_PAIRING_CODE = '150N6E';

function getPairingCode(): string {
  return DEFAULT_PAIRING_CODE;
}

// Mock device storage
const pairedDevices = new Map<string, any>();

// GET /api/agent/pairing-code - Get stable pairing code for current installation
router.get('/pairing-code', async (_req: Request, res: Response) => {
  return res.json({ pairingCode: getPairingCode() });
});

// POST /api/agent/pair - Pair a new Raspberry Pi device
router.post('/pair', async (req: Request, res: Response) => {
  try {
    const { pairingCode } = req.body;

    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code required' });
    }

    const expectedPairingCode = getPairingCode();
    if (String(pairingCode).trim().toUpperCase() !== expectedPairingCode) {
      return res.status(400).json({ error: 'Invalid pairing code' });
    }

    const deviceId = uuidv4();
    const deviceToken = jwt.sign(
      {
        deviceId,
        siteId: 'demo-site'
      },
      process.env.JWT_SECRET || 'secret',
      {
        expiresIn: '365d'
      }
    );

    const device = {
      deviceId,
      deviceToken,
      pairingCode,
      pairedAt: new Date().toISOString(),
      lastSyncAt: null,
      status: 'connecting'
    };

    pairedDevices.set(deviceId, device);
    logger.info(`Device paired: ${deviceId}`);

    return res.status(201).json({
      deviceId,
      deviceToken,
      pairedAt: device.pairedAt
    });
  } catch (error) {
    logger.error('Device pairing error:', error);
    return res.status(500).json({ error: 'Pairing failed' });
  }
});

// GET /api/agent/status - Get device status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const mockStatus = {
      isPaired: pairedDevices.size > 0,
      deviceId: Array.from(pairedDevices.keys())[0],
      haUrl: 'http://192.168.1.100:8123 (hidden)',
      lastDataSync: new Date(Date.now() - 5000).toISOString(),
      connectionStatus: pairedDevices.size > 0 ? 'connected' : 'disconnected'
    };

    return res.json(mockStatus);
  } catch (error) {
    logger.error('Get device status error:', error);
    return res.status(500).json({ error: 'Failed to get device status' });
  }
});

// POST /api/agent/unpair - Unpair a device
router.post('/unpair', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;

    if (deviceId && pairedDevices.has(deviceId)) {
      pairedDevices.delete(deviceId);
      logger.info(`Device unpaired: ${deviceId}`);
    }

    return res.json({ message: 'Device unpaired successfully' });
  } catch (error) {
    logger.error('Device unpairing error:', error);
    return res.status(500).json({ error: 'Failed to unpair device' });
  }
});

// POST /api/agent/push - Agent pushes real-time data
router.post('/push', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const { timestamp, metrics, health } = req.body;

    if (!timestamp || !metrics) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deviceRequest = req as Request & { device?: { id: string } };
    if (deviceRequest.device?.id && !pairedDevices.has(deviceRequest.device.id)) {
      pairedDevices.set(deviceRequest.device.id, {
        deviceId: deviceRequest.device.id,
        pairedAt: new Date().toISOString(),
        status: 'connected'
      });
    }

    logger.info('Data received from agent:', { timestamp, metrics });
    updateLiveDataFromAgent({ timestamp, metrics });
    return res.json({ message: 'Data received successfully' });
  } catch (error) {
    logger.error('Agent push error:', error);
    return res.status(500).json({ error: 'Failed to process data' });
  }
});

// GET /api/agent/config - Get agent configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = {
      pollingInterval: 5000,
      maxRetries: 3,
      timeout: 15000,
      endpoints: {
        auth: '/api/auth/login',
        push: '/api/agent/push',
        health: '/api/health'
      }
    };

    return res.json({ config });
  } catch (error) {
    logger.error('Get config error:', error);
    return res.status(500).json({ error: 'Failed to get config' });
  }
});

// POST /api/agent/ping - Health check from agent
router.post('/ping', async (req: Request, res: Response) => {
  try {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      serverUptime: process.uptime()
    });
  } catch (error) {
    logger.error('Ping error:', error);
    return res.status(500).json({ error: 'Ping failed' });
  }
});

export default router;
