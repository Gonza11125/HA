import { useState, useEffect } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import useDashboardStore from '../hooks/useDashboardStore'
import { apiClient } from '../utils/api'

type ChartTab = 'power' | 'energy' | 'battery' | 'all'

export const DashboardPage = () => {
  const { user } = useAuthStore()
  const store = useDashboardStore()
  const [isPaired, setIsPaired] = useState(false)
  const [pairingCode, setPairingCode] = useState('150N6E')
  const [isPairing, setIsPairing] = useState(false)
  const [historyData, setHistoryData] = useState<Array<{ time: string; power: number; energy: number; battery: number }>>([])
  const [activeTab, setActiveTab] = useState<ChartTab>('power')

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔗</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Setup Solar Portal</h1>
            <p className="text-gray-600 text-lg">Propojte Home Assistant a spusťte živý monitoring</p>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-2xl shadow-lg p-8 mb-6">
            <p className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wide">Párovací kód</p>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-1 rounded-xl mb-6">
              <div className="bg-white rounded-lg p-4">
                <p className="text-5xl tracking-[0.3em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center">{pairingCode}</p>
              </div>
            </div>
            <ol className="text-sm text-gray-700 space-y-3 mb-8 bg-gray-50 p-4 rounded-xl">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Otevřete Home Assistant → Integrations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Přidejte Solar Portal integraci</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Zadejte párovací kód</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>Potvrďte propojení</span>
              </li>
            </ol>
            <button
              onClick={handlePair}
              disabled={isPairing}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {isPairing ? '🔄 Připojuji…' : '✓ Mám vložený kód v Home Assistant'}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-8">
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.fullName || 'User'}</h1>
            <p className="text-gray-600 text-lg">Přehled výkonu vaší solární instalace v reálném čase</p>
          </div>
          <div className={`px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm inline-flex items-center gap-2 ${
            store.isOnline 
              ? 'bg-green-100 text-green-700 border-2 border-green-300' 
              : 'bg-red-100 text-red-700 border-2 border-red-300'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${store.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
            {store.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard title="Current Power" value={Math.round(data.power)} unit="W" icon="⚡" color="yellow" />
          <MetricCard title="Energy Today" value={Number(data.energy).toFixed(1)} unit="kWh" icon="📈" color="green" />
          <MetricCard title="Battery Level" value={Math.round(data.battery)} unit="%" icon="🔋" color="blue" />
          <MetricCard title="Temperature" value={Math.round(data.temperature)} unit="°C" icon="🌡️" color="red" />
        </div>

        {/* Chart Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab('power')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'power'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              ⚡ Power
            </button>
            <button
              onClick={() => setActiveTab('energy')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'energy'
                  ? 'text-green-600 border-b-2 border-green-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📈 Energy
            </button>
            <button
              onClick={() => setActiveTab('battery')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'battery'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🔋 Battery
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📊 All Metrics
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'power' && (
              <Chart 
                title="Power Output" 
                data={lineData} 
                type="line" 
                dataKey="power"
                color="#eab308"
                unit="W"
              />
            )}
            {activeTab === 'energy' && (
              <Chart 
                title="Energy Production" 
                data={lineData} 
                type="line" 
                dataKey="energy"
                color="#10b981"
                unit="kWh"
              />
            )}
            {activeTab === 'battery' && (
              <Chart 
                title="Battery Level" 
                data={lineData} 
                type="line" 
                dataKey="battery"
                color="#f59e0b"
                unit="%"
              />
            )}
            {activeTab === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart 
                  title="Power" 
                  data={lineData} 
                  type="bar" 
                  dataKey="power"
                  color="#eab308"
                  unit="W"
                />
                <Chart 
                  title="Energy" 
                  data={lineData} 
                  type="bar" 
                  dataKey="energy"
                  color="#10b981"
                  unit="kWh"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <p className="text-gray-600 font-medium mb-2">Inverter Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${store.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <p className="font-bold text-gray-900 text-lg">{store.isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <p className="text-gray-600 font-medium mb-2">Efficiency</p>
              <p className="font-bold text-gray-900 text-2xl">{Number(data.efficiency).toFixed(1)}%</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
              <p className="text-gray-600 font-medium mb-2">Voltage</p>
              <p className="font-bold text-gray-900 text-2xl">{Math.round(data.voltage)}V</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
