import axios, { AxiosInstance } from 'axios'
import { Logger } from './logger'

const logger = new Logger()

export interface HAEntityState {
  entity_id: string
  state: string
  attributes: Record<string, any>
  last_changed: string
  last_updated: string
}

export interface HAStates {
  [key: string]: HAEntityState
}

export class HAClient {
  private client: AxiosInstance
  private haUrl: string
  private readonly token: string

  constructor(haUrl: string, token: string) {
    this.haUrl = haUrl
    this.token = token
    this.client = axios.create({
      baseURL: this.haUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
  }

  private formatAxiosError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'unknown'
      const statusText = error.response?.statusText ?? 'Unknown error'
      return `status=${status}, message=${statusText}`
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'Unknown error'
  }

  async getState(entityId: string): Promise<HAEntityState | null> {
    try {
      const response = await this.client.get<HAEntityState>(`/api/states/${entityId}`)
      return response.data
    } catch (error) {
      logger.error(`Failed to get state for entity ${entityId}: ${this.formatAxiosError(error)}`)
      return null
    }
  }

  async getAllStates(): Promise<HAStates | null> {
    try {
      const response = await this.client.get<HAEntityState[]>('/api/states')
      const states: HAStates = {}
      response.data.forEach((state: HAEntityState) => {
        states[state.entity_id] = state
      })
      return states
    } catch (error) {
      logger.error(`Failed to get all states: ${this.formatAxiosError(error)}`)
      return null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/')
      return response.status === 200
    } catch (error) {
      logger.error(`Failed to connect to Home Assistant: ${this.formatAxiosError(error)}`)
      return false
    }
  }

  async callService(domain: string, service: string, data?: Record<string, any>): Promise<boolean> {
    try {
      await this.client.post(`/api/services/${domain}/${service}`, data || {})
      return true
    } catch (error) {
      logger.error(`Failed to call service ${domain}.${service}: ${this.formatAxiosError(error)}`)
      return false
    }
  }
}
