import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import useDashboardStore from '../hooks/useDashboardStore'
import { apiClient } from '../utils/api'

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

interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  mode: 'auto' | 'manual'
  source: 'HA import' | 'HA settings' | 'Portal'
  lastRun: string
}

interface MetricConfig {
  label: string
  title: string
  unit: string
  color: string
}

const METRIC_CONFIG: Record<ChartMetric, MetricConfig> = {
  power: { label: 'Vykon', title: 'Aktualni vykon', unit: 'W', color: '#3b82f6' },
  energy: { label: 'Energie', title: 'Vyrobena energie', unit: 'kWh', color: '#10b981' },
  battery: { label: 'Baterie', title: 'Stav baterie', unit: '%', color: '#f59e0b' },
  gridImport: { label: 'Odber ze site', title: 'Nakoupena energie', unit: 'kWh', color: '#ef4444' },
  solarProduction: { label: 'FVE', title: 'Vyrobena energie', unit: 'kWh', color: '#22c55e' },
  selfConsumptionPercent: { label: 'Vlastni spotreba', title: 'Vyuziti FVE', unit: '%', color: '#0ea5e9' },
}

const METRIC_HELP: Record<DashboardMetric, MetricHelp> = {
  power: {
    label: 'Aktualni vykon',
    unit: 'W',
    description: 'Okamzity elektricky vykon cele instalace v tomto momentu.',
    interpretation: 'Vyssi cislo znamena vyssi okamzitou vyrobu nebo odber.',
    updateInterval: 'Kazdych 5-10 sekund podle dostupnosti dat.',
  },
  energy: {
    label: 'Energie dnes',
    unit: 'kWh',
    description: 'Soucet energie vyrobene od pulnoci.',
    interpretation: 'Roste behem dne; vecer se ustali.',
    updateInterval: 'Prubezne behem dne.',
  },
  battery: {
    label: 'Stav baterie',
    unit: '%',
    description: 'Aktualni uroven nabiti akumulatoru.',
    interpretation: 'Nad 80 % vysoka rezerva, pod 20 % nizka rezerva.',
    updateInterval: 'Kazdych 5-10 sekund.',
  },
  solarProduction: {
    label: 'Vyrobena energie',
    unit: 'kWh',
    description: 'Celkove mnozstvi energie z fotovoltaiky.',
    interpretation: 'Pomaha porovnat vykon mezi dny a tydny.',
    updateInterval: 'Prubezne behem dne.',
  },
  gridImport: {
    label: 'Nakoupena energie',
    unit: 'kWh',
    description: 'Energie odebrana ze site pri nedostatku vlastni vyroby.',
    interpretation: 'Nizsi hodnota obvykle znamena lepsi sobestacnost.',
    updateInterval: 'Prubezne behem dne.',
  },
  selfConsumptionPercent: {
    label: 'Vyuziti FVE',
    unit: '%',
    description: 'Podil vlastni spotreby z vyrobene solarni energie.',
    interpretation: 'Vyssi procento znamena efektivnejsi vyuziti vyroby doma.',
    updateInterval: 'Prubezne behem dne.',
  },
  temperature: {
    label: 'Teplota',
    unit: 'degC',
    description: 'Teplota merena na zarizeni nebo v technicke casti systemu.',
    interpretation: 'Pomaha odhalit prehrivani zarizeni.',
    updateInterval: 'Kazdych 10-30 sekund.',
  },
}

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 0.5, label: '30 min' },
  { value: 5, label: '5 h' },
  { value: 24, label: '24 h' },
  { value: 168, label: '7 dni' },
  { value: 720, label: '30 dni' },
]

const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'auto-water-heat',
    name: 'Ohrev vody pri prebytku',
    enabled: true,
    mode: 'auto',
    source: 'HA import',
    lastRun: 'Dnes 12:41',
  },
  {
    id: 'auto-ev-night',
    name: 'Nabijeni EV v noci',
    enabled: false,
    mode: 'auto',
    source: 'HA import',
    lastRun: 'Vcera 23:10',
  },
]

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

