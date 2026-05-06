import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getCookieDomain, getCookieSameSite, getSessionSecret, shouldUseSecureCookies } from '../config/runtime';
import { authRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { createSiteAccessCode, findSiteAccessByCode, listSiteAccessCodes } from '../services/siteAccessStore';

const router = Router();

interface SessionUser {
  userId: string;
  fullName?: string;
  siteId?: string;
  role: 'customer' | 'admin';
  iat: number;
  exp?: number;
}

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

let failedAttempts = 0;
let lastAttemptAt: number | null = null;

function normalizeCode(code: string): string {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
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

function encodeSessionToken(user: SessionUser, rememberMe: boolean): string {
  return jwt.sign(user, getSessionSecret(), {
    expiresIn: rememberMe ? '24h' : '12h'
  });
}

function decodeSessionToken(token: string): SessionUser | null {
  try {
    const parsed = jwt.verify(token, getSessionSecret());
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const user = parsed as SessionUser;
    if (!user.userId || !user.role) {
      return null;
    }

    if (user.siteId !== undefined && typeof user.siteId !== 'string') {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function getSessionCookieOptions() {
  const cookieDomain = getCookieDomain();

  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: getCookieSameSite() as 'lax' | 'strict' | 'none',
    ...(cookieDomain ? { domain: cookieDomain } : {})
  };
}

router.get('/registration-status', async (_req: Request, res: Response) => {
  const accessCodes = listSiteAccessCodes();
  return res.json({
    canRegister: accessCodes.length === 0,
    hasAccessCode: accessCodes.length > 0,
    usersCount: accessCodes.length
  });
});

router.get('/password-info', async (_req: Request, res: Response) => {
  const accessCodes = listSiteAccessCodes();
  return res.json({
    hasAccessCode: accessCodes.length > 0,
    message: 'Přístupový kód se generuje jen jednou při prvním spuštění a poté je trvalý.',
    warning: 'Pokud kód ztratíte, nebude možné se přihlásit.'
  });
});

router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const existingCodes = listSiteAccessCodes();
    if (existingCodes.length > 0) {
      return res.status(409).json({
        error: 'Přístupový kód už je vytvořen. Použijte přihlášení.'
      });
    }

    const siteId = typeof req.body?.siteId === 'string' && req.body.siteId.trim() ? req.body.siteId.trim() : undefined;
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Administrator';
    const role = req.body?.role === 'customer' ? 'customer' : 'admin';

    if (role === 'customer' && !siteId) {
      return res.status(400).json({ error: 'Customer access code musí mít siteId' });
    }

    const createdAccessCode = createSiteAccessCode({
      siteId,
      name,
      role
    });

    logger.info('Installation access code generated', { role: createdAccessCode.role, siteId: createdAccessCode.siteId });
    return res.status(201).json({
      message: 'Přístupový kód byl vygenerován',
      accessCode: createdAccessCode.accessCode,
      siteId: createdAccessCode.siteId,
      role: createdAccessCode.role,
      warning: 'Kód se zobrazí pouze jednou. Uložte ho na bezpečné místo.'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Generování kódu selhalo' });
  }
});

router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { accessCode, rememberMe } = req.body;
    const existingCodes = listSiteAccessCodes();

    if (existingCodes.length === 0) {
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

    const accessEntry = findSiteAccessByCode(normalizeCode(accessCode));
    recordAttempt(Boolean(accessEntry));

    if (!accessEntry) {
      const remaining = getRemainingAttempts();
      return res.status(401).json({
        error: 'Neplatný přístupový kód',
        attemptsRemaining: remaining
      });
    }

    if (accessEntry.role === 'customer' && !accessEntry.siteId) {
      logger.error('Access code is missing siteId', { accessCode: accessEntry.accessCode });
      return res.status(500).json({ error: 'Přístupový kód není správně nakonfigurovaný' });
    }

    const user: SessionUser = {
      userId: accessEntry.role === 'admin' ? 'admin' : 'customer',
      fullName: accessEntry.name,
      siteId: accessEntry.siteId,
      role: accessEntry.role,
      iat: Math.floor(Date.now() / 1000)
    };
    const token = encodeSessionToken(user, Boolean(rememberMe));
    const cookieOptions = getSessionCookieOptions();

    const maxAge = rememberMe ? 24 * 60 * 60 * 1000 : undefined;
    res.cookie('accessToken', token, {
      ...cookieOptions,
      maxAge
    });

    logger.info('User logged in with access code', { role: user.role, siteId: user.siteId });
    return res.json({
      message: 'Přihlášení úspěšné',
      user: {
        id: user.userId,
        role: user.role,
        fullName: user.fullName,
        siteId: user.siteId
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
      fullName: user.fullName,
      siteId: user.siteId
    }
  });
});

router.post('/logout', async (_req: Request, res: Response) => {
  try {
    const cookieOptions = getSessionCookieOptions();
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    logger.info('User logged out');
    return res.json({ message: 'Odhlášení úspěšné' });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({ error: 'Odhlášení selhalo' });
  }
});

export default router;
