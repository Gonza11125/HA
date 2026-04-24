import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import useDashboardStore from '../hooks/useDashboardStore'
import { apiClient } from '../utils/api'
import Header from '../components/Header'

type ChartMetric = 'power' | 'energy' | 'battery' | 'gridImport' | 'solarProduction' | 'selfConsumptionPercent'
type ChartStyle = 'line' | 'bar'
type TimeRange = 0.5 | 5 | 24 | 168 | 720
type DashboardMetric =
  | 'power'
  | 'energy'
  | 'battery'
  | 'solarProduction'
  | 'gridImport'
  | 'selfConsumptionPercent'
  | 'temperature'

interface MetricHelp {
  label: string
  unit: string
  description: string
  interpretation: string
  updateInterval: string
}

interface MetricConfig {
  label: string
  title: string
  unit: string
  color: string
}

interface InsightItem {
  title: string
  body: string
  tone: 'good' | 'warn' | 'info'
}

interface DiagnosticsItem {
  label: string
  value: string
  tone: 'good' | 'warn' | 'neutral'
}

type TrendState = 'up' | 'down' | 'flat'

interface TrendInfo {
  state: TrendState
  icon: string
  toneClass: string
  text: string
}

const METRIC_CONFIG: Record<ChartMetric, MetricConfig> = {
  power: { label: 'Vykon', title: 'Aktualni vykon', unit: 'W', color: '#f59e0b' },
  energy: { label: 'Energie', title: 'Vyroba dnes', unit: 'kWh', color: '#10b981' },
  battery: { label: 'Baterie', title: 'Stav baterie', unit: '%', color: '#2563eb' },
  gridImport: { label: 'Sit', title: 'Odber ze site', unit: 'kWh', color: '#ef4444' },
  solarProduction: { label: 'FVE', title: 'Vyroba FVE dnes', unit: 'kWh', color: '#22c55e' },
  selfConsumptionPercent: { label: 'Vyuziti vyroby', title: 'Vyuziti vyroby FVE', unit: '%', color: '#06b6d4' },
}

const METRIC_HELP: Record<DashboardMetric, MetricHelp> = {
  power: {
    label: 'Aktualni vykon',
    unit: 'W',
    description: 'Okamzity vykon, ktery system prave vyrabi nebo zpracovava.',
    interpretation: 'Vyssi hodnota obvykle znamena silnejsi okamzitou vyrobu.',
    updateInterval: 'Kazdych 5 az 10 sekund.',
  },
  energy: {
    label: 'Energie dnes',
    unit: 'kWh',
    description: 'Souhrn vyroby od pulnoci do teto chvile.',
    interpretation: 'Hodnota behem dne roste a vecer se ustali.',
    updateInterval: 'Prubezne behem celeho dne.',
  },
  battery: {
    label: 'Stav baterie',
    unit: '%',
    description: 'Kolik energie je aktualne ulozeno v baterii.',
    interpretation: 'Nad 80 % vysoka rezerva, pod 20 % je baterie nizko.',
    updateInterval: 'Kazdych 5 az 10 sekund.',
  },
  solarProduction: {
    label: 'Vyroba FVE dnes',
    unit: 'kWh',
    description: 'Souhrn energie vyrobene fotovoltaikou od pulnoci do teto chvile.',
    interpretation: 'Hodnota behem dne roste a vecer se ustali.',
    updateInterval: 'Prubezne behem dne.',
  },
  gridImport: {
    label: 'Nakoupena energie',
    unit: 'kWh',
    description: 'Energie odebrana ze site, kdyz vlastni vyroba nestaci.',
    interpretation: 'Nizsi hodnota znamena mensi zavislost na siti.',
    updateInterval: 'Prubezne behem dne.',
  },
  selfConsumptionPercent: {
    label: 'Vyuziti vyroby FVE',
    unit: '%',
    description: 'Podil dnes vyrobene FVE energie, ktery se spotreboval doma (neexportoval do site).',
    interpretation: 'Nejde o celkovou sobestacnost domu. 100 % znamena, ze dnesni vyroba FVE nebyla exportovana.',
    updateInterval: 'Prubezne behem dne.',
  },
  temperature: {
    label: 'Teplota',
    unit: 'degC',
    description: 'Teplota zarizeni nebo technicke casti systemu.',
    interpretation: 'Vyssi teplota muze signalizovat zatez nebo prehrivani.',
    updateInterval: 'Kazdych 10 az 30 sekund.',
  },
}

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 0.5, label: '30 min' },
  { value: 5, label: '5 h' },
  { value: 24, label: '24 h' },
  { value: 168, label: '7 dni' },
  { value: 720, label: '30 dni' },
]

