import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuthStore'
import { apiClient } from '../utils/api'

export const LoginPage = () => {
  const [accessCode, setAccessCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [canRegister, setCanRegister] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { setToken } = useAuthStore()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check registration status
        const { data: regData } = await apiClient.get('/auth/registration-status')
        setCanRegister(Boolean(regData.canRegister))
      } catch {
        setCanRegister(true)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data } = await apiClient.post('/auth/login', {
        accessCode,
        rememberMe
      })

      // Set user in store
      setUser(data.user)
      if (data.token) setToken(data.token)

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      const remaining = err.response?.data?.attemptsRemaining
      if (remaining !== undefined) {
        setAttemptsRemaining(remaining)
      }
      setError(err.response?.data?.error || 'Přihlášení selhalo. Zkuste znovu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-4xl shadow-lg">☀️</div>
          <h1 className="text-3xl font-bold text-gray-900">Solar Portal</h1>
          <p className="mt-2 text-gray-600">Přihlášení pomocí přístupového kódu</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                {attemptsRemaining !== null && <p className="mt-1 text-xs">Zbývá pokusů: {attemptsRemaining}</p>}
              </div>
            )}

          <div>
            <label htmlFor="accessCode" className="mb-2 block text-sm font-medium text-gray-700">
              Přístupový kód *
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm uppercase outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              placeholder="Např. AB12CD34"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Kód byl vygenerován při první registraci a používá se stále stejný.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Zůstat přihlášen (24 hodin)</span>
          </label>

            <button
              type="submit"
              disabled={isLoading || !accessCode}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </form>

          {canRegister ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Kód ještě není vygenerovaný?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
                  Vygenerovat kód
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Přístupový kód je aktivní. Přihlaste se kódem výše.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
