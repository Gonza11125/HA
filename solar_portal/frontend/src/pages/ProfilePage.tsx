import { useState } from 'react'
import { useAuthStore } from '../hooks/useAuthStore'
import Header from '../components/Header'
import { apiClient } from '../utils/api'

export const ProfilePage = () => {
  const { user, logout } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await apiClient.post('/auth/logout')
    } catch {
    } finally {
      logout()
      window.location.assign('/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Access Settings</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                <p className="text-cyan-200 text-sm">
                  Tato instalace používá jeden trvalý přístupový kód. Přihlášení probíhá pouze tímto kódem — bez e-mailu a bez uživatelského hesla.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                <h2 className="text-lg font-semibold text-white">Jak se přihlašovat</h2>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Otevři přihlašovací stránku Solar Portalu.</li>
                  <li>Zadej stejný přístupový kód, který byl vytvořen při první aktivaci.</li>
                  <li>Volitelně zapni zapamatování přihlášení na 24 hodin.</li>
                </ol>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Session</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 rounded text-xs font-medium border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Role</span>
                    <span className="font-medium text-white">{user?.role || 'customer'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Identity</span>
                    <span className="font-medium text-white">Installation</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition font-medium text-sm border border-red-500/30 disabled:opacity-50"
                >
                  {loggingOut ? 'Odhlašuji…' : 'Odhlásit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
