/**
 * Generated password storage for initial access
 * Password is generated on FIRST registration and shown once to user
 */

interface InstallationPassword {
  password: string;
  generatedAt: Date;
  attempts: number;
  lastAttemptAt?: Date;
}

// Memory store - in production would be database
const installationPasswords = new Map<string, InstallationPassword>();

const INSTALLATION_ID = 'primary'; // Single installation
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a random password: 20 characters of letters, numbers, and special chars
 */
export function generateRandomPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*_+-=';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill rest randomly
  for (let i = password.length; i < 20; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate installation password on first registration.
 * Returns the password to show to user ONE TIME.
 * 
 * CRITICAL: This function can be called ONLY ONCE per installation.
 * Once generated, the password CANNOT be reset or regenerated.
 * User MUST remember it - there is no recovery.
 */
export function generatePasswordOnFirstRegistration(): string {
  // Check if password already exists
  const existing = installationPasswords.get(INSTALLATION_ID);
  if (existing) {
    throw new Error('Instalační heslo již bylo vygenerováno a nelze jej resetovat. Jedná se o záměrný design - heslo se musí zapamatovat nebo zapsat.');
  }

  const password = generateRandomPassword();
  const pw: InstallationPassword = {
    password,
    generatedAt: new Date(),
    attempts: 0
  };
  installationPasswords.set(INSTALLATION_ID, pw);
  
  return password;
}

/**
 * Check if installation password has been created
 */
export function hasInstallationPassword(): boolean {
  return installationPasswords.has(INSTALLATION_ID);
}

/**
 * Verify provided password against stored one
 */
export function verifyPassword(providedPassword: string): boolean {
  const pw = installationPasswords.get(INSTALLATION_ID);
  
  if (!pw) {
    return false;
  }
  
  // Check attempt limits
  if (pw.lastAttemptAt) {
    const timeSinceLastAttempt = Date.now() - pw.lastAttemptAt.getTime();
    if (timeSinceLastAttempt > ATTEMPT_WINDOW_MS) {
      // Reset attempts after window expires
      pw.attempts = 0;
    }
  }
  
  if (pw.attempts >= MAX_ATTEMPTS) {
    return false;
  }
  
  pw.attempts++;
  pw.lastAttemptAt = new Date();
  
  return providedPassword === pw.password;
}

/**
 * Check if password has been locked due to too many attempts
 */
export function isPasswordLocked(): boolean {
  const pw = installationPasswords.get(INSTALLATION_ID);
  if (!pw) return false;
  
  if (pw.lastAttemptAt) {
    const timeSinceLastAttempt = Date.now() - pw.lastAttemptAt.getTime();
    if (timeSinceLastAttempt > ATTEMPT_WINDOW_MS) {
      pw.attempts = 0;
      return false;
    }
  }
  
  return pw.attempts >= MAX_ATTEMPTS;
}

/**
 * Get remaining attempts
 */
export function getRemainingAttempts(): number {
  const pw = installationPasswords.get(INSTALLATION_ID);
  if (!pw) return MAX_ATTEMPTS;
  
  if (pw.lastAttemptAt) {
    const timeSinceLastAttempt = Date.now() - pw.lastAttemptAt.getTime();
    if (timeSinceLastAttempt > ATTEMPT_WINDOW_MS) {
      pw.attempts = 0;
    }
  }
  
  return Math.max(0, MAX_ATTEMPTS - pw.attempts);
}
