import * as fs from 'fs'
import { HAClient } from './ha-client'
import { CloudClient, DataPayload } from './cloud-client'
import { Logger } from './logger'

const logger = new Logger()

export interface EntityMapping {
  type: string
  entityId: string
  friendlyName: string
  unit?: string
}

export interface AgentConfig {
  pairingCode?: string
  deviceToken?: string
  pairingCodeExpiry?: number
  haUrl: string
  haToken: string
  cloudUrl: string
  pollingInterval: number
  entityMappings: EntityMapping[]
}

interface AgentConfigInput {
  pairingCode?: string
  deviceToken?: string
  pairingCodeExpiry?: number
  haUrl: string
  haToken: string
  cloudUrl?: string
  backendUrl?: string
  pollingInterval?: number
  pollInterval?: number
  entityMappings?: EntityMapping[]
  sensors?: string[]
}

const ENERGY_METRIC_TYPES = new Set([
  'energy_today',
  'solar_production',
  'grid_import',
  'grid_export',
  'home_consumption',
  'energy_import',
  'energy_export',
  'daily_energy',
])

export class DataCollector {
  private config: AgentConfig
  private haClient: HAClient
  private cloudClient: CloudClient
  private pollingInterval: NodeJS.Timeout | null = null
  private configFile: string

  constructor(configPath: string) {
    this.configFile = configPath
    this.config = this.loadConfig()
    this.haClient = new HAClient(this.config.haUrl, this.config.haToken)
    this.cloudClient = new CloudClient(this.config.cloudUrl, this.config.deviceToken || '')
  }

  private normalizeCloudUrl(inputUrl?: string): string {
    const defaultUrl = 'http://localhost:5000/api'
    if (!inputUrl || typeof inputUrl !== 'string') {
      return defaultUrl
    }

    const trimmedUrl = inputUrl.trim().replace(/\/+$/, '')
    if (!trimmedUrl) {
      return defaultUrl
    }

    if (trimmedUrl.endsWith('/api')) {
      return trimmedUrl
    }

    return `${trimmedUrl}/api`
  }

  private mapSensorToType(sensorId: string): string {
    const id = sensorId.toLowerCase()

    // Grid import (nakoupená energie)
    if ((id.includes('grid') || id.includes('elektromer') || id.includes('elektroměr')) && 
        (id.includes('import') || id.includes('nakoupena') || id.includes('nakoupená'))) {
      return 'grid_import'
    }
    
    // Grid export (vyexportovaná energie)
    if ((id.includes('grid') || id.includes('elektromer') || id.includes('elektroměr')) && 
        (id.includes('export') || id.includes('prodej'))) {
      return 'grid_export'
    }
    
    // Solar production (vyrobená energie ze střidače)
    if ((id.includes('solar') || id.includes('pv') || id.includes('inverter') || 
         id.includes('stridac') || id.includes('střídač')) && 
        (id.includes('production') || id.includes('vyroba') || id.includes('výroba') || 
         id.includes('energy') || id.includes('energie'))) {
      return 'solar_production'
    }

    // Home consumption (přímá spotřeba domu)
    if (
      (id.includes('home') || id.includes('house') || id.includes('dum') || id.includes('dům') || id.includes('load')) &&
      (id.includes('energy') || id.includes('consumption') || id.includes('spotreba') || id.includes('spotřeba'))
    ) {
      return 'home_consumption'
    }

    if (id.includes('battery') && (id.includes('soc') || id.includes('level'))) {
      return 'battery_soc'
    }
    if (id.includes('energy') && (id.includes('today') || id.includes('daily'))) {
      return 'energy_today'
    }
    if (id.includes('power') && id.includes('battery')) {
      return 'battery_power'
    }
    if (id.includes('power')) {
      return 'power_now'
    }
    if (id.includes('voltage')) {
      return 'voltage'
    }
    if (id.includes('current') || id.includes('amp')) {
      return 'current'
    }
    if (id.includes('temp')) {
      return 'temperature'
    }

    return id.replace(/^sensor\./, '').replace(/[^a-z0-9_]/g, '_')
  }

  private buildEntityMappings(sensors: string[]): EntityMapping[] {
    return sensors.map((sensorId) => ({
      type: this.mapSensorToType(sensorId),
      entityId: sensorId,
      friendlyName: sensorId,
    }))
  }

  private normalizeMetricValue(mapping: EntityMapping, state: { attributes?: Record<string, unknown> }, value: number): number {
    if (!ENERGY_METRIC_TYPES.has(mapping.type)) {
      return value
    }

    const configuredUnit = typeof mapping.unit === 'string' ? mapping.unit : ''
    const stateUnitRaw = state.attributes?.unit_of_measurement
    const detectedUnit = typeof stateUnitRaw === 'string' ? stateUnitRaw : configuredUnit
    const unit = detectedUnit.toLowerCase().replace(/\s+/g, '')

    if (unit === 'wh') {
      return value / 1000
    }

    if (unit === 'mwh') {
      return value * 1000
    }

    return value
  }

