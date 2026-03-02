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