const normalizeAutomation = (item: Record<string, unknown>, index: number, source: AutomationRule['source']): AutomationRule => ({
  id: String(item.id ?? `${source}-${index + 1}`),
  name: String(item.name ?? item.alias ?? `Automatizace ${index + 1}`),
  enabled: Boolean(item.enabled ?? item.active ?? false),
  mode: item.mode === 'manual' ? 'manual' : 'auto',
  source,
  lastRun: String(item.lastRun ?? 'N/A'),
})

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
      solarProduction: number
      selfConsumptionPercent: number
    }>
  >([])
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('battery')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('line')
  const [timeRange, setTimeRange] = useState<TimeRange>(24)
  const [openedMetricHelp, setOpenedMetricHelp] = useState<DashboardMetric | null>(null)
  const [automations, setAutomations] = useState<AutomationRule[]>(DEFAULT_AUTOMATIONS)
  const [uploadNotice, setUploadNotice] = useState('')

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

    loadPairingCode()
    loadPairingStatus()
  }, [])

  useEffect(() => {
    if (store.isOnline) {
      setIsPaired(true)
    }
  }, [store.isOnline])

  useEffect(() => {
    const loadAutomationsFromHaSettings = async () => {
      try {
        const { data } = await apiClient.get('/agent/config')
        const items = Array.isArray(data?.config?.haAutomations) ? data.config.haAutomations : []
        if (items.length === 0) {
          return
        }

        const parsed = items
          .filter((item: unknown): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item: Record<string, unknown>, index: number) => normalizeAutomation(item, index, 'HA settings'))

        setAutomations(parsed)
        setUploadNotice('Automatizace nacteny z HA nastaveni add-onu.')
      } catch {
        // Keep defaults when backend config is unavailable.
      }
    }

    void loadAutomationsFromHaSettings()
  }, [])

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

    loadHistory()
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
    solarProduction: 0,
    selfConsumptionPercent: 0,
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
        solarProduction: 0,
        selfConsumptionPercent: 0,
      }

  const selectedMetricConfig = useMemo(() => METRIC_CONFIG[selectedMetric], [selectedMetric])
  const selectedTimeRangeLabel = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? '24 h',
    [timeRange],
  )
  const chartData = useMemo(
    () =>
      historyData.map((point) => ({
        ...point,
        time: formatTimeLabel(point.timestamp, timeRange, point.time),
      })),
    [historyData, timeRange],
  )

  const statusTone = store.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

  const handleAutomationUpload = async (file?: File) => {
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const now = new Date().toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
      const normalizedName = file.name.replace(/\.(json|ya?ml)$/i, '')

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text) as unknown
        const parsedList = Array.isArray(parsed) ? parsed : [parsed]
        const importedItems: AutomationRule[] = parsedList
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item, index) => ({
            ...normalizeAutomation(item, index, 'HA import'),
            id: String(item.id ?? `${normalizedName}-${index}`),
            lastRun: `Import ${now}`,
          }))

        if (importedItems.length === 0) {
          throw new Error('Soubor neobsahuje platnou automatizaci.')
        }

        setAutomations((prev) => [...importedItems, ...prev])
        setUploadNotice(`Importovano ${importedItems.length} automatizaci z ${file.name}.`)
        return
      }

      const inferredEnabled = /(initial_state:\s*true|state:\s*on|enabled:\s*true)/i.test(text)
      const yamlItem: AutomationRule = {
        id: `${normalizedName}-${Date.now()}`,
        name: normalizedName || 'Nova automatizace',
        enabled: inferredEnabled,
        mode: 'auto',
        source: 'HA import',
        lastRun: `Import ${now}`,
      }

      setAutomations((prev) => [yamlItem, ...prev])
      setUploadNotice(`Automatizace ${yamlItem.name} byla importovana ze souboru ${file.name}.`)
    } catch {
      setUploadNotice('Import se nepodaril. Pouzijte JSON nebo YAML export z Home Assistant.')
    }
  }

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((automation) =>
        automation.id === id
          ? {
              ...automation,
              enabled: !automation.enabled,
            }
          : automation,
      ),
    )
  }

  const switchAutomationMode = (id: string) => {
    setAutomations((prev) =>
      prev.map((automation) =>
        automation.id === id
          ? {
              ...automation,
              mode: automation.mode === 'auto' ? 'manual' : 'auto',
            }
          : automation,
      ),
    )
  }

  const runAutomationNow = (id: string) => {
    const now = new Date().toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    setAutomations((prev) =>
      prev.map((automation) =>
        automation.id === id
          ? {
              ...automation,
              lastRun: `Rucni spusteni ${now}`,
            }
          : automation,
      ),
    )
  }

  if (!isPaired) {
    return (
      <div className="min-h-screen bg-slate-50 pt-10">
        <div className="mx-auto max-w-2xl px-4">
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0%,_#ecfeff_36%,_#f8fafc_70%)] py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 rounded-2xl border border-cyan-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Solar Portal</p>
              <h1 className="text-3xl font-bold text-slate-900">Vitejte, {user?.fullName || 'Uzivatel'}</h1>
              <p className="text-slate-600">Vsechny klicove hodnoty i automatizace Home Assistantu na jednom miste.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Posledni synchronizace: {new Date(store.lastUpdate).toLocaleTimeString('cs-CZ')}
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${statusTone}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${store.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {store.isOnline ? 'Online' : 'Offline'}
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
            onClick={() => setOpenedMetricHelp('power')}
          />
          <MetricCard
            title="Energie dnes"
            value={Number(data.energy).toFixed(1)}
            unit="kWh"
            icon="📈"
            color="green"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('energy')}
          />
          <MetricCard
            title="Stav baterie"
            value={Math.round(data.battery)}
            unit="%"
            icon="🔋"
            color="blue"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('battery')}
          />
          <MetricCard
            title="Vyrobena energie"
            value={Number(data.solarProduction).toFixed(2)}
            unit="kWh"
            icon="☀️"
            color="green"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('solarProduction')}
          />
          <MetricCard
            title="Nakoupena energie"
            value={Number(data.gridImport).toFixed(2)}
            unit="kWh"
            icon="🏭"
            color="red"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('gridImport')}
          />
          <MetricCard
            title="Vyuziti FVE"
            value={Math.round(data.selfConsumptionPercent)}
            unit="%"
            icon="♻️"
            color="blue"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('selfConsumptionPercent')}
          />
          <MetricCard
            title="Teplota"
            value={Math.round(data.temperature)}
            unit="°C"
            icon="🌡️"
            color="red"
            subtitle="Kliknete pro popis veliciny"
            onClick={() => setOpenedMetricHelp('temperature')}
          />
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Co jednotlive hodnoty znamenaji</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(METRIC_HELP) as DashboardMetric[]).map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => setOpenedMetricHelp(metric)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-cyan-300 hover:bg-cyan-50"
              >
                <p className="text-sm font-semibold text-slate-900">{METRIC_HELP[metric].label}</p>
                <p className="mt-1 text-xs text-slate-600">{METRIC_HELP[metric].description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Automatizace</h2>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
              Nahrat automatizaci
              <input
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  void handleAutomationUpload(file)
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Automatizace vytvorite v Home Assistantu a zde je jen prehledne spravujete. Uzivatel vidi stav sepnuto / nesepnuto a muze prepinat rezim.
          </p>
          {uploadNotice && <p className="mb-4 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{uploadNotice}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-3 py-2">Nazev</th>
                  <th className="px-3 py-2">Stav</th>
                  <th className="px-3 py-2">Rezim</th>
                  <th className="px-3 py-2">Posledni spusteni</th>
                  <th className="px-3 py-2">Zdroj</th>
                  <th className="px-3 py-2">Akce</th>
                </tr>
              </thead>
              <tbody>
                {automations.map((automation) => (
                  <tr key={automation.id} className="rounded-xl bg-slate-50 text-slate-800">
                    <td className="rounded-l-xl px-3 py-3 font-semibold">{automation.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          automation.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {automation.enabled ? 'SEPNUTO' : 'NESEPNUTO'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => switchAutomationMode(automation.id)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {automation.mode === 'auto' ? 'Automaticky' : 'Rucne'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{automation.lastRun}</td>
                    <td className="px-3 py-3 text-slate-600">{automation.source}</td>
                    <td className="rounded-r-xl px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAutomation(automation.id)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          {automation.enabled ? 'Vypnout' : 'Zapnout'}
                        </button>
                        <button
                          type="button"
                          onClick={() => runAutomationNow(automation.id)}
                          className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800"
                        >
                          Spustit ted
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Nastaveni grafu</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Metrika</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(METRIC_CONFIG) as ChartMetric[]).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selectedMetric === metric
                        ? 'bg-cyan-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {METRIC_CONFIG[metric].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Typ grafu</p>
              <div className="flex gap-2">
                {(['line', 'bar'] as ChartStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setChartStyle(style)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium uppercase transition ${
                      chartStyle === style
                        ? 'bg-cyan-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Casove okno</p>
              <div className="flex gap-2">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setTimeRange(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      timeRange === option.value
                        ? 'bg-cyan-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Chart
          title={`${selectedMetricConfig.title} (poslednich ${selectedTimeRangeLabel})`}
          data={chartData}
          type={chartStyle}
          dataKey={selectedMetric}
          color={selectedMetricConfig.color}
          unit={selectedMetricConfig.unit}
          height={380}
        />

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Stav systemu</h2>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Stav menice</p>
              <p className="mt-1 font-semibold text-gray-900">{store.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Ucinnost</p>
              <p className="mt-1 font-semibold text-gray-900">{Number(data.efficiency).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Napeti</p>
              <p className="mt-1 font-semibold text-gray-900">{Math.round(data.voltage)}V</p>
            </div>
          </div>
        </div>

        {openedMetricHelp && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-cyan-100 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{METRIC_HELP[openedMetricHelp].label}</h3>
                  <p className="text-sm text-slate-500">Jednotka: {METRIC_HELP[openedMetricHelp].unit}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedMetricHelp(null)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
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
