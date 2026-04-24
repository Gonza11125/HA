import axios, { AxiosInstance } from 'axios'
import { Logger } from './logger'

const logger = new Logger()

export interface DataPayload {
  timestamp: string
  metrics: Record<string, number | string>
  health?: {
    lastDataAge: number
    agentHealth: string
  }
}

export interface HAEntitySyncItem {
  entityId: string
  domain: 'automation' | 'climate' | 'scene' | 'script' | 'switch'
  friendlyName: string
  state: string
  attributes: Record<string, unknown>
  lastChanged: string
  lastUpdated: string
}

export interface PendingHACommand {
  id: string
  entityId: string
  domain: 'automation' | 'climate' | 'scene' | 'script' | 'switch'
  action: string
  payload: Record<string, unknown>
}

export interface HACommandExecutionResult {
  ok: boolean
  message?: string
  updatedEntityState?: Partial<HAEntitySyncItem>
}

export class CloudClient {
  private client: AxiosInstance
  private cloudUrl: string
  private deviceToken: string

  constructor(cloudUrl: string, deviceToken: string) {
    this.cloudUrl = cloudUrl
    this.deviceToken = deviceToken
    this.client = axios.create({
      baseURL: this.cloudUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': deviceToken
      },
      timeout: 15000
    })
  }

  async pair(pairingCode: string): Promise<string | null> {
    try {
      const response = await this.client.post('/agent/pair', { pairingCode })
      const token = response.data.deviceToken
      logger.info('Device paired successfully')
      return token
    } catch (error) {
      logger.error('Failed to pair device:', error)
      return null
    }
  }

  async pushData(data: DataPayload): Promise<boolean> {
    try {
      await this.client.post('/agent/push', data)
      logger.debug('Data pushed successfully')
      return true
    } catch (error) {
      logger.error('Failed to push data:', error)
      return false
    }
  }

  async getConfig(): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get('/agent/config')
      logger.info('Configuration fetched successfully')
      return response.data.config
    } catch (error) {
      logger.error('Failed to get config:', error)
      return null
    }
  }

  async syncEntities(entities: HAEntitySyncItem[]): Promise<boolean> {
    try {
      await this.client.post('/agent/entities/sync', { entities })
      return true
    } catch (error) {
      logger.error('Failed to sync HA entities:', error)
      return false
    }
  }

  async getPendingCommands(): Promise<PendingHACommand[]> {
    try {
      const response = await this.client.get<{ data?: PendingHACommand[] }>('/agent/commands/pending')
      return Array.isArray(response.data?.data) ? response.data.data : []
    } catch (error) {
      logger.error('Failed to load pending HA commands:', error)
      return []
    }
  }

  async submitCommandResult(commandId: string, result: HACommandExecutionResult): Promise<boolean> {
    try {
      await this.client.post(`/agent/commands/${commandId}/result`, result)
      return true
    } catch (error) {
      logger.error(`Failed to submit HA command result (${commandId}):`, error)
      return false
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.post('/agent/ping', {})
      return response.status === 200
    } catch (error) {
      logger.error('Ping failed:', error)
      return false
    }
  }

  setDeviceToken(token: string): void {
    this.deviceToken = token
    this.client.defaults.headers['X-Device-Token'] = token
  }
}