  private loadConfig(): AgentConfig {
    try {
      const configData = fs.readFileSync(this.configFile, 'utf-8')
      const rawConfig = JSON.parse(configData) as AgentConfigInput

      const cloudUrl = this.normalizeCloudUrl(rawConfig.cloudUrl || rawConfig.backendUrl)
      const pollingInterval =
        typeof rawConfig.pollingInterval === 'number'
          ? rawConfig.pollingInterval
          : typeof rawConfig.pollInterval === 'number'
            ? rawConfig.pollInterval * 1000
            : 30000

      const entityMappings = Array.isArray(rawConfig.entityMappings)
        ? rawConfig.entityMappings
        : this.buildEntityMappings(Array.isArray(rawConfig.sensors) ? rawConfig.sensors : [])

      if (entityMappings.length === 0) {
        logger.warn('No sensors/entity mappings configured. Pairing can succeed, but no metrics will be collected until sensors are configured.')
      }

      const normalizedConfig: AgentConfig = {
        pairingCode: rawConfig.pairingCode,
        deviceToken: rawConfig.deviceToken,
        pairingCodeExpiry: rawConfig.pairingCodeExpiry,
        haUrl: rawConfig.haUrl,
        haToken: rawConfig.haToken,
        cloudUrl,
        pollingInterval,
        entityMappings,
      }

      logger.info(`Cloud API URL: ${normalizedConfig.cloudUrl}`)
      return normalizedConfig
    } catch (error) {
      logger.error('Failed to load config:', error)
      throw error
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
      logger.info('Configuration saved')
    } catch (error) {
      logger.error('Failed to save config:', error)
    }
  }

  async pair(pairingCode: string): Promise<boolean> {
    try {
      logger.info('Starting device pairing...')
      const deviceToken = await this.cloudClient.pair(pairingCode)
      
      if (!deviceToken) {
        logger.error('Pairing failed - no device token received')
        return false
      }

      this.config.deviceToken = deviceToken
      this.cloudClient.setDeviceToken(deviceToken)
      this.saveConfig()
      
      logger.info('Device paired successfully')
      return true
    } catch (error) {
      logger.error('Pairing error:', error)
      return false
    }
  }

  async testHAConnection(): Promise<boolean> {
    logger.info('Testing Home Assistant connection...')
    const connected = await this.haClient.testConnection()
    if (connected) {
      logger.info('Home Assistant connection successful')
    } else {
      logger.error('Failed to connect to Home Assistant')
    }
    return connected
  }

  async collectData(): Promise<DataPayload | null> {
    try {
      logger.debug('Collecting data from Home Assistant...')
      
      const metrics: Record<string, number | string> = {}
      let allSuccess = true

      for (const mapping of this.config.entityMappings) {
        const state = await this.haClient.getState(mapping.entityId)
        
        if (state) {
          try {
            const parsedValue = Number.parseFloat(state.state)
            if (!Number.isFinite(parsedValue)) {
              throw new Error('Metric value is not a finite number')
            }

            const normalizedValue = this.normalizeMetricValue(mapping, state, parsedValue)
            metrics[mapping.type] = normalizedValue
            logger.debug(`Collected ${mapping.type}: ${normalizedValue}`)
          } catch (error) {
            logger.warn(`Failed to parse value for ${mapping.entityId}`)
            allSuccess = false
          }
        } else {
          logger.warn(`Entity not found or unavailable: ${mapping.entityId}`)
          allSuccess = false
        }
      }

      if (!allSuccess) {
        logger.warn('Some metrics failed to collect')
      }

      const payload: DataPayload = {
        timestamp: new Date().toISOString(),
        metrics,
        health: {
          lastDataAge: 0,
          agentHealth: allSuccess ? 'healthy' : 'degraded'
        }
      }

      return payload
    } catch (error) {
      logger.error('Error collecting data:', error)
      return null
    }
  }

  async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn('Polling already started')
      return
    }

    if (!this.config.deviceToken) {
      logger.error('Device token not set - cannot start polling without pairing')
      return
    }

    logger.info(`Starting polling with interval ${this.config.pollingInterval}ms`)

    // Collect immediately on start
    await this.pushData()

    // Then set up recurring collection
    this.pollingInterval = setInterval(
      () => this.pushData(),
      this.config.pollingInterval
    )

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stopPolling())
    process.on('SIGTERM', () => this.stopPolling())
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      logger.info('Polling stopped')
    }
  }

  private async pushData(): Promise<void> {
    try {
      const data = await this.collectData()
      if (data) {
        const success = await this.cloudClient.pushData(data)
        if (success) {
          logger.info('Data pushed to cloud')
        } else {
          logger.warn('Failed to push data to cloud')
        }
      }
    } catch (error) {
      logger.error('Error in push data:', error)
    }
  }

  getConfig(): AgentConfig {
    return this.config
  }

  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates }
    this.saveConfig()
  }
}
