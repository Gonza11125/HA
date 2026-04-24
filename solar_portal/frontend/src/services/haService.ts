import { apiClient } from '../utils/api'

export type HAEntityDomain = 'automation' | 'climate' | 'scene' | 'script' | 'switch'
export type HACommandStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface HAEntityView {
  entityId: string
  domain: HAEntityDomain
  friendlyName: string
  state: string
  attributes: Record<string, unknown>
  lastChanged: string
  lastUpdated: string
  availableActions: string[]
  isControllable: boolean
}

export interface HACommand {
  id: string
  siteId: string
  deviceId: string
  entityId: string
  domain: HAEntityDomain
  action: string
  payload: Record<string, unknown>
  requestedByUserId: string
  status: HACommandStatus
  createdAt: string
  updatedAt: string
  executedAt: string | null
  error: string | null
  resultMessage: string | null
}

export const haService = {
  async getEntities(domains: HAEntityDomain[]): Promise<HAEntityView[]> {
    const { data } = await apiClient.get<{ data: HAEntityView[] }>('/ha/entities', {
      params: { domains: domains.join(',') },
    })
    return data.data || []
  },

  async createCommand(input: {
    deviceId: string
    entityId: string
    action: string
    payload?: Record<string, unknown>
  }): Promise<HACommand> {
    const { data } = await apiClient.post<{ data: HACommand }>('/ha/commands', input)
    return data.data
  },

  async getCommand(commandId: string): Promise<HACommand> {
    const { data } = await apiClient.get<{ data: HACommand }>(`/ha/commands/${commandId}`)
    return data.data
  },
}

export default haService