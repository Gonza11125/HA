import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import { apiClient } from '../utils/api'

export const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await apiClient.get('/data/status')
        setIsOnline(Boolean(data?.isConnected))
      } catch {
        setIsOnline(false)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">☀</div>
          <div>
            <h1 className="text-xl font-bold text-white">Solar Portal</h1>
            <p className="text-xs text-slate-400">Live Monitoring</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-300 hover:text-white font-medium transition flex items-center gap-2"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="text-slate-300 hover:text-white font-medium transition"
          >
            Access
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-slate-300 hover:text-white font-medium transition"
            >
              Admin
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isOnline ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            {isOnline ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-emerald-400 text-sm font-medium hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-400 text-sm font-medium hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-4 border-l border-slate-700 pl-6">
            <div className="text-sm text-right">
              <p className="font-medium text-white">Installation</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role || 'customer'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
              S
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition border border-red-500/30"
          >
            Odhlásit
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
