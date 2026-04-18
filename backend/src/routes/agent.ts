import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getJwtSecret } from '../config/runtime';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, authenticateDevice, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { updateLiveDataFromAgent } from '../services/liveDataStore';
import fs from 'fs';

const router = Router();
const AGENT_CONFIG_PATH = '/data/agent-config.json';
const PAIRING_STATE_PATH = process.env.PAIRING_STATE_FILE || '/data/pairing-state.json';
const PAIRING_CODE_TTL_MS = parseInt(process.env.PAIRING_CODE_TTL_MS || '600000', 10);
const PAIRING_CODE_SALT = process.env.PAIRING_CODE_SALT || 'solar-portal-pairing-salt';

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

interface PairedDevice {
  deviceId: string;
  deviceToken?: string;
  pairingCode?: string;
  pairedAt: string;
  lastSyncAt?: string | null;
  status: 'connecting' | 'connected';
}

interface PairingState {
  codeHash: string;
  expiresAt: string;
  createdAt: string;
}

// Mock device storage
const pairedDevices = new Map<string, PairedDevice>();

function normalizePairingCode(value: string): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function createPairingCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function hashPairingCode(pairingCode: string): string {
  return crypto.createHash('sha256').update(`${PAIRING_CODE_SALT}:${normalizePairingCode(pairingCode)}`).digest('hex');
}

function ensureStateDirectory(filePath: string): void {
  const directory = filePath.substring(0, filePath.lastIndexOf('/'));
  if (directory && !fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function loadPairingState(): PairingState | null {
  try {
    if (!fs.existsSync(PAIRING_STATE_PATH)) {
      return null;
    }

    const raw = fs.readFileSync(PAIRING_STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PairingState;
    if (!parsed?.codeHash || !parsed?.expiresAt || !parsed?.createdAt) {
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      clearPairingState();
      return null;
    }

    return parsed;
  } catch (error) {
    logger.warn('Failed to load pairing state', error);
    return null;
  }
}

function savePairingState(state: PairingState): void {
  ensureStateDirectory(PAIRING_STATE_PATH);
  fs.writeFileSync(PAIRING_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function clearPairingState(): void {
  try {
    if (fs.existsSync(PAIRING_STATE_PATH)) {
      fs.unlinkSync(PAIRING_STATE_PATH);
    }
  } catch (error) {
    logger.warn('Failed to clear pairing state', error);
  }
}

function issuePairingCode(): { pairingCode: string; expiresAt: string } {
  const pairingCode = createPairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();

  savePairingState({
    codeHash: hashPairingCode(pairingCode),
    expiresAt,
    createdAt: new Date().toISOString()
  });

  return { pairingCode, expiresAt };
}

// GET /api/agent/pairing-code - Generate short-lived pairing code for current installation
router.get('/pairing-code', authenticate, async (_req: Request, res: Response) => {
  const { pairingCode, expiresAt } = issuePairingCode();
  return res.json({ pairingCode, expiresAt });
});

// POST /api/agent/pair - Pair a new Raspberry Pi device
router.post('/pair', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { pairingCode } = req.body;

    if (!pairingCode) {
      return res.status(400).json({ error: 'Párovací kód je povinný' });
    }

    const pairingState = loadPairingState();
    if (!pairingState) {
      return res.status(410).json({ error: 'Párovací kód chybí nebo vypršel. Vygenerujte nový v portálu.' });
    }

    if (hashPairingCode(String(pairingCode)) !== pairingState.codeHash) {
      return res.status(400).json({ error: 'Neplatný párovací kód' });
    }

    const deviceId = uuidv4();
    const deviceToken = jwt.sign(
      {
        deviceId,
        siteId: 'demo-site'
      },
      getJwtSecret(),
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
      status: 'connecting' as const
    };

    pairedDevices.set(deviceId, device);
  clearPairingState();
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
router.get('/status', authenticate, async (req: Request, res: Response) => {
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
router.post('/unpair', authenticate, async (req: Request, res: Response) => {
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
router.post('/push', authenticateDevice, async (req: AuthRequest, res: Response) => {
  try {
    const { timestamp, metrics } = req.body;

    if (!timestamp || !metrics) {
      return res.status(400).json({ error: 'Chybí povinná pole' });
    }

    if (req.device?.id && !pairedDevices.has(req.device.id)) {
      pairedDevices.set(req.device.id, {
        deviceId: req.device.id,
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
router.get('/config', authenticate, async (req: Request, res: Response) => {
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
router.post('/ping', authenticateDevice, async (req: Request, res: Response) => {
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
