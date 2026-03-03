import { useState, useEffect } from 'react'
import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import Header from '../components/Header'
import useDashboardStore from '../hooks/useDashboardStore'
import { apiClient } from '../utils/api'

export const DashboardPage = () => {
  const store = useDashboardStore()
  const [isPaired, setIsPaired] = useState(false)
  const [pairingCode, setPairingCode] = useState('150N6E')
  const [isPairing, setIsPairing] = useState(false)
  const [historyData, setHistoryData] = useState<Array<{ time: string; power: number; energy: number; battery: number }>>([])

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
        if (data?.isPaired) {
          setIsPaired(true)
        }
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
        const { data } = await apiClient.get('/data/history?hours=6')
        setHistoryData(Array.isArray(data) ? data : [])
      } catch {
        setHistoryData([])
      }
    }

    loadHistory()
    const interval = setInterval(loadHistory, 10000)
    return () => clearInterval(interval)
  }, [isPaired, store.isOnline])

  const handlePair = () => {
    setIsPairing(true)
    apiClient
      .post('/agent/pair', { pairingCode })
      .then(() => {
        setIsPaired(true)
      })
      .finally(() => {
        setIsPairing(false)
      })
  }

  if (!isPaired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <div className="max-w-2xl mx-auto px-4 pt-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Setup Solar Portal</h1>
            <p className="text-slate-400">Propojte Home Assistant a spusťte živý monitoring.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <p className="text-sm text-slate-400 mb-2">Párovací kód</p>
            <p className="text-4xl tracking-widest font-bold text-cyan-300 mb-4">{pairingCode}</p>
            <ol className="text-sm text-slate-300 space-y-2 mb-6">
              <li>1. Otevřete Home Assistant → Integrations</li>
              <li>2. Přidejte Solar Portal integraci</li>
              <li>3. Zadejte párovací kód</li>
              <li>4. Potvrďte propojení</li>
            </ol>
            <button
              onClick={handlePair}
              disabled={isPairing}
              className="w-full py-3 rounded-lg bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 disabled:opacity-60"
            >
              {isPairing ? 'Připojuji…' : 'Mám vložený kód v Home Assistant'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const liveData = store.currentData || {
    power: 0,
    energy: 0,
    battery: 0,
    temperature: 0,
    efficiency: 0,
    voltage: 0
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

  const lineData = historyData
  const barData = historyData.slice(-12)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Vítej v Solar Portalu</h1>
            <p className="text-slate-400">Přehled výkonu vaší solární instalace.</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${store.isOnline ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}`}>
            {store.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard title="Current Power" value={Math.round(data.power)} unit="W" icon="⚡" color="yellow" />
          <MetricCard title="Energy Today" value={Number(data.energy).toFixed(1)} unit="kWh" icon="📈" color="green" />
          <MetricCard title="Battery Level" value={Math.round(data.battery)} unit="%" icon="🔋" color="blue" />
          <MetricCard title="Temperature" value={Math.round(data.temperature)} unit="°C" icon="🌡️" color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Chart title="Power / Energy / Battery (last 6h)" data={lineData} type="line" />
          <Chart title="Recent Intervals" data={barData} type="bar" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-slate-400">Inverter Status</p>
              <p className="font-semibold text-white mt-1">{store.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-slate-400">Efficiency</p>
              <p className="font-semibold text-white mt-1">{Number(data.efficiency).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-slate-400">Voltage</p>
              <p className="font-semibold text-white mt-1">{Math.round(data.voltage)}V</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
