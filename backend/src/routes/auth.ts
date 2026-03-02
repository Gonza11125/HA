import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  generatePasswordOnFirstRegistration,
  hasInstallationPassword,
  verifyPassword as verifyInstallationPassword,
  isPasswordLocked,
  getRemainingAttempts
} from '../services/passwordManager';

const router = Router();

// Mock user storage for development
const mockUsers = new Map<string, any>();

// Utility: Hash password with PBKDF2 (fallback to crypto if argon2 not available)
function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, 'solar-portal-salt', 100000, 64, 'sha256')
    .toString('hex');
}

function verifyUserPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Utility: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Utility: Validate password strength
function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

router.get('/registration-status', async (_req: Request, res: Response) => {
  return res.json({
    canRegister: true,
    usersCount: mockUsers.size,
    hasInstallationPassword: hasInstallationPassword()
  });
});

/**
 * GET /api/auth/password-info
 * Returns information about the installation password
 * This endpoint exists to clearly communicate that password is NOT resettable
 */
router.get('/password-info', async (_req: Request, res: Response) => {
  return res.json({
    hasInstallationPassword: hasInstallationPassword(),
    message: 'Instalační heslo se NEDÁ resetovat. Jedná se o záměrný design - heslo se musí pamatovat nebo zapsat do bezpečného místa. Na jednom Raspberry Pi existuje pouze JEDNO heslo.',
    warning: 'Pokud ztratíte instalační heslo, nebudete se moci přihlásit ani zaregistrovat nové uživatele. Heslo si zapište a uschováte!'
  });
});

// POST /api/auth/register
// CRITICAL: On first registration, password is generated and shown to user ONCE
// Subsequent registrations require the installation password (which cannot be reset)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, installationPassword } = req.body;
    const isFirstRegistration = mockUsers.size === 0;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Chybí povinná pole: email, heslo, jméno' });
    }

    // For first registration, no installation password required (will be generated)
    // For subsequent registrations, installation password is required
    if (!isFirstRegistration) {
      if (!installationPassword) {
        return res.status(400).json({ error: 'Instalační heslo je povinné' });
      }

      // Verify installation password
      if (!verifyInstallationPassword(installationPassword)) {
        const remaining = getRemainingAttempts();
        if (remaining === 0) {
          return res.status(429).json({ 
            error: 'Příliš mnoho pokusů. Zkuste znovu za 15 minut.',
            attemptsRemaining: 0
          });
        }
        return res.status(401).json({ 
          error: 'Nesprávné instalační heslo',
          attemptsRemaining: remaining - 1
        });
      }
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Neplatný formát e-mailu' });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Heslo musí mít alespoň 8 znaků' });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // If user already exists, update credentials (dev-friendly re-registration)
    const existingUser = mockUsers.get(email);
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        fullName,
        passwordHash,
        updatedAt: new Date().toISOString()
      };

      mockUsers.set(email, updatedUser);
      logger.info(`User re-registered (updated): ${email}`);

      return res.status(200).json({
        message: 'Účet byl aktualizován. Můžete se přihlásit novým heslem.',
        userId: updatedUser.id
      });
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      email,
      fullName,
      passwordHash,
      role: 'customer',
      emailVerified: true, // Auto-verify in development
      createdAt: new Date().toISOString()
    };

    mockUsers.set(email, newUser);
    logger.info(`User registered: ${email}`);

    // If first registration, generate installation password and return it
    // THIS IS THE ONLY TIME IT WILL BE SHOWN
    if (isFirstRegistration) {
      const generatedPassword = generatePasswordOnFirstRegistration();
      logger.info('Installation password generated on first registration - SINGLE PASSWORD FOR ENTIRE INSTALLATION');

      return res.status(201).json({
        message: 'Registrace úspěšná',
        userId: newUser.id,
        installationPassword: generatedPassword,
        isFirstRegistration: true,
        warning: 'DŮLEŽITÉ: Toto je vaše JEDINÉ instalační heslo. Nemůže se resetovat. Uložte si ho na bezpečné místo!'
      });
    }

    return res.status(201).json({
      message: 'Registrace úspěšná',
      userId: newUser.id
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Registrace selhala' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, installationPassword, rememberMe } = req.body;

    // Validate input
    if (!email || !password || !installationPassword) {
      return res.status(400).json({ error: 'E-mail, heslo a instalační heslo jsou povinné' });
    }

    // Verify installation password
    if (!verifyInstallationPassword(installationPassword)) {
      const remaining = getRemainingAttempts();
      if (remaining === 0) {
        return res.status(429).json({ 
          error: 'Příliš mnoho pokusů. Zkuste znovu za 15 minut.',
          attemptsRemaining: 0
        });
      }
      return res.status(401).json({ 
        error: 'Nesprávné instalační heslo',
        attemptsRemaining: remaining - 1
      });
    }

    // Find user
    const user = mockUsers.get(email);
    if (!user || !verifyUserPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Nesprávný e-mail nebo heslo' });
    }

    // Create JWT-like token with user info
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64');

    // Set cookie based on rememberMe flag
    const maxAge = rememberMe ? 24 * 60 * 60 * 1000 : undefined; // 24 hours if remembered, session if not
    
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge // undefined = session cookie
    });

    logger.info(`User logged in: ${email}`);

    return res.json({
      message: 'Přihlášení úspěšné',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Přihlášení selhalo' });
  }
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
