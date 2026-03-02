import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { useAuthStore } from "../hooks/useAuthStore"

export const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [isOnline, setIsOnline] = useState(false)

  // Check backend connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/data/status")
        setIsOnline(response.ok)
      } catch (error) {
        setIsOnline(false)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10s
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="text-3xl"></div>
          <div>
            <h1 className="text-xl font-bold text-white">Solar Portal</h1>
            <p className="text-xs text-slate-400">Home Assistant Integration</p>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-slate-300 hover:text-white font-medium transition flex items-center gap-2"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="text-slate-300 hover:text-white font-medium transition"
          >
            Profile
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="text-slate-300 hover:text-white font-medium transition"
            >
              Admin
            </button>
          )}
        </div>

        {/* Right Side - Status & User */}
        <div className="flex items-center gap-6">
          {/* Online Status Indicator */}
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

          {/* User Info */}
          <div className="hidden sm:flex items-center gap-4 border-l border-slate-700 pl-6">
            <div className="text-sm text-right">
              <p className="font-medium text-white">{user?.fullName || "User"}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role || "customer"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
              {user?.fullName?.charAt(0) || "U"}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition border border-red-500/30"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
