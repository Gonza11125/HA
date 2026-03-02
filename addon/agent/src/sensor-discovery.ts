/**
 * Automatic sensor discovery for Home Assistant
 * Finds solar/inverter/battery sensors automatically
 */

import axios from 'axios'
import { Logger } from './logger'

const logger = new Logger()

export interface DiscoveredSensor {
  entityId: string
  friendlyName: string
  state: string
  unit: string
  category: 'power' | 'energy' | 'battery' | 'voltage' | 'current' | 'temperature' | 'other'
  relevanceScore: number
}

export interface DiscoveryResult {
  power: DiscoveredSensor[]
  energy: DiscoveredSensor[]
  battery: DiscoveredSensor[]
  voltage: DiscoveredSensor[]
  current: DiscoveredSensor[]
  temperature: DiscoveredSensor[]
  other: DiscoveredSensor[]
}

/**
 * Keywords for categorizing sensors
 */
const KEYWORDS = {
  power: ['power', 'watt', 'w', 'výkon', 'vykon'],
  energy: ['energy', 'kwh', 'wh', 'energie', 'total', 'today', 'dnes'],
  battery: ['battery', 'baterie', 'akku', 'batt', 'soc', 'charge'],
  voltage: ['voltage', 'volt', 'napeti', 'napětí'],
  current: ['current', 'ampere', 'amp', 'proud'],
  temperature: ['temperature', 'temp', 'teplota'],
  inverter: ['inverter', 'měnič', 'menic', 'střídač', 'stridac'],
  solar: ['solar', 'pv', 'photovoltaic', 'panel', 'solární', 'solarni'],
}

/**
 * Calculate relevance score for a sensor
 */
function calculateRelevance(entityId: string, friendlyName: string): number {
  let score = 0
  const searchText = `${entityId} ${friendlyName}`.toLowerCase()

  // High priority keywords
  if (KEYWORDS.solar.some(kw => searchText.includes(kw))) score += 10
  if (KEYWORDS.inverter.some(kw => searchText.includes(kw))) score += 10

  // Medium priority
  if (KEYWORDS.power.some(kw => searchText.includes(kw))) score += 5
  if (KEYWORDS.energy.some(kw => searchText.includes(kw))) score += 5
  if (KEYWORDS.battery.some(kw => searchText.includes(kw))) score += 5

  // Boost for common patterns
  if (entityId.startsWith('sensor.')) score += 2
  if (searchText.includes('_power')) score += 3
  if (searchText.includes('_energy')) score += 3

  return score
}

/**
 * Categorize sensor based on entity ID and name
 */
function categorizeSensor(entityId: string, friendlyName: string, unit: string): DiscoveredSensor['category'] {
  const searchText = `${entityId} ${friendlyName} ${unit}`.toLowerCase()

  // Power sensors
  if (KEYWORDS.power.some(kw => searchText.includes(kw)) || unit.toLowerCase().includes('w')) {
    return 'power'
  }

  // Energy sensors
  if (KEYWORDS.energy.some(kw => searchText.includes(kw)) || unit.toLowerCase().includes('wh')) {
    return 'energy'
  }

  // Battery sensors
  if (KEYWORDS.battery.some(kw => searchText.includes(kw)) || unit === '%' || searchText.includes('soc')) {
    return 'battery'
  }

  // Voltage sensors
  if (KEYWORDS.voltage.some(kw => searchText.includes(kw)) || unit.toLowerCase() === 'v') {
    return 'voltage'
  }

  // Current sensors
  if (KEYWORDS.current.some(kw => searchText.includes(kw)) || unit.toLowerCase() === 'a') {
    return 'current'
  }

  // Temperature sensors
  if (KEYWORDS.temperature.some(kw => searchText.includes(kw)) || unit === '°C' || unit === '°F') {
    return 'temperature'
  }

  return 'other'
}

/**
 * Discover all relevant sensors in Home Assistant
 */
