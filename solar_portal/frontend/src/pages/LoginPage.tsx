import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuthStore'
import { apiClient } from '../utils/api'

export const LoginPage = () => {
  const [accessCode, setAccessCode] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [hasAccessCode, setHasAccessCode] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { data } = await apiClient.get('/auth/registration-status')
        setHasAccessCode(Boolean(data?.hasAccessCode))
      } catch {
        setHasAccessCode(false)
      }
    }

    loadStatus()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setAttemptsRemaining(null)
    setIsLoading(true)

    try {
      const { data } = await apiClient.post('/auth/login', {
        accessCode,
        rememberMe,
      })

      setUser(data.user)
      navigate('/dashboard')
    } catch (err: any) {
      const remaining = err?.response?.data?.attemptsRemaining
      if (remaining !== undefined) {
        setAttemptsRemaining(remaining)
      }
      setError(err?.response?.data?.error || 'Přihlášení selhalo. Zkuste to znovu.')
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAccessCode === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-slate-200">Načítání…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-slate-950 p-8">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">Solar Portal</p>
          <h1 className="text-3xl font-semibold mb-2">Secure Access</h1>
          <p className="text-sm text-slate-400">Přihlášení jedním trvalým kódem instalace</p>
        </div>

        {!hasAccessCode ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Přístupový kód ještě není vytvořen. Nejdřív dokončete první aktivaci.
            <div className="mt-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-amber-400 text-slate-900 px-4 py-2 font-semibold hover:bg-amber-300 transition"
              >
                Vytvořit první kód
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
                {attemptsRemaining !== null && (
                  <p className="text-xs mt-1 text-rose-300">Zbývající pokusy: {attemptsRemaining}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-slate-200 mb-2">
                Přístupový kód
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base tracking-[0.18em] uppercase font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="AB12CD34"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-slate-500">Použij stejný kód při každém přihlášení.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              Zapamatovat přihlášení (24 hodin)
            </label>

            <button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="w-full rounded-xl bg-cyan-500 text-slate-950 font-semibold py-3 hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Přihlašování…' : 'Přihlásit'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-slate-500">
          Potřebuješ první nastavení?{' '}
          <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Aktivace systému
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
