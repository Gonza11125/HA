interface LiveData {
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
  gridImport: number // Nakoupená energie z elektroměru kotelny (kWh)
  gridExport: number // Přetok do sítě (kWh)
  solarProduction: number // Vyrobená energie ze střidače (kWh)
  solarProductionTotal: number // Celková výroba FVE od začátku (kWh)
  homeConsumption: number // Přímá spotřeba domu (kWh)
  selfConsumptionPercent: number // Procento využití energie z FVE
  hasGridImport: boolean
  hasGridExport: boolean
  hasHomeConsumption: boolean
}

interface HistoryPoint {
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
}

interface AgentPushPayload {
  timestamp?: string
  metrics?: Record<string, number | string>
}

const history: HistoryPoint[] = []

let liveData: LiveData = {
  timestamp: new Date().toISOString(),
  power: 0,
  energy: 0,
  battery: 0,
  inverterStatus: 'offline',
  lastUpdate: new Date().toISOString(),
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

// Uložit až 7 dní historie (5 min interval = 12 bodů/hodinu * 24 hodin * 7 dní = 2016 bodů)
const MAX_HISTORY_POINTS = 2016

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
  const metrics = payload.metrics || {}
  const nowIso = payload.timestamp || new Date().toISOString()

  const power = toNumber(metrics.power_now ?? metrics.power ?? metrics.solar_power, liveData.power)
  const energy = toNumber(metrics.energy_today ?? metrics.energy ?? metrics.daily_energy, liveData.energy)
  const battery = toNumber(metrics.battery_soc ?? metrics.battery ?? metrics.soc, liveData.battery)
  const voltage = toNumber(metrics.battery_voltage ?? metrics.voltage, liveData.voltage)
  const current = toNumber(metrics.current ?? metrics.battery_current, liveData.current)
  const temperature = toNumber(metrics.temperature ?? metrics.inverter_temperature, liveData.temperature)
  const efficiency = toNumber(metrics.efficiency, liveData.efficiency)

  const hasGridImport = hasMetric(metrics, ['grid_import', 'grid_energy_import', 'energy_import'])
  const hasGridExport = hasMetric(metrics, ['grid_export', 'grid_energy_export', 'energy_export'])
  const hasHomeConsumption = hasMetric(metrics, ['home_consumption', 'home_energy', 'house_consumption', 'load_energy'])

  const gridImport = toNumber(metrics.grid_import ?? metrics.grid_energy_import ?? metrics.energy_import, liveData.gridImport)
  const gridExport = toNumber(metrics.grid_export ?? metrics.grid_energy_export ?? metrics.energy_export, liveData.gridExport)
  const solarProduction = toNumber(metrics.solar_production ?? metrics.solar_energy ?? metrics.pv_energy, liveData.solarProduction)
  const solarProductionTotal = toNumber(
    metrics.solar_production_total ?? metrics.solar_energy_total ?? metrics.pv_energy_total,
    liveData.solarProductionTotal,
  )
  const homeConsumption = toNumber(
    metrics.home_consumption ?? metrics.home_energy ?? metrics.house_consumption ?? metrics.load_energy,
    liveData.homeConsumption,
  )

  // Vypočítej samospotřebu jen z měření, která dávají fyzikálně smysl.
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

  if (!selfConsumptionReliable && solarProduction > 0 && Number.isFinite(liveData.selfConsumptionPercent)) {
    // Drž poslední známou hodnotu jen pokud se nedá dopočítat v aktuálním vzorku.
    selfConsumptionPercent = liveData.selfConsumptionPercent
  }

  liveData = {
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

  history.push({
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
  })

  if (history.length > MAX_HISTORY_POINTS) {
    history.splice(0, history.length - MAX_HISTORY_POINTS)
  }
}

export function getLiveData(): LiveData {
  return liveData
}

export function getHistory(hours = 24): HistoryPoint[] {
  if (history.length === 0) {
    return []
  }

  const maxPoints = Math.max(1, Math.floor((hours * 60) / 5))
  return history.slice(-maxPoints)
}

export function getConnectionStatus() {
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
