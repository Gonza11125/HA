import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import useDashboardStore from '../hooks/useDashboardStore'
import { apiClient } from '../utils/api'

type ChartMetric = 'power' | 'energy' | 'battery'
type ChartStyle = 'line' | 'bar'
type TimeRange = 0.5 | 5 | 24 | 168

interface MetricConfig {
  label: string
  title: string
  unit: string
  color: string
}

const METRIC_CONFIG: Record<ChartMetric, MetricConfig> = {
  power: { label: 'Power', title: 'Power Output', unit: 'W', color: '#3b82f6' },
  energy: { label: 'Energy', title: 'Energy Production', unit: 'kWh', color: '#10b981' },
  battery: { label: 'Battery', title: 'Battery Level', unit: '%', color: '#f59e0b' },
}

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 0.5, label: '30 min' },
  { value: 5, label: '5 h' },
  { value: 24, label: '24 h' },
  { value: 168, label: '1 týden' },
]

export const DashboardPage = () => {
  const { user } = useAuthStore()
  const store = useDashboardStore()

  const [isPaired, setIsPaired] = useState(false)
  const [pairingCode, setPairingCode] = useState('150N6E')
  const [isPairing, setIsPairing] = useState(false)

  const [historyData, setHistoryData] = useState<Array<{ time: string; power: number; energy: number; battery: number }>>([])
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('battery')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('line')
  const [timeRange, setTimeRange] = useState<TimeRange>(24)

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
      }

  const selectedMetricConfig = useMemo(() => METRIC_CONFIG[selectedMetric], [selectedMetric])
  const selectedTimeRangeLabel = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? '24 h',
    [timeRange],
  )

  if (!isPaired) {
    return (
      <div className="min-h-screen bg-slate-50 pt-10">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Setup Solar Portal</h1>
            <p className="text-gray-600">Propojte Home Assistant a spusťte živý monitoring.</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm text-gray-500">Párovací kód</p>
            <p className="mb-4 text-4xl font-bold tracking-widest text-blue-600">{pairingCode}</p>
            <ol className="mb-6 space-y-2 text-sm text-gray-700">
              <li>1. Otevřete Home Assistant → Integrations</li>
              <li>2. Přidejte Solar Portal integraci</li>
              <li>3. Zadejte párovací kód</li>
              <li>4. Potvrďte propojení</li>
            </ol>
            <button
              onClick={handlePair}
              disabled={isPairing}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPairing ? 'Připojuji…' : 'Mám vložený kód v Home Assistant'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.fullName || 'User'}</h1>
            <p className="text-gray-600">Přehled výkonu vaší solární instalace.</p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              store.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${store.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {store.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Current Power" value={Math.round(data.power)} unit="W" icon="⚡" color="yellow" />
          <MetricCard title="Energy Today" value={Number(data.energy).toFixed(1)} unit="kWh" icon="📈" color="green" />
          <MetricCard title="Battery Level" value={Math.round(data.battery)} unit="%" icon="🔋" color="blue" />
          <MetricCard title="Temperature" value={Math.round(data.temperature)} unit="°C" icon="🌡️" color="red" />
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Chart Settings</h2>
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
                        ? 'bg-blue-600 text-white'
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-600">Časové okno</p>
              <div className="flex gap-2">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setTimeRange(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      timeRange === option.value
                        ? 'bg-blue-600 text-white'
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
          title={`${selectedMetricConfig.title} (posledních ${selectedTimeRangeLabel})`}
          data={historyData}
          type={chartStyle}
          dataKey={selectedMetric}
          color={selectedMetricConfig.color}
          unit={selectedMetricConfig.unit}
          height={380}
        />

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">System Health</h2>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Inverter Status</p>
              <p className="mt-1 font-semibold text-gray-900">{store.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Efficiency</p>
              <p className="mt-1 font-semibold text-gray-900">{Number(data.efficiency).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-gray-500">Voltage</p>
              <p className="mt-1 font-semibold text-gray-900">{Math.round(data.voltage)}V</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