export async function discoverSensors(haUrl: string, haToken: string): Promise<DiscoveryResult> {
  try {
    logger.info('Starting sensor discovery...')

    // Get all states from Home Assistant
    const response = await axios.get(`${haUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${haToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    const states = response.data

    logger.info(`Found ${states.length} total entities in Home Assistant`)

    // Initialize result
    const result: DiscoveryResult = {
      power: [],
      energy: [],
      battery: [],
      voltage: [],
      current: [],
      temperature: [],
      other: [],
    }

    // Filter and categorize sensors
    for (const entity of states) {
      const entityId = entity.entity_id
      const friendlyName = entity.attributes?.friendly_name || entityId
      const state = entity.state
      const unit = entity.attributes?.unit_of_measurement || ''

      // Only process sensor entities
      if (!entityId.startsWith('sensor.')) continue

      // Skip unavailable/unknown sensors
      if (state === 'unavailable' || state === 'unknown') continue

      // Calculate relevance
      const relevanceScore = calculateRelevance(entityId, friendlyName)

      // Skip if not relevant at all
      if (relevanceScore < 2) continue

      // Categorize
      const category = categorizeSensor(entityId, friendlyName, unit)

      const sensor: DiscoveredSensor = {
        entityId,
        friendlyName,
        state,
        unit,
        category,
        relevanceScore,
      }

      result[category].push(sensor)
    }

    // Sort by relevance score (descending)
    for (const category in result) {
      result[category as keyof DiscoveryResult].sort((a, b) => b.relevanceScore - a.relevanceScore)
    }

    // Log summary
    logger.info('Discovery complete!')
    logger.info(`  Power sensors: ${result.power.length}`)
    logger.info(`  Energy sensors: ${result.energy.length}`)
    logger.info(`  Battery sensors: ${result.battery.length}`)
    logger.info(`  Voltage sensors: ${result.voltage.length}`)
    logger.info(`  Current sensors: ${result.current.length}`)
    logger.info(`  Temperature sensors: ${result.temperature.length}`)
    logger.info(`  Other relevant sensors: ${result.other.length}`)

    return result

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Home Assistant at ${haUrl}. Is it running?`)
    }
    if (error.response?.status === 401) {
      throw new Error('Invalid Home Assistant token. Please check your credentials.')
    }
    throw new Error(`Discovery failed: ${error.message}`)
  }
}

/**
 * Get the best sensors for monitoring
 * Returns the top sensor from each category
 */
export function getBestSensors(discovery: DiscoveryResult): {
  power?: DiscoveredSensor
  energy?: DiscoveredSensor
  battery?: DiscoveredSensor
  voltage?: DiscoveredSensor
  current?: DiscoveredSensor
  temperature?: DiscoveredSensor
} {
  return {
    power: discovery.power[0],
    energy: discovery.energy[0],
    battery: discovery.battery[0],
    voltage: discovery.voltage[0],
    current: discovery.current[0],
    temperature: discovery.temperature[0],
  }
}

/**
 * Format discovered sensors for display
 */
export function formatDiscoveryResults(discovery: DiscoveryResult): string {
  let output = '\n=== DISCOVERED SENSORS ===\n\n'

  const categories: Array<keyof DiscoveryResult> = [
    'power',
    'energy',
    'battery',
    'voltage',
    'current',
    'temperature',
    'other'
  ]

  for (const category of categories) {
    const sensors = discovery[category]
    if (sensors.length === 0) continue

    output += `${category.toUpperCase()} (${sensors.length}):\n`
    
    // Show top 5 sensors in each category
    const displaySensors = sensors.slice(0, 5)
    for (const sensor of displaySensors) {
      const scoreBar = '█'.repeat(Math.min(sensor.relevanceScore, 10))
      output += `  [${scoreBar.padEnd(10)}] ${sensor.friendlyName}\n`
      output += `      ID: ${sensor.entityId}\n`
      output += `      Current: ${sensor.state} ${sensor.unit}\n`
    }
    
    if (sensors.length > 5) {
      output += `  ... and ${sensors.length - 5} more\n`
    }
    output += '\n'
  }

  return output
}

/**
 * Interactive sensor selection (for CLI)
 */
export function getRecommendedSensorIds(discovery: DiscoveryResult): string[] {
  const sensors: string[] = []
  
  // Add top sensors from each important category
  if (discovery.power.length > 0) sensors.push(discovery.power[0].entityId)
  if (discovery.energy.length > 0) sensors.push(discovery.energy[0].entityId)
  if (discovery.battery.length > 0) sensors.push(discovery.battery[0].entityId)
  if (discovery.voltage.length > 0) sensors.push(discovery.voltage[0].entityId)
  if (discovery.temperature.length > 0) sensors.push(discovery.temperature[0].entityId)

  return sensors
}
