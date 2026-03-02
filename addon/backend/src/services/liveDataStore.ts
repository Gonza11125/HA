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
}

interface HistoryPoint {
  time: string
  power: number
  energy: number
  battery: number
  timestamp: string
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
}

const MAX_HISTORY_POINTS = 288

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
  }

  history.push({
    time: new Date(nowIso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    power,
    energy,
    battery,
    timestamp: nowIso,
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
