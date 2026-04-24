import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const router = Router();

interface AuthState {
  accessCodeHash: string;
  createdAt: string;
}

interface SessionUser {
  userId: string;
  email?: string;
  fullName?: string;
  role: 'customer' | 'admin';
  iat: number;
}

const AUTH_STATE_PATH = process.env.AUTH_STATE_FILE || '/data/auth-state.json';
const CODE_SALT = process.env.AUTH_CODE_SALT || 'solar-portal-access-code-salt';
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

let failedAttempts = 0;
let lastAttemptAt: number | null = null;

function hashCode(accessCode: string): string {
  return crypto
    .pbkdf2Sync(accessCode, CODE_SALT, 100000, 64, 'sha256')
    .toString('hex');
}

function normalizeCode(code: string): string {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function createAccessCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function ensureStateDirectory(): void {
  const directory = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function loadAuthState(): AuthState | null {
  try {
    if (!fs.existsSync(AUTH_STATE_PATH)) {
      return null;
    }

    const raw = fs.readFileSync(AUTH_STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.accessCodeHash) {
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error('Failed to load auth state:', error);
    return null;
  }
}

function saveAuthState(state: AuthState): void {
  ensureStateDirectory();
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function isLocked(): boolean {
  if (!lastAttemptAt) {
    return false;
  }

  const elapsed = Date.now() - lastAttemptAt;
  if (elapsed > ATTEMPT_WINDOW_MS) {
    failedAttempts = 0;
    lastAttemptAt = null;
    return false;
  }

  return failedAttempts >= MAX_ATTEMPTS;
}

function getRemainingAttempts(): number {
  if (!lastAttemptAt) {
    return MAX_ATTEMPTS;
  }

  const elapsed = Date.now() - lastAttemptAt;
  if (elapsed > ATTEMPT_WINDOW_MS) {
    failedAttempts = 0;
    lastAttemptAt = null;
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - failedAttempts);
}

function recordAttempt(valid: boolean): void {
  if (valid) {
    failedAttempts = 0;
    lastAttemptAt = null;
    return;
  }

  failedAttempts += 1;
  lastAttemptAt = Date.now();
}

function encodeSessionToken(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

function decodeSessionToken(token: string): SessionUser | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as SessionUser;
    if (!user.userId || !user.role) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

router.get('/registration-status', async (_req: Request, res: Response) => {
  const state = loadAuthState();
  return res.json({
    canRegister: !state,
    hasAccessCode: Boolean(state),
    usersCount: state ? 1 : 0
  });
});

/**
 * GET /api/auth/password-info
 * Returns information about the installation password
 * This endpoint exists to clearly communicate that password is NOT resettable
 */
router.get('/password-info', async (_req: Request, res: Response) => {
  const state = loadAuthState();
  return res.json({
    hasAccessCode: Boolean(state),
    message: 'Přístupový kód se generuje jen jednou při prvním spuštění a poté je trvalý.',
    warning: 'Pokud kód ztratíte, nebude možné se přihlásit.'
  });
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const existingState = loadAuthState();
    if (existingState) {
      return res.status(409).json({
        error: 'Přístupový kód už je vytvořen. Použijte přihlášení.'
      });
    }

    const accessCode = createAccessCode();
    saveAuthState({
      accessCodeHash: hashCode(accessCode),
      createdAt: new Date().toISOString()
    });

    logger.info('Installation access code generated');
    return res.status(201).json({
      message: 'Přístupový kód byl vygenerován',
      accessCode,
      warning: 'Kód se zobrazí pouze jednou. Uložte ho na bezpečné místo.'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Generování kódu selhalo' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { accessCode, rememberMe } = req.body;
    const state = loadAuthState();

    if (!state) {
      return res.status(400).json({ error: 'Přístupový kód ještě nebyl vygenerován.' });
    }

    if (!accessCode) {
      return res.status(400).json({ error: 'Přístupový kód je povinný' });
    }

    if (isLocked()) {
      return res.status(429).json({
        error: 'Příliš mnoho pokusů. Zkuste znovu za 15 minut.',
        attemptsRemaining: 0
      });
    }

    const isValid = hashCode(normalizeCode(accessCode)) === state.accessCodeHash;
    recordAttempt(isValid);

    if (!isValid) {
      const remaining = getRemainingAttempts();
      return res.status(401).json({
        error: 'Neplatný přístupový kód',
        attemptsRemaining: remaining
      });
    }

    const user: SessionUser = {
      userId: 'local-installation-user',
      fullName: 'Instalace',
      role: 'customer',
      iat: Math.floor(Date.now() / 1000)
    };
    const token = encodeSessionToken(user);

    const maxAge = rememberMe ? 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    // Use actual HTTPS detection – not NODE_ENV – because HA addons run over HTTP
    // even in production. Forcing secure:true over HTTP causes browsers to silently
    // drop the cookie on every subsequent request, making all auth endpoints fail.
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge
    });

    logger.info('User logged in with access code');

    return res.json({
      message: 'Přihlášení úspěšné',
      user: {
        id: user.userId,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Přihlášení selhalo' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: 'Nejste přihlášen' });
  }

  const user = decodeSessionToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Neplatná session' });
  }

  return res.json({
    user: {
      id: user.userId,
      role: user.role,
      fullName: user.fullName
    }
  });
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Clear authentication cookies
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' });
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    logger.info('User logged out');
    return res.json({ message: 'Odhlášení úspěšné' });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({ error: 'Odhlášení selhalo' });
  }
});

export default router;
