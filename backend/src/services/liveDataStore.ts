export interface LiveData {
  timestamp: string
  power: number
  energy: number
  battery: number
  inverterStatus: 'online' | 'offline'
  lastUpdate: string
  voltage: number
  current: number
  efficiency: number
  temperature: number
  gridImport: number
  gridExport: number
  solarProduction: number
  solarProductionTotal: number
  homeConsumption: number
  selfConsumptionPercent: number
  hasGridImport: boolean
  hasGridExport: boolean
  hasHomeConsumption: boolean
}

export interface HistoryPoint {
  time: string
  power: number
  energy: number
  battery: number
  timestamp: string
  gridImport: number
  gridExport: number
  solarProduction: number
  solarProductionTotal: number
  homeConsumption: number
  selfConsumptionPercent: number
  deviceId?: string
}

interface AgentPushPayload {
  siteId: string
  deviceId: string
  timestamp?: string
  metrics?: Record<string, number | string>
}

interface DeviceDataState {
  liveData: LiveData
  history: HistoryPoint[]
}

const siteDeviceStore = new Map<string, Map<string, DeviceDataState>>()
const MAX_HISTORY_POINTS = 2016

function createEmptyLiveData(): LiveData {
  const nowIso = new Date().toISOString()

  return {
    timestamp: nowIso,
    power: 0,
    energy: 0,
    battery: 0,
    inverterStatus: 'offline',
    lastUpdate: nowIso,
    voltage: 0,
    current: 0,
    efficiency: 0,
    temperature: 0,
    gridImport: 0,
    gridExport: 0,
    solarProduction: 0,
    solarProductionTotal: 0,
    homeConsumption: 0,
    selfConsumptionPercent: 0,
    hasGridImport: false,
    hasGridExport: false,
    hasHomeConsumption: false,
  }
}

function getOrCreateDeviceState(siteId: string, deviceId: string): DeviceDataState {
  let siteStore = siteDeviceStore.get(siteId)
  if (!siteStore) {
    siteStore = new Map<string, DeviceDataState>()
    siteDeviceStore.set(siteId, siteStore)
  }

  let deviceState = siteStore.get(deviceId)
  if (!deviceState) {
    deviceState = {
      liveData: createEmptyLiveData(),
      history: [],
    }
    siteStore.set(deviceId, deviceState)
  }

  return deviceState
}

function getLatestDeviceState(siteId: string): DeviceDataState | null {
  const siteStore = siteDeviceStore.get(siteId)
  if (!siteStore || siteStore.size === 0) {
    return null
  }

  const sortedStates = Array.from(siteStore.values()).sort(
    (left, right) => new Date(right.liveData.lastUpdate).getTime() - new Date(left.liveData.lastUpdate).getTime(),
  )

  return sortedStates[0] || null
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function hasMetric(metrics: Record<string, number | string>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = metrics[key]
    if (value === undefined || value === null) {
      return false
    }

    if (typeof value === 'string') {
      return value.trim() !== ''
    }

    return true
  })
}

