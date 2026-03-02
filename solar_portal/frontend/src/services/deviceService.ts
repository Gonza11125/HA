import { apiClient } from '../utils/api'

export interface SolarData {
  timestamp: string
  power: number
  energy: number
  battery: number
  inverterStatus: 'online' | 'offline'
  lastUpdate: string
}

export interface PairingResponse {
  deviceId: string
  deviceToken: string
  pairingCode: string
}

export interface DeviceStatus {
  isPaired: boolean
  deviceId?: string
  haUrl?: string
  lastDataSync?: string
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}

/**
 * Device pairing service - handles pairing with Home Assistant
 */
export const deviceService = {
  /**
   * Pair a Raspberry Pi device with Home Assistant
   * Sends pairing code from the agent to establish connection
   */
  async pairDevice(pairingCode: string): Promise<PairingResponse> {
    const { data } = await apiClient.post<PairingResponse>('/agent/pair', {
      pairingCode
    })
    return data
  },

  /**
   * Get device pairing status
   * Returns whether a device is paired and connected
   */
  async getDeviceStatus(): Promise<DeviceStatus> {
    const { data } = await apiClient.get<DeviceStatus>('/agent/status')
    return data
  },

  /**
   * Get the pairing code from the agent
   * This code is generated on the Raspberry Pi
   */
  async generatePairingCode(): Promise<string> {
    const { data } = await apiClient.get<{ pairingCode: string }>('/agent/pairing-code')
    return data.pairingCode
  }
}

/**
 * Solar data service - fetches real-time data from Home Assistant
 * Data flows: Home Assistant → Raspberry Pi Agent → Cloud Backend → Frontend
 */
export const solarDataService = {
  /**
   * Get current real-time solar data from Home Assistant
   * This will be fetched through the paired agent
   */
  async getCurrentData(): Promise<SolarData> {
    const { data } = await apiClient.get<SolarData>('/data/current')
    return data
  },

  /**
   * Get historical data for charts
   * @param hours - Number of past hours to fetch (default 24)
   */
  async getHistoricalData(hours: number = 24): Promise<SolarData[]> {
    const { data } = await apiClient.get<SolarData[]>('/data/history', {
      params: { hours }
    })
    return data
  },

  /**
   * Setup polling for real-time updates
   * Calls the callback whenever new data is available
   */
  setupPolling(callback: (data: SolarData) => void, intervalMs: number = 5000) {
    return setInterval(async () => {
      try {
        const data = await this.getCurrentData()
        callback(data)
      } catch (error) {
        console.error('Failed to fetch solar data:', error)
      }
    }, intervalMs)
  },

  /**
   * Stop polling for updates
   */
  stopPolling(intervalId: number) {
    clearInterval(intervalId)
  }
}

export default {
  deviceService,
  solarDataService
}
