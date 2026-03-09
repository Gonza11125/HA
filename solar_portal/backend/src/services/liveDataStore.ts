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
  gridImport: number
  solarProduction: number
  selfConsumptionPercent: number
}

interface HistoryPoint {
  time: string
  power: number
  energy: number
  battery: number
  timestamp: string
  gridImport: number
  solarProduction: number
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
  solarProduction: 0,
  selfConsumptionPercent: 0,
}

// Uložit až 7 dní historie (5 min interval = 12 bodů/hodinu * 24 hodin * 7 dní = 2016 bodů)
const MAX_HISTORY_POINTS = 2016

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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
  
  // Nové metriky
  const gridImport = toNumber(metrics.grid_import ?? metrics.grid_energy_import ?? metrics.energy_import, liveData.gridImport)
  const solarProduction = toNumber(metrics.solar_production ?? metrics.solar_energy ?? metrics.pv_energy, liveData.solarProduction)
  
  // Výpočet procenta využití
  let selfConsumptionPercent = liveData.selfConsumptionPercent
  if (solarProduction > 0) {
    const gridExport = toNumber(metrics.grid_export ?? metrics.grid_energy_export ?? metrics.energy_export, 0)
    if (gridExport > 0) {
      selfConsumptionPercent = Math.max(0, Math.min(100, ((solarProduction - gridExport) / solarProduction) * 100))
    } else {
      if (gridImport > 0) {
        selfConsumptionPercent = 100
      } else {
        selfConsumptionPercent = power > 0 ? Math.min(100, (power / solarProduction) * 100) : liveData.selfConsumptionPercent
      }
    }
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
    solarProduction,
    selfConsumptionPercent,
  }

  history.push({
    time: new Date(nowIso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    power,
    energy,
    battery,
    timestamp: nowIso,
    gridImport,
    solarProduction,
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
