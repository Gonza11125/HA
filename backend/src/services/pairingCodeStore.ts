import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface PairingCodeEntry {
  codeHash: string;
  siteId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PairingCodeMatch extends PairingCodeEntry {
  pairingCode: string;
}

type PairingCodeStore = Record<string, PairingCodeEntry>;

const PAIRING_STATE_PATH = process.env.PAIRING_STATE_FILE || '/data/pairing-state.json';
const PAIRING_CODE_TTL_MS = parseInt(process.env.PAIRING_CODE_TTL_MS || '600000', 10);
const PAIRING_CODE_SALT = process.env.PAIRING_CODE_SALT || 'solar-portal-pairing-salt';

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

function ensureStateDirectory(): void {
  const directory = path.dirname(PAIRING_STATE_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function sanitizeStore(store: PairingCodeStore): { store: PairingCodeStore; changed: boolean } {
  let changed = false;
  const sanitized = Object.entries(store).reduce<PairingCodeStore>((accumulator, [pairingCode, entry]) => {
    if (!entry || typeof entry !== 'object') {
      changed = true;
      return accumulator;
    }

    const normalizedCode = normalizePairingCode(pairingCode);
    const isExpired = typeof entry.expiresAt !== 'string' || Date.parse(entry.expiresAt) <= Date.now();
    const isInvalid = !normalizedCode || typeof entry.codeHash !== 'string' || typeof entry.siteId !== 'string';

    if (isExpired || isInvalid) {
      changed = true;
      return accumulator;
    }

    accumulator[normalizedCode] = {
      codeHash: entry.codeHash,
      siteId: entry.siteId.trim(),
      expiresAt: entry.expiresAt,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString()
    };

    if (normalizedCode !== pairingCode) {
      changed = true;
    }

    return accumulator;
  }, {});

  return { store: sanitized, changed };
}

function readStore(): PairingCodeStore {
  try {
    if (!fs.existsSync(PAIRING_STATE_PATH)) {
      return {};
    }

    const raw = fs.readFileSync(PAIRING_STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PairingCodeStore;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const { store, changed } = sanitizeStore(parsed);
    if (changed) {
      writeStore(store);
    }

    return store;
  } catch {
    return {};
  }
}

function writeStore(store: PairingCodeStore): void {
  ensureStateDirectory();
  fs.writeFileSync(PAIRING_STATE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function issuePairingCode(siteId: string): { pairingCode: string; expiresAt: string; siteId: string } {
  const normalizedSiteId = siteId.trim();
  const store = readStore();
  let pairingCode = createPairingCode();

  while (store[pairingCode]) {
    pairingCode = createPairingCode();
  }

  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();

  store[pairingCode] = {
    codeHash: hashPairingCode(pairingCode),
    siteId: normalizedSiteId,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  writeStore(store);

  return {
    pairingCode,
    expiresAt,
    siteId: normalizedSiteId
  };
}

export function consumePairingCode(pairingCode: string): PairingCodeMatch | null {
  const normalizedCode = normalizePairingCode(pairingCode);
  if (!normalizedCode) {
    return null;
  }

  const store = readStore();
  const entry = store[normalizedCode];
  if (!entry || entry.codeHash !== hashPairingCode(normalizedCode)) {
    return null;
  }

  delete store[normalizedCode];
  writeStore(store);

  return {
    pairingCode: normalizedCode,
    ...entry
  };
}