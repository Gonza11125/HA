import { Router, Request, Response } from 'express';
import { getJwtSecret } from '../config/runtime';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, authenticateDevice, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { updateLiveDataFromAgent } from '../services/liveDataStore';
import { consumePairingCode, issuePairingCode } from '../services/pairingCodeStore';
import fs from 'fs';

const router = Router();
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

interface PairedDevice {
  deviceId: string;
  siteId: string;
  deviceToken?: string;
  pairingCode?: string;
  pairedAt: string;
  lastSyncAt?: string | null;
  status: 'connecting' | 'connected';
}

const pairedDevices = new Map<string, PairedDevice>();

function parseSiteId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveSiteIdForUser(req: AuthRequest, requestedSiteId: unknown): { siteId?: string; status?: number; error?: string } {
  if (!req.user) {
    return { status: 401, error: 'Nejste přihlášen' };
  }

  const requested = parseSiteId(requestedSiteId);
  if (req.user.role === 'admin') {
    if (!requested) {
      return { status: 400, error: 'siteId je pro admina povinné' };
    }

    return { siteId: requested };
  }

  if (!req.user.siteId) {
    return { status: 403, error: 'Uživatel nemá přiřazený siteId' };
  }

  if (requested && requested !== req.user.siteId) {
    return { status: 403, error: 'Nemáte přístup k jiné lokalitě' };
  }

  return { siteId: req.user.siteId };
}

function listPairedDevices(siteId?: string): PairedDevice[] {
  const devices = Array.from(pairedDevices.values());
  if (!siteId) {
    return devices;
  }

  return devices.filter((device) => device.siteId === siteId);
}

function buildStatusResponse(siteId?: string) {
  const devices = listPairedDevices(siteId);
  const latestDevice = devices[0];

  return {
    isPaired: devices.length > 0,
    deviceId: latestDevice?.deviceId,
    siteId: siteId || latestDevice?.siteId,
    devices: devices.map((device) => ({
      deviceId: device.deviceId,
      siteId: device.siteId,
      pairedAt: device.pairedAt,
      lastSyncAt: device.lastSyncAt || null,
      status: device.status
    })),
    haUrl: 'http://192.168.1.100:8123 (hidden)',
    lastDataSync: latestDevice?.lastSyncAt || null,
    connectionStatus: devices.some((device) => device.status === 'connected') ? 'connected' : 'disconnected'
  };
}

router.get('/pairing-code', authenticate, async (req: AuthRequest, res: Response) => {
  const resolvedSite = resolveSiteIdForUser(req, req.query.siteId);
  if (resolvedSite.status) {
    return res.status(resolvedSite.status).json({ error: resolvedSite.error });
  }

  const { pairingCode, expiresAt, siteId } = issuePairingCode(resolvedSite.siteId!);
  return res.json({ pairingCode, expiresAt, siteId });
});

router.post('/pair', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { pairingCode } = req.body;

    if (!pairingCode) {
      return res.status(400).json({ error: 'Párovací kód je povinný' });
    }

    const pairingState = consumePairingCode(String(pairingCode));
    if (!pairingState) {
      return res.status(410).json({ error: 'Párovací kód je neplatný nebo vypršel. Vygenerujte nový v portálu.' });
    }

    const deviceId = uuidv4();
    const deviceToken = jwt.sign(
      {
        deviceId,
        siteId: pairingState.siteId
      },
      getJwtSecret(),
      {
        expiresIn: '365d'
      }
    );

    const device: PairedDevice = {
      deviceId,
      siteId: pairingState.siteId,
      deviceToken,
      pairingCode: pairingState.pairingCode,
      pairedAt: new Date().toISOString(),
      lastSyncAt: null,
      status: 'connecting'
    };

    pairedDevices.set(deviceId, device);
    logger.info(`Device paired: ${deviceId}`, { siteId: pairingState.siteId });

    return res.status(201).json({
      deviceId,
      deviceToken,
      pairedAt: device.pairedAt,
      siteId: device.siteId
    });
  } catch (error) {
    logger.error('Device pairing error:', error);
    return res.status(500).json({ error: 'Párování selhalo' });
  }
});

router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'admin' && !parseSiteId(req.query.siteId)) {
      const sites = Array.from(new Set(Array.from(pairedDevices.values()).map((device) => device.siteId)));
      return res.json({
        sites: sites.reduce<Record<string, ReturnType<typeof buildStatusResponse>>>((accumulator, siteId) => {
          accumulator[siteId] = buildStatusResponse(siteId);
          return accumulator;
        }, {})
      });
    }

    const resolvedSite = resolveSiteIdForUser(req, req.query.siteId);
    if (resolvedSite.status) {
      return res.status(resolvedSite.status).json({ error: resolvedSite.error });
    }

    return res.json(buildStatusResponse(resolvedSite.siteId));
  } catch (error) {
    logger.error('Get device status error:', error);
    return res.status(500).json({ error: 'Nepodařilo se získat stav zařízení' });
  }
});

router.post('/unpair', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId je povinné' });
    }

    const device = pairedDevices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Zařízení nebylo nalezeno' });
    }

    const resolvedSite = resolveSiteIdForUser(req, device.siteId);
    if (resolvedSite.status) {
      return res.status(resolvedSite.status).json({ error: resolvedSite.error });
    }

    pairedDevices.delete(deviceId);
    logger.info(`Device unpaired: ${deviceId}`, { siteId: device.siteId });

    return res.json({ message: 'Zařízení bylo úspěšně odpárováno' });
  } catch (error) {
    logger.error('Device unpairing error:', error);
    return res.status(500).json({ error: 'Nepodařilo se odpárovat zařízení' });
  }
});

router.post('/push', authenticateDevice, async (req: AuthRequest, res: Response) => {
  try {
    const { timestamp, metrics } = req.body;

    if (!timestamp || !metrics) {
      return res.status(400).json({ error: 'Chybí povinná pole' });
    }

    if (!req.device?.id || !req.device.siteId) {
      return res.status(401).json({ error: 'Neplatný token zařízení' });
    }

    const existingDevice = pairedDevices.get(req.device.id);
    pairedDevices.set(req.device.id, {
      deviceId: req.device.id,
      siteId: req.device.siteId,
      deviceToken: existingDevice?.deviceToken,
      pairingCode: existingDevice?.pairingCode,
      pairedAt: existingDevice?.pairedAt || new Date().toISOString(),
      lastSyncAt: timestamp,
      status: 'connected'
    });

    logger.info('Data received from agent:', { siteId: req.device.siteId, deviceId: req.device.id, timestamp, metrics });
    updateLiveDataFromAgent({
      siteId: req.device.siteId,
      deviceId: req.device.id,
      timestamp,
      metrics
    });
    return res.json({ message: 'Data byla úspěšně přijata' });
  } catch (error) {
    logger.error('Agent push error:', error);
    return res.status(500).json({ error: 'Zpracování dat selhalo' });
  }
});

router.get('/config', authenticate, async (_req: Request, res: Response) => {
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

router.post('/ping', authenticateDevice, async (_req: Request, res: Response) => {
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
