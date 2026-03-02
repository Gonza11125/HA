import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuthStore'
import { apiClient } from '../utils/api'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [installationPassword, setInstallationPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [canRegister, setCanRegister] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

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
        email,
        password,
        installationPassword,
        rememberMe
      })

      // Set user in store
      setUser(data.user)

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">☀️ Solar Portál</h1>
          <p className="text-gray-600">Monitorování vaší solární instalace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
              {attemptsRemaining !== null && (
                <p className="text-xs mt-1">
                  Zbývá pokusů: {attemptsRemaining}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="installationPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Instalační heslo *
            </label>
            <input
              id="installationPassword"
              type="text"
              value={installationPassword}
              onChange={(e) => setInstallationPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
              placeholder="Vložte instalační heslo"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Instalační heslo bylo zobrazeno při první registraci
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mailová adresa
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="vas@email.cz"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Heslo k účtu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="••••••••"
              disabled={isLoading}
            />
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
            disabled={isLoading || !installationPassword}
            className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Přihlašování...' : 'Přihlášení'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Nemáte účet?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Zaregistrujte se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
