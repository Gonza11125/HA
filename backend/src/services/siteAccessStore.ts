import fs from 'fs';
import path from 'path';

export type AccessRole = 'customer' | 'admin';

export interface SiteAccessCodeEntry {
  siteId?: string;
  name: string;
  role: AccessRole;
}

export interface SiteAccessCodeMatch extends SiteAccessCodeEntry {
  accessCode: string;
}

type SiteAccessCodeStore = Record<string, SiteAccessCodeEntry>;

const SITE_ACCESS_CODES_PATH = process.env.SITE_ACCESS_CODES_FILE || '/data/site-access-codes.json';

function normalizeAccessCode(value: string): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
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
  const directory = path.dirname(SITE_ACCESS_CODES_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function readStore(): SiteAccessCodeStore {
  try {
    if (!fs.existsSync(SITE_ACCESS_CODES_PATH)) {
      return {};
    }

    const raw = fs.readFileSync(SITE_ACCESS_CODES_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, SiteAccessCodeEntry>;

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.entries(parsed).reduce<SiteAccessCodeStore>((accumulator, [accessCode, entry]) => {
      if (!entry || typeof entry !== 'object') {
        return accumulator;
      }

      const normalizedCode = normalizeAccessCode(accessCode);
      if (!normalizedCode || typeof entry.name !== 'string' || (entry.role !== 'customer' && entry.role !== 'admin')) {
        return accumulator;
      }

      const siteId = typeof entry.siteId === 'string' && entry.siteId.trim() ? entry.siteId.trim() : undefined;

      accumulator[normalizedCode] = {
        name: entry.name,
        role: entry.role,
        ...(siteId ? { siteId } : {})
      };

      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function writeStore(store: SiteAccessCodeStore): void {
  ensureStateDirectory();
  fs.writeFileSync(SITE_ACCESS_CODES_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function listSiteAccessCodes(): SiteAccessCodeMatch[] {
  return Object.entries(readStore()).map(([accessCode, entry]) => ({
    accessCode,
    ...entry
  }));
}

export function findSiteAccessByCode(accessCode: string): SiteAccessCodeMatch | null {
  const normalizedCode = normalizeAccessCode(accessCode);
  if (!normalizedCode) {
    return null;
  }

  const entry = readStore()[normalizedCode];
  if (!entry) {
    return null;
  }

  return {
    accessCode: normalizedCode,
    ...entry
  };
}

export function createSiteAccessCode(input: SiteAccessCodeEntry & { accessCode?: string }): SiteAccessCodeMatch {
  const store = readStore();
  let accessCode = normalizeAccessCode(input.accessCode || '');

  while (!accessCode || store[accessCode]) {
    accessCode = createAccessCode();
  }

  store[accessCode] = {
    name: input.name,
    role: input.role,
    ...(input.siteId ? { siteId: input.siteId.trim() } : {})
  };

  writeStore(store);

  return {
    accessCode,
    ...store[accessCode]
  };
}

export function listAccessibleSites(role: AccessRole, siteId?: string): Array<{ siteId: string; name: string }> {
  const sites = new Map<string, string>();

  for (const entry of listSiteAccessCodes()) {
    if (!entry.siteId) {
      continue;
    }

    if (role !== 'admin' && entry.siteId !== siteId) {
      continue;
    }

    if (!sites.has(entry.siteId)) {
      sites.set(entry.siteId, entry.name);
    }
  }

  return Array.from(sites.entries()).map(([resolvedSiteId, name]) => ({
    siteId: resolvedSiteId,
    name
  }));
}