const toneClasses: Record<InsightItem['tone'], string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-900',
}

const diagnosticToneClasses: Record<DiagnosticsItem['tone'], string> = {
  good: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-800',
  neutral: 'bg-slate-100 text-slate-700',
}

const formatTimeLabel = (timestamp?: string, range?: TimeRange, fallback?: string) => {
  if (!timestamp) {
    return fallback || ''
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return fallback || ''
  }

  if (range === 0.5 || range === 5) {
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  if (range === 24) {
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  if (range === 168) {
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })
}

const getBatteryLabel = (batteryLevel: number) => {
  if (batteryLevel >= 80) {
    return 'Vysoka rezerva'
  }
  if (batteryLevel >= 35) {
    return 'Stabilni stav'
  }
  return 'Nizka rezerva'
}

const normalizeDailyEnergyKwh = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  // Values are normalized by the agent/backend to kWh.
  return value
}

const resolveTrendState = (delta: number, epsilon: number): TrendState => {
  if (!Number.isFinite(delta) || Math.abs(delta) <= epsilon) {
    return 'flat'
  }
  return delta > 0 ? 'up' : 'down'
}

const buildTrendInfo = (
  delta: number,
  epsilon: number,
  labels: { up: string; down: string; flat: string },
): TrendInfo => {
  const state = resolveTrendState(delta, epsilon)
  if (state === 'up') {
    return { state, icon: '↑', toneClass: 'text-emerald-700', text: labels.up }
  }
  if (state === 'down') {
    return { state, icon: '↓', toneClass: 'text-rose-700', text: labels.down }
  }
  return { state, icon: '—', toneClass: 'text-amber-700', text: labels.flat }
}

