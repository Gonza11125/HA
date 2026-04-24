import express, { Router, Request, Response } from 'express';
import { authenticateDevice } from '../middleware/authentication';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { updateLiveDataFromAgent } from '../services/liveDataStore';
import {
  claimPendingCommands,
  completeHACommand,
  HACommandResult,
  HAEntityView,
  syncHAEntities,
} from '../services/haControlStore';

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

// POST /api/agent/entities/sync - Agent syncs latest HA controllable entities
router.post('/entities/sync', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const { entities } = req.body as { entities?: HAEntityView[] };
    const deviceRequest = req as Request & { device?: { deviceId?: string; siteId?: string; id?: string } };
    const siteId = deviceRequest.device?.siteId;
    const deviceId = deviceRequest.device?.deviceId || deviceRequest.device?.id;

    if (!siteId || !deviceId) {
      return res.status(401).json({ error: 'Neplatný kontext zařízení' });
    }

    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'Pole entities je povinné' });
    }

    const count = syncHAEntities({ siteId, deviceId, entities });
    return res.json({ message: 'Entity byly synchronizovány', count });
  } catch (error) {
    logger.error('Entity sync error:', error);
    return res.status(500).json({ error: 'Synchronizace entit selhala' });
  }
});

// GET /api/agent/commands/pending - Agent pulls pending HA commands
router.get('/commands/pending', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const deviceRequest = req as Request & { device?: { deviceId?: string; siteId?: string; id?: string } };
    const siteId = deviceRequest.device?.siteId;
    const deviceId = deviceRequest.device?.deviceId || deviceRequest.device?.id;

    if (!siteId || !deviceId) {
      return res.status(401).json({ error: 'Neplatný kontext zařízení' });
    }

    const commands = claimPendingCommands(siteId, deviceId);
    return res.json({ data: commands, count: commands.length });
  } catch (error) {
    logger.error('Get pending commands error:', error);
    return res.status(500).json({ error: 'Nepodařilo se načíst frontu příkazů' });
  }
});

// POST /api/agent/commands/:id/result - Agent submits HA command execution result
router.post('/commands/:id/result', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const body = req.body as HACommandResult;
    if (typeof body.ok !== 'boolean') {
      return res.status(400).json({ error: 'Pole ok je povinné' });
    }

    const command = completeHACommand(req.params.id, body);
    if (!command) {
      return res.status(404).json({ error: 'Příkaz nebyl nalezen' });
    }

    return res.json({ data: command, message: 'Výsledek příkazu byl uložen' });
  } catch (error) {
    logger.error('Command result error:', error);
    return res.status(500).json({ error: 'Nepodařilo se uložit výsledek příkazu' });
  }
});

// GET /api/agent/config - Get agent configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = {
      pollingInterval: 5000,
      maxRetries: 3,
      timeout: 15000,
      controlledDomains: ['automation', 'climate', 'scene', 'script', 'switch'],
      endpoints: {
        auth: '/api/auth/login',
        push: '/api/agent/push',
        health: '/api/health',
        entitySync: '/api/agent/entities/sync',
        pendingCommands: '/api/agent/commands/pending',
        commandResult: '/api/agent/commands/:id/result'
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
