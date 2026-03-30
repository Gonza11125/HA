import { useState, useEffect } from 'react'
import { apiClient } from '../utils/api'

export interface DashboardStore {
  isOnline: boolean
  isLoading: boolean
  currentData: any
  error: string | null
  lastUpdate: string
}

export interface DashboardData {
  power: number
  energy: number
  battery: number
  inverterStatus: string
  lastUpdate: string
  voltage: number
  current: number
  efficiency: number
  temperature: number
  gridImport: number
  gridExport: number
  solarProduction: number
  homeConsumption: number
  selfConsumptionPercent: number
  hasGridImport: boolean
  hasGridExport: boolean
  hasHomeConsumption: boolean
}

export const useDashboardStore = () => {
  const [store, setStore] = useState<DashboardStore>({
    isOnline: false,
    isLoading: true,
    currentData: null,
    error: null,
    lastUpdate: new Date().toISOString()
  })

  // Check connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiClient.get('/data/status')
        setStore(prev => ({
          ...prev,
          isOnline: response.data.isConnected,
          isLoading: false
        }))
      } catch (error) {
        setStore(prev => ({
          ...prev,
          isOnline: false,
          error: 'Nepodařilo se připojit k serveru'
        }))
      }
    }

    checkStatus()
  }, [])

  // Setup real-time polling
  useEffect(() => {
    if (!store.isOnline) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiClient.get('/data/current')
        setStore(prev => ({
          ...prev,
          currentData: response.data,
          lastUpdate: new Date().toISOString(),
          error: null
        }))
      } catch (error) {
        setStore(prev => ({
          ...prev,
          error: 'Spojení se serverem bylo ztraceno'
        }))
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [store.isOnline])

  return store
}

export default useDashboardStore
