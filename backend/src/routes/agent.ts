import express, { Router, Request, Response } from 'express';
import { authenticateDevice } from '../middleware/authentication';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { updateLiveDataFromAgent } from '../services/liveDataStore';
import fs from 'fs';

const router = Router();
const DEFAULT_PAIRING_CODE = '150N6E';
const AGENT_CONFIG_PATH = '/data/agent-config.json';

interface AutomationConfig {
  id: string;
  name: string;
  enabled: boolean;
  mode: 'auto' | 'manual';
  source: 'HA settings';
  lastRun: string;
}

function getAutomationsFromAgentConfig(): AutomationConfig[] {
  try {
    if (!fs.existsSync(AGENT_CONFIG_PATH)) {
      return [];
    }

    const raw = fs.readFileSync(AGENT_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { haAutomations?: unknown };
    if (!Array.isArray(parsed.haAutomations)) {
      return [];
    }

    return parsed.haAutomations
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => ({
        id: String(item.id ?? `ha-automation-${index + 1}`),
        name: String(item.name ?? item.alias ?? `HA automatizace ${index + 1}`),
        enabled: Boolean(item.enabled ?? false),
        mode: item.mode === 'manual' ? 'manual' : 'auto',
        source: 'HA settings' as const,
        lastRun: String(item.lastRun ?? 'N/A')
      }));
  } catch (error) {
    logger.warn('Failed to read HA automations from agent config', error);
    return [];
  }
}

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
      return res.status(400).json({ error: 'Párovací kód je povinný' });
    }

    const expectedPairingCode = getPairingCode();
    if (String(pairingCode).trim().toUpperCase() !== expectedPairingCode) {
      return res.status(400).json({ error: 'Neplatný párovací kód' });
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
    return res.status(500).json({ error: 'Párování selhalo' });
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
    return res.status(500).json({ error: 'Nepodařilo se získat stav zařízení' });
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

    return res.json({ message: 'Zařízení bylo úspěšně odpárováno' });
  } catch (error) {
    logger.error('Device unpairing error:', error);
    return res.status(500).json({ error: 'Nepodařilo se odpárovat zařízení' });
  }
});

// POST /api/agent/push - Agent pushes real-time data
router.post('/push', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const { timestamp, metrics, health } = req.body;

    if (!timestamp || !metrics) {
      return res.status(400).json({ error: 'Chybí povinná pole' });
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
    return res.json({ message: 'Data byla úspěšně přijata' });
  } catch (error) {
    logger.error('Agent push error:', error);
    return res.status(500).json({ error: 'Zpracování dat selhalo' });
  }
});

// GET /api/agent/config - Get agent configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const haAutomations = getAutomationsFromAgentConfig();
    const config = {
      pollingInterval: 5000,
      maxRetries: 3,
      timeout: 15000,
      haAutomations,
      endpoints: {
        auth: '/api/auth/login',
        push: '/api/agent/push',
        health: '/api/health'
      }
    };

    return res.json({ config });
  } catch (error) {
    logger.error('Get config error:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst konfiguraci' });
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
    return res.status(500).json({ error: 'Ping selhal' });
  }
});

export default router;
