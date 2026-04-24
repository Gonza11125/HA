import { v4 as uuidv4 } from 'uuid';

export type HAEntityDomain = 'automation' | 'climate' | 'scene' | 'script' | 'switch';
export type HACommandStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface HAEntityView {
  entityId: string;
  domain: HAEntityDomain;
  friendlyName: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: string;
  lastUpdated: string;
  availableActions: string[];
  isControllable: boolean;
}

export interface HACommand {
  id: string;
  siteId: string;
  deviceId: string;
  entityId: string;
  domain: HAEntityDomain;
  action: string;
  payload: Record<string, unknown>;
  requestedByUserId: string;
  status: HACommandStatus;
  createdAt: string;
  updatedAt: string;
  executedAt: string | null;
  error: string | null;
  resultMessage: string | null;
}

export interface AgentEntitySyncPayload {
  siteId: string;
  deviceId: string;
  entities: HAEntityView[];
}

export interface HACommandResult {
  ok: boolean;
  message?: string;
  updatedEntityState?: Partial<HAEntityView>;
}

const ENTITY_ACTIONS: Record<HAEntityDomain, string[]> = {
  automation: ['turn_on', 'turn_off', 'trigger'],
  climate: ['set_temperature'],
  scene: ['activate'],
  script: ['run'],
  switch: ['turn_on', 'turn_off'],
};

const entitySnapshots = new Map<string, Map<string, HAEntityView>>();
const commands = new Map<string, HACommand>();

function buildEntityStorageKey(siteId: string, deviceId: string): string {
  return `${siteId}:${deviceId}`;
}

function getDomainFromEntityId(entityId: string): HAEntityDomain | null {
  const [rawDomain] = entityId.split('.');
  if (rawDomain === 'automation' || rawDomain === 'climate' || rawDomain === 'scene' || rawDomain === 'script' || rawDomain === 'switch') {
    return rawDomain;
  }

  return null;
}

function normalizeEntity(entity: HAEntityView): HAEntityView {
  const domain = getDomainFromEntityId(entity.entityId) ?? entity.domain;
  const availableActions = ENTITY_ACTIONS[domain] || [];

  return {
    entityId: entity.entityId,
    domain,
    friendlyName: entity.friendlyName,
    state: entity.state,
    attributes: entity.attributes || {},
    lastChanged: entity.lastChanged,
    lastUpdated: entity.lastUpdated,
    availableActions,
    isControllable: availableActions.length > 0,
  };
}

export function syncHAEntities(payload: AgentEntitySyncPayload): number {
  const storageKey = buildEntityStorageKey(payload.siteId, payload.deviceId);
  const siteEntities = new Map<string, HAEntityView>();

  payload.entities.forEach((entity) => {
    const normalized = normalizeEntity(entity);
    siteEntities.set(normalized.entityId, normalized);
  });

  entitySnapshots.set(storageKey, siteEntities);
  return siteEntities.size;
}

export function getHAEntities(options: { siteId: string; domains?: string[]; deviceId?: string }): HAEntityView[] {
  const requestedDomains = new Set((options.domains || []).filter(Boolean));
  const matches: HAEntityView[] = [];

  entitySnapshots.forEach((entities, storageKey) => {
    const [siteId, deviceId] = storageKey.split(':');
    if (siteId !== options.siteId) {
      return;
    }

    if (options.deviceId && deviceId !== options.deviceId) {
      return;
    }

    entities.forEach((entity) => {
      if (requestedDomains.size > 0 && !requestedDomains.has(entity.domain)) {
        return;
      }

      matches.push(entity);
    });
  });

  return matches.sort((left, right) => left.friendlyName.localeCompare(right.friendlyName, 'cs'));
}

export function getHAEntityById(siteId: string, entityId: string): HAEntityView | null {
  for (const [storageKey, entities] of entitySnapshots.entries()) {
    const [storedSiteId] = storageKey.split(':');
    if (storedSiteId !== siteId) {
      continue;
    }

    const entity = entities.get(entityId);
    if (entity) {
      return entity;
    }
  }

  return null;
}

export function createHACommand(input: {
  siteId: string;
  deviceId: string;
  entityId: string;
  action: string;
  payload?: Record<string, unknown>;
  requestedByUserId: string;
}): HACommand {
  const entity = getHAEntityById(input.siteId, input.entityId);
  if (!entity) {
    throw new Error('Entity not found');
  }

  if (!entity.availableActions.includes(input.action)) {
    throw new Error('Action is not allowed for entity domain');
  }

  const now = new Date().toISOString();
  const command: HACommand = {
    id: uuidv4(),
    siteId: input.siteId,
    deviceId: input.deviceId,
    entityId: input.entityId,
    domain: entity.domain,
    action: input.action,
    payload: input.payload || {},
    requestedByUserId: input.requestedByUserId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    executedAt: null,
    error: null,
    resultMessage: null,
  };

  commands.set(command.id, command);
  return command;
}

export function getHACommand(commandId: string): HACommand | null {
  return commands.get(commandId) || null;
}

export function claimPendingCommands(siteId: string, deviceId: string, limit = 10): HACommand[] {
  const claimed: HACommand[] = [];

  for (const command of commands.values()) {
    if (claimed.length >= limit) {
      break;
    }

    if (command.siteId !== siteId || command.deviceId !== deviceId || command.status !== 'pending') {
      continue;
    }

    command.status = 'running';
    command.updatedAt = new Date().toISOString();
    claimed.push({ ...command });
  }

  return claimed;
}

export function completeHACommand(commandId: string, result: HACommandResult): HACommand | null {
  const command = commands.get(commandId);
  if (!command) {
    return null;
  }

  const now = new Date().toISOString();
  command.status = result.ok ? 'completed' : 'failed';
  command.updatedAt = now;
  command.executedAt = now;
  command.error = result.ok ? null : result.message || 'Unknown execution error';
  command.resultMessage = result.message || null;

  if (result.updatedEntityState) {
    const entity = getHAEntityById(command.siteId, command.entityId);
    if (entity) {
      const mergedEntity = normalizeEntity({
        ...entity,
        ...result.updatedEntityState,
        entityId: entity.entityId,
        domain: entity.domain,
        attributes: {
          ...entity.attributes,
          ...(result.updatedEntityState.attributes || {}),
        },
        lastUpdated: result.updatedEntityState.lastUpdated || now,
        lastChanged: result.updatedEntityState.lastChanged || entity.lastChanged,
      });

      entitySnapshots.forEach((entities, storageKey) => {
        const [siteId] = storageKey.split(':');
        if (siteId === command.siteId && entities.has(command.entityId)) {
          entities.set(command.entityId, mergedEntity);
        }
      });
    }
  }

  return { ...command };
}