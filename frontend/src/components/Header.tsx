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
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate("/dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-2xl">☀️</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Solar Portal</h1>
            <p className="text-xs text-gray-500">Home Assistant Integration</p>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            👤 Profile
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              ⚙️ Admin
            </button>
          )}
        </div>

        {/* Right Side - Status & User */}
        <div className="flex items-center gap-4">
          {/* Online Status Indicator */}
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isOnline
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
          </div>

          {/* User Info */}
          <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 sm:flex">
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{user?.fullName || "User"}</p>
              <p className="text-xs capitalize text-gray-500">{user?.role || "customer"}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
              {user?.fullName?.charAt(0) || "U"}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