export function updateLiveDataFromAgent(payload: AgentPushPayload): void {
  const deviceState = getOrCreateDeviceState(payload.siteId, payload.deviceId)
  const previousLiveData = deviceState.liveData
  const metrics = payload.metrics || {}
  const nowIso = payload.timestamp || new Date().toISOString()

  const power = toNumber(metrics.power_now ?? metrics.power ?? metrics.solar_power, previousLiveData.power)
  const energy = toNumber(metrics.energy_today ?? metrics.energy ?? metrics.daily_energy, previousLiveData.energy)
  const battery = toNumber(metrics.battery_soc ?? metrics.battery ?? metrics.soc, previousLiveData.battery)
  const voltage = toNumber(metrics.battery_voltage ?? metrics.voltage, previousLiveData.voltage)
  const current = toNumber(metrics.current ?? metrics.battery_current, previousLiveData.current)
  const temperature = toNumber(metrics.temperature ?? metrics.inverter_temperature, previousLiveData.temperature)
  const efficiency = toNumber(metrics.efficiency, previousLiveData.efficiency)

  const hasGridImport = hasMetric(metrics, ['grid_import', 'grid_energy_import', 'energy_import'])
  const hasGridExport = hasMetric(metrics, ['grid_export', 'grid_energy_export', 'energy_export'])
  const hasHomeConsumption = hasMetric(metrics, ['home_consumption', 'home_energy', 'house_consumption', 'load_energy'])

  const gridImport = toNumber(metrics.grid_import ?? metrics.grid_energy_import ?? metrics.energy_import, previousLiveData.gridImport)
  const gridExport = toNumber(metrics.grid_export ?? metrics.grid_energy_export ?? metrics.energy_export, previousLiveData.gridExport)
  const solarProduction = toNumber(metrics.solar_production ?? metrics.solar_energy ?? metrics.pv_energy, previousLiveData.solarProduction)
  const solarProductionTotal = toNumber(
    metrics.solar_production_total ?? metrics.solar_energy_total ?? metrics.pv_energy_total,
    previousLiveData.solarProductionTotal,
  )
  const homeConsumption = toNumber(
    metrics.home_consumption ?? metrics.home_energy ?? metrics.house_consumption ?? metrics.load_energy,
    previousLiveData.homeConsumption,
  )

  let selfConsumptionPercent = 0
  let selfConsumptionReliable = false
  if (solarProduction > 0) {
    if (hasGridExport) {
      selfConsumptionPercent = Math.max(0, Math.min(100, ((solarProduction - gridExport) / solarProduction) * 100))
      selfConsumptionReliable = true
    } else if (hasHomeConsumption) {
      const solarUsedAtHome = Math.max(homeConsumption - gridImport, 0)
      selfConsumptionPercent = Math.max(0, Math.min(100, (solarUsedAtHome / solarProduction) * 100))
      selfConsumptionReliable = true
    }
  }

  if (!selfConsumptionReliable && solarProduction > 0 && Number.isFinite(previousLiveData.selfConsumptionPercent)) {
    selfConsumptionPercent = previousLiveData.selfConsumptionPercent
  }

  deviceState.liveData = {
    timestamp: nowIso,
    power,
    energy,
    battery,
    inverterStatus: 'online',
    lastUpdate: nowIso,
    voltage,
    current,
    efficiency,
    temperature,
    gridImport,
    gridExport,
    solarProduction,
    solarProductionTotal,
    homeConsumption,
    selfConsumptionPercent,
    hasGridImport,
    hasGridExport,
    hasHomeConsumption,
  }

  deviceState.history.push({
    time: new Date(nowIso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    power,
    energy,
    battery,
    timestamp: nowIso,
    gridImport,
    gridExport,
    solarProduction,
    solarProductionTotal,
    homeConsumption,
    selfConsumptionPercent,
    deviceId: payload.deviceId,
  })

  if (deviceState.history.length > MAX_HISTORY_POINTS) {
    deviceState.history.splice(0, deviceState.history.length - MAX_HISTORY_POINTS)
  }
}

export function getLiveData(siteId: string): LiveData {
  return getLatestDeviceState(siteId)?.liveData || createEmptyLiveData()
}

export function getAllLiveData(): Record<string, LiveData> {
  return Array.from(siteDeviceStore.keys()).reduce<Record<string, LiveData>>((accumulator, siteId) => {
    accumulator[siteId] = getLiveData(siteId)
    return accumulator
  }, {})
}

export function getHistory(siteId: string, hours = 24): HistoryPoint[] {
  const deviceState = getLatestDeviceState(siteId)
  if (!deviceState || deviceState.history.length === 0) {
    return []
  }

  const maxPoints = Math.max(1, Math.floor((hours * 60) / 5))
  return deviceState.history.slice(-maxPoints)
}

export function getAllHistory(hours = 24): Record<string, HistoryPoint[]> {
  return Array.from(siteDeviceStore.keys()).reduce<Record<string, HistoryPoint[]>>((accumulator, siteId) => {
    accumulator[siteId] = getHistory(siteId, hours)
    return accumulator
  }, {})
}

export function getConnectionStatus(siteId: string) {
  const liveData = getLiveData(siteId)
  const now = Date.now()
  const last = new Date(liveData.lastUpdate).getTime()
  const ageMs = now - last
  const isConnected = liveData.inverterStatus === 'online' && ageMs <= 15000

  return {
    isConnected,
    haConnected: isConnected,
    agentConnected: isConnected,
    lastSyncTime: liveData.lastUpdate,
  }
}

export function getAllConnectionStatuses(): Record<string, ReturnType<typeof getConnectionStatus>> {
  return Array.from(siteDeviceStore.keys()).reduce<Record<string, ReturnType<typeof getConnectionStatus>>>((accumulator, siteId) => {
    accumulator[siteId] = getConnectionStatus(siteId)
    return accumulator
  }, {})
}