export const DashboardPage = () => {
  const { user } = useAuthStore()
  const store = useDashboardStore()

  const [isPaired, setIsPaired] = useState(false)
  const [pairingCode, setPairingCode] = useState('150N6E')
  const [isPairing, setIsPairing] = useState(false)
  const [historyData, setHistoryData] = useState<
    Array<{
      time: string
      timestamp?: string
      power: number
      energy: number
      battery: number
      gridImport: number
      gridExport: number
      solarProduction: number
      homeConsumption: number
      selfConsumptionPercent: number
    }>
  >([])
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('battery')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('line')
  const [timeRange, setTimeRange] = useState<TimeRange>(24)
  const [openedMetricHelp, setOpenedMetricHelp] = useState<DashboardMetric | null>(null)

  useEffect(() => {
    const loadPairingCode = async () => {
      try {
        const { data } = await apiClient.get('/agent/pairing-code')
        if (data?.pairingCode) {
          setPairingCode(String(data.pairingCode).toUpperCase())
        }
      } catch {
        setPairingCode('150N6E')
      }
    }

    const loadPairingStatus = async () => {
      try {
        const { data } = await apiClient.get('/agent/status')
        setIsPaired(Boolean(data?.isPaired))
      } catch {
        setIsPaired(false)
      }
    }

    void loadPairingCode()
    void loadPairingStatus()
  }, [])

  useEffect(() => {
    if (store.isOnline) {
      setIsPaired(true)
    }
  }, [store.isOnline])


  useEffect(() => {
    if (!isPaired || !store.isOnline) {
      return
    }

    const loadHistory = async () => {
      try {
        const { data } = await apiClient.get(`/data/history?hours=${timeRange}`)
        setHistoryData(Array.isArray(data) ? data : [])
      } catch {
        setHistoryData([])
      }
    }

    void loadHistory()
    const interval = setInterval(loadHistory, 10000)
    return () => clearInterval(interval)
  }, [isPaired, store.isOnline, timeRange])

  const handlePair = () => {
    setIsPairing(true)
    apiClient
      .post('/agent/pair', { pairingCode })
      .then(() => setIsPaired(true))
      .finally(() => setIsPairing(false))
  }

  const liveData = store.currentData || {
    power: 0,
    energy: 0,
    battery: 0,
    temperature: 0,
    efficiency: 0,
    voltage: 0,
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

  const data = store.isOnline
    ? liveData
    : {
        power: 0,
        energy: 0,
        battery: 0,
        temperature: 0,
        efficiency: 0,
        voltage: 0,
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

  const normalizedEnergy = useMemo(() => normalizeDailyEnergyKwh(Number(data.energy)), [data.energy])
  const normalizedSolarProduction = useMemo(() => normalizeDailyEnergyKwh(Number(data.solarProduction)), [data.solarProduction])
  const normalizedSolarProductionTotal = useMemo(() => normalizeDailyEnergyKwh(Number(data.solarProductionTotal)), [data.solarProductionTotal])
  const normalizedGridImport = useMemo(() => normalizeDailyEnergyKwh(Number(data.gridImport)), [data.gridImport])
  const normalizedGridExport = useMemo(() => normalizeDailyEnergyKwh(Number(data.gridExport)), [data.gridExport])
  const normalizedHomeConsumption = useMemo(() => normalizeDailyEnergyKwh(Number(data.homeConsumption)), [data.homeConsumption])

  const selectedMetricConfig = useMemo(() => METRIC_CONFIG[selectedMetric], [selectedMetric])
  const selectedTimeRangeLabel = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? '24 h',
    [timeRange],
  )
  const chartData = useMemo(
    () =>
      historyData.map((point) => ({
        ...point,
        energy: normalizeDailyEnergyKwh(Number(point.energy)),
        gridImport: normalizeDailyEnergyKwh(Number(point.gridImport)),
        gridExport: normalizeDailyEnergyKwh(Number(point.gridExport)),
        solarProduction: normalizeDailyEnergyKwh(Number(point.solarProduction)),
        homeConsumption: normalizeDailyEnergyKwh(Number(point.homeConsumption)),
        time: formatTimeLabel(point.timestamp, timeRange, point.time),
      })),
    [historyData, timeRange],
  )

  const lastSyncLabel = useMemo(() => formatTimeLabel(store.lastUpdate, 0.5, 'N/A'), [store.lastUpdate])
  const effectiveSelfConsumptionPercent = useMemo(() => {
    if (normalizedSolarProduction <= 0) {
      return 0
    }

    if (Boolean(data.hasGridExport)) {
      return Math.max(0, Math.min(100, ((normalizedSolarProduction - normalizedGridExport) / normalizedSolarProduction) * 100))
    }

    if (Boolean(data.hasHomeConsumption)) {
      const solarUsedAtHome = Math.max(normalizedHomeConsumption - normalizedGridImport, 0)
      return Math.max(0, Math.min(100, (solarUsedAtHome / normalizedSolarProduction) * 100))
    }

    const fallback = Number(data.selfConsumptionPercent)
    return Number.isFinite(fallback) ? Math.max(0, Math.min(100, fallback)) : 0
  }, [
    data.hasGridExport,
    data.hasHomeConsumption,
    data.selfConsumptionPercent,
    normalizedGridExport,
    normalizedGridImport,
    normalizedHomeConsumption,
    normalizedSolarProduction,
  ])
  const selfConsumptionEnergy = useMemo(
    () => normalizedSolarProduction * (effectiveSelfConsumptionPercent / 100),
    [effectiveSelfConsumptionPercent, normalizedSolarProduction],
  )
  const estimatedHomeUsage = useMemo(() => {
    if (Boolean(data.hasHomeConsumption)) {
      return normalizedHomeConsumption
    }

    if (Boolean(data.hasGridExport)) {
      return Math.max(normalizedSolarProduction - normalizedGridExport + normalizedGridImport, 0)
    }

    return selfConsumptionEnergy + normalizedGridImport
  }, [
    data.hasGridExport,
    data.hasHomeConsumption,
    normalizedGridExport,
    normalizedGridImport,
    normalizedHomeConsumption,
    normalizedSolarProduction,
    selfConsumptionEnergy,
  ])
  const estimatedExport = useMemo(() => {
    if (Boolean(data.hasGridExport)) {
      return normalizedGridExport
    }

    return Math.max(normalizedSolarProduction - selfConsumptionEnergy, 0)
  }, [data.hasGridExport, normalizedGridExport, normalizedSolarProduction, selfConsumptionEnergy])

  const trendDelta = useMemo(() => {
    if (chartData.length < 2) {
      return {
        battery: 0,
        power: 0,
        solarProduction: 0,
        gridImport: 0,
        homeUsage: 0,
        exportEnergy: 0,
      }
    }

    const latest = chartData[chartData.length - 1]
    const prev = chartData[chartData.length - 2]
    const estimateHomeUsageAtPoint = (point: {
      homeConsumption: number
      solarProduction: number
      gridExport: number
      gridImport: number
      selfConsumptionPercent: number
    }) => {
      if (Boolean(data.hasHomeConsumption)) {
        return point.homeConsumption
      }

      if (Boolean(data.hasGridExport)) {
        return Math.max(point.solarProduction - point.gridExport + point.gridImport, 0)
      }

      return point.solarProduction * (point.selfConsumptionPercent / 100) + point.gridImport
    }

    const estimateExportAtPoint = (point: {
      solarProduction: number
      gridExport: number
      selfConsumptionPercent: number
    }) => {
      if (Boolean(data.hasGridExport)) {
        return point.gridExport
      }

      return Math.max(point.solarProduction - point.solarProduction * (point.selfConsumptionPercent / 100), 0)
    }

    return {
      battery: Number(latest.battery) - Number(prev.battery),
      power: Number(latest.power) - Number(prev.power),
      solarProduction: Number(latest.solarProduction) - Number(prev.solarProduction),
      gridImport: Number(latest.gridImport) - Number(prev.gridImport),
      homeUsage: estimateHomeUsageAtPoint(latest) - estimateHomeUsageAtPoint(prev),
      exportEnergy: estimateExportAtPoint(latest) - estimateExportAtPoint(prev),
    }
  }, [chartData, data.hasGridExport, data.hasHomeConsumption])

  const batteryTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.battery, 0.1, {
        up: 'Baterie se nabiji',
        down: 'Baterie se vybiji',
        flat: 'Baterie stagnuje',
      }),
    [trendDelta.battery],
  )
  const powerTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.power, 25, {
        up: 'Vykon roste',
        down: 'Vykon klesa',
        flat: 'Vykon stagnuje',
      }),
    [trendDelta.power],
  )
  const solarTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.solarProduction, 0.01, {
        up: 'Vyroba panelu roste',
        down: 'Vyroba panelu klesa',
        flat: 'Vyroba panelu stagnuje',
      }),
    [trendDelta.solarProduction],
  )
  const homeUsageTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.homeUsage, 0.01, {
        up: 'Spotreba domu roste',
        down: 'Spotreba domu klesa',
        flat: 'Spotreba domu stagnuje',
      }),
    [trendDelta.homeUsage],
  )
  const gridImportTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.gridImport, 0.01, {
        up: 'Odber ze site roste',
        down: 'Odber ze site klesa',
        flat: 'Odber ze site stagnuje',
      }),
    [trendDelta.gridImport],
  )
  const exportTrend = useMemo(
    () =>
      buildTrendInfo(trendDelta.exportEnergy, 0.01, {
        up: 'Prebytky rostou',
        down: 'Prebytky klesaji',
        flat: 'Prebytky stagnuji',
      }),
    [trendDelta.exportEnergy],
  )

  const summaryHeadline = useMemo(() => {
    if (!store.isOnline) {
      return 'System je offline a ceka na dalsi synchronizaci.'
    }

    if (Number(data.battery) < 20) {
      return 'Baterie je nizko, system potrebuje setrny provoz.'
    }

    if (Number(data.power) > 0) {
      return 'Vyroba bezi a web ukazuje aktualni stav cele instalace.'
    }

    return 'Elektrarna je pripojena, ale aktualni vykon je nizky.'
  }, [data.battery, data.power, store.isOnline])

  const statusTone = store.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

  const alerts = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = []

    if (!store.isOnline) {
      items.push({
        title: 'Backend nebo agent neodpovida',
        body: 'Web nema cerstva data. Zkontrolujte spojeni a restart add-onu.',
        tone: 'warn',
      })
    }

    if (Number(data.battery) < 20) {
      items.push({
        title: 'Baterie je pod 20 %',
        body: 'Rezerva je nizka. Omezte velke spotrebice nebo nabijeni odlozte.',
        tone: 'warn',
      })
    }

    if (Number(data.temperature) >= 45) {
      items.push({
        title: 'Teplota zarizeni je zvysena',
        body: 'Vysoka teplota muze znamenat silnou zatez nebo horsi chlazeni.',
        tone: 'warn',
      })
    }

    if (items.length === 0) {
      items.push({
        title: 'Bez kritickych upozorneni',
        body: 'Web nevidi zadny akutni problem v aktualnich datech.',
        tone: 'good',
      })
    }

    return items
  }, [data.battery, data.temperature, store.isOnline])

  const recommendations = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = []

    if (effectiveSelfConsumptionPercent >= 70) {
      items.push({
        title: 'Dobre vyuzivate dnesni vyrobu FVE',
        body: 'Vysoke vyuziti vyroby znamena malo exportu do site.',
        tone: 'good',
      })
    }

    if (Number(data.battery) >= 80) {
      items.push({
        title: 'Baterie ma vysokou rezervu',
        body: 'Muzete vyuzit vice energie doma nebo aktivovat dalsi automatizace.',
        tone: 'info',
      })
    }

    if (normalizedGridImport > normalizedSolarProduction && store.isOnline) {
      items.push({
        title: 'Spotreba site je vyssi nez vlastni vyroba',
        body: 'Zkontrolujte, zda neni vhodne posunout narocnejsi spotrebice na pozdeji.',
        tone: 'info',
      })
    }

    if (items.length === 0) {
      items.push({
        title: 'System funguje standardne',
        body: 'Neni potreba delat okamzitou akci. Sledujte jen dalsi vyvoj dne.',
        tone: 'info',
      })
    }

    return items.slice(0, 3)
  }, [data.battery, effectiveSelfConsumptionPercent, normalizedGridImport, normalizedSolarProduction, store.isOnline])

  const diagnostics = useMemo<DiagnosticsItem[]>(() => {
    return [
      {
        label: 'Pripojeni systemu',
        value: store.isOnline ? 'Online' : 'Offline',
        tone: store.isOnline ? 'good' : 'warn',
      },
      {
        label: 'Posledni sync',
        value: lastSyncLabel || 'N/A',
        tone: store.isOnline ? 'neutral' : 'warn',
      },
      {
        label: 'Baterie',
        value: getBatteryLabel(Number(data.battery)),
        tone: Number(data.battery) >= 35 ? 'good' : 'warn',
      },
      {
        label: 'Automatizace',
        value: 'Rizeni bezi v Home Assistant',
        tone: 'neutral',
      },
    ]
  }, [data.battery, lastSyncLabel, store.isOnline])

  if (!isPaired) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-2xl px-4 pt-10">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Nastaveni Solar Portalu</h1>
            <p className="text-gray-600">Propojte Home Assistant a spustte zivy monitoring.</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm text-gray-500">Parovaci kod</p>
            <p className="mb-4 text-4xl font-bold tracking-widest text-blue-600">{pairingCode}</p>
            <ol className="mb-6 space-y-2 text-sm text-gray-700">
              <li>1. Otevrete Home Assistant - Integrace</li>
              <li>2. Pridejte integraci Solar Portal</li>
              <li>3. Zadejte parovaci kod</li>
              <li>4. Potvrdte propojeni</li>
            </ol>
            <button
              onClick={handlePair}
              disabled={isPairing}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPairing ? 'Pripojuji...' : 'Mam vlozeny kod v Home Assistant'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0%,_#ecfeff_36%,_#f8fafc_70%)]">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-cyan-100 bg-white/90 shadow-sm backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Solar Portal</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Vitejte, {user?.fullName || 'Uzivatel'}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{summaryHeadline}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Posledni synchronizace</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{lastSyncLabel || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Rezerva baterie</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{getBatteryLabel(Number(data.battery))}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Automatizace</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Rizeni bezi v Home Assistant</p>
                  <button
                    onClick={() => window.location.hash = '#/automation'}
                    className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Otevrit automatizace
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${statusTone}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${store.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {store.isOnline ? 'Online a synchronizovano' : 'Offline nebo ceka na data'}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                <p className="font-semibold">Doporuceni pro uzivatele</p>
                <p className="mt-1">Kdyz system hlasi offline nebo nizkou rezervu baterie, web ma jasne ukazat dalsi krok bez technickych detailu.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            title="Aktualni vykon"
            value={Math.round(data.power)}
            unit="W"
            icon="⚡"
            color="yellow"
            subtitle="Kliknete pro popis veliciny"
            trend={trendDelta.power}
            trendEpsilon={25}
            trendText={powerTrend.text}
            onClick={() => setOpenedMetricHelp('power')}
          />
          <MetricCard title="Energie dnes" value={normalizedEnergy.toFixed(1)} unit="kWh" icon="📈" color="green" subtitle="Kliknete pro popis veliciny" onClick={() => setOpenedMetricHelp('energy')} />
          <MetricCard
            title="Stav baterie"
            value={Math.round(data.battery)}
            unit="%"
            icon="🔋"
            color="blue"
            subtitle="Kliknete pro popis veliciny"
            trend={trendDelta.battery}
            trendEpsilon={0.1}
            trendText={batteryTrend.text}
            onClick={() => setOpenedMetricHelp('battery')}
          />
          <MetricCard
            title="Vyroba FVE celkem"
            value={normalizedSolarProductionTotal.toFixed(2)}
            unit="kWh"
            icon="🔆"
            color="green"
            subtitle="Celkova vyroba od zacatku provozu"
          />
          <MetricCard
            title="Nakoupena energie"
            value={normalizedGridImport.toFixed(2)}
            unit="kWh"
            icon="🏭"
            color="red"
            subtitle="Kliknete pro popis veliciny"
            trend={trendDelta.gridImport}
            trendEpsilon={0.01}
            trendText={gridImportTrend.text}
            onClick={() => setOpenedMetricHelp('gridImport')}
          />
          <MetricCard title="Vyuziti vyroby FVE" value={Math.round(effectiveSelfConsumptionPercent)} unit="%" icon="♻️" color="blue" subtitle="Kliknete pro popis veliciny" onClick={() => setOpenedMetricHelp('selfConsumptionPercent')} />
          <MetricCard title="Teplota" value={Math.round(data.temperature)} unit="°C" icon="🌡️" color="red" subtitle="Kliknete pro popis veliciny" onClick={() => setOpenedMetricHelp('temperature')} />
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Energeticka bilance dnes</h2>
                <p className="text-sm text-slate-600">Jednoduchy prehled, odkud energie prisla a jak se vyuzila.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Dnes</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Panely</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{normalizedSolarProduction.toFixed(2)} kWh</p>
                <p className="mt-1 text-xs text-slate-600">Vyrobeno fotovoltaikou dnes.</p>
                <p className={`mt-2 text-xs font-semibold ${solarTrend.toneClass}`}>{solarTrend.icon} {solarTrend.text}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-700">Dum</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{estimatedHomeUsage.toFixed(2)} kWh</p>
                <p className="mt-1 text-xs text-slate-600">
                  {data.hasHomeConsumption
                    ? 'Priame mereni spotreby domu dnes.'
                    : data.hasGridExport
                      ? 'Vypocet z vyroby, importu a exportu.'
                      : 'Odhad energie vyuzite doma dnes.'}
                </p>
                <p className={`mt-2 text-xs font-semibold ${homeUsageTrend.toneClass}`}>{homeUsageTrend.icon} {homeUsageTrend.text}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Baterie</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(data.battery)} %</p>
                <p className="mt-1 text-xs text-slate-600">Aktualni ulozena rezerva energie.</p>
                <p className={`mt-2 text-xs font-semibold ${batteryTrend.toneClass}`}>{batteryTrend.icon} {batteryTrend.text}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-700">Sit a prebytky</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{normalizedGridImport.toFixed(2)} / {estimatedExport.toFixed(2)} kWh</p>
                <p className="mt-1 text-xs text-slate-600">
                  Prvni cislo je odber ze site, druhe {data.hasGridExport ? 'mereny' : 'odhad'} prebytek.
                </p>
                <p className={`mt-2 text-xs font-semibold ${gridImportTrend.toneClass}`}>{gridImportTrend.icon} {gridImportTrend.text}</p>
                <p className={`mt-1 text-xs font-semibold ${exportTrend.toneClass}`}>{exportTrend.icon} {exportTrend.text}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Diagnostika</h2>
            <p className="mt-1 text-sm text-slate-600">Rychly zdravotni stav webu a systemu.</p>
            <div className="mt-4 grid gap-3">
              {diagnostics.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${diagnosticToneClasses[item.tone]}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Upozorneni</h2>
            <div className="mt-4 space-y-3">
              {alerts.map((item) => (
                <div key={item.title} className={`rounded-2xl border px-4 py-3 ${toneClasses[item.tone]}`}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm opacity-90">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Doporuceni pro dnes</h2>
            <div className="mt-4 space-y-3">
              {recommendations.map((item) => (
                <div key={item.title} className={`rounded-2xl border px-4 py-3 ${toneClasses[item.tone]}`}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm opacity-90">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Co jednotlive hodnoty znamenaji</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(METRIC_HELP) as DashboardMetric[]).map((metric) => (
              <button key={metric} type="button" onClick={() => setOpenedMetricHelp(metric)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-cyan-300 hover:bg-cyan-50">
                <p className="text-sm font-semibold text-slate-900">{METRIC_HELP[metric].label}</p>
                <p className="mt-1 text-xs text-slate-600">{METRIC_HELP[metric].description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Nastaveni grafu</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Metrika</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(METRIC_CONFIG) as ChartMetric[]).map((metric) => (
                  <button key={metric} onClick={() => setSelectedMetric(metric)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedMetric === metric ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {METRIC_CONFIG[metric].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Typ grafu</p>
              <div className="flex gap-2">
                {(['line', 'bar'] as ChartStyle[]).map((style) => (
                  <button key={style} onClick={() => setChartStyle(style)} className={`rounded-lg px-3 py-2 text-sm font-medium uppercase transition ${chartStyle === style ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Casove okno</p>
              <div className="flex gap-2">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button key={option.label} onClick={() => setTimeRange(option.value)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${timeRange === option.value ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Chart title={`${selectedMetricConfig.title} (poslednich ${selectedTimeRangeLabel})`} data={chartData} type={chartStyle} dataKey={selectedMetric} color={selectedMetricConfig.color} unit={selectedMetricConfig.unit} height={380} />

        {openedMetricHelp && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-cyan-100 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{METRIC_HELP[openedMetricHelp].label}</h3>
                  <p className="text-sm text-slate-500">Jednotka: {METRIC_HELP[openedMetricHelp].unit}</p>
                </div>
                <button type="button" onClick={() => setOpenedMetricHelp(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  Zavrit
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Co to znamena:</span> {METRIC_HELP[openedMetricHelp].description}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Jak cist hodnotu:</span> {METRIC_HELP[openedMetricHelp].interpretation}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Aktualizace dat:</span> {METRIC_HELP[openedMetricHelp].updateInterval}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
