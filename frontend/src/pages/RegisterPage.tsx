import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../utils/api'

export const RegisterPage = () => {
  const [newInstallationPassword, setNewInstallationPassword] = useState<string | null>(null)
  const [isFirstRegistration, setIsFirstRegistration] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    fullName: '',
    installationPassword: '',
    agreeToTerms: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canRegister, setCanRegister] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check registration status
        const { data } = await apiClient.get('/auth/registration-status')
        setCanRegister(Boolean(data.canRegister))
        
        // If no users registered yet, this will be first registration
        setIsFirstRegistration(data.usersCount === 0)
      } catch {
        // Fallback: keep registration available in development
        setCanRegister(true)
        setIsFirstRegistration(true)
      }
    }

    loadData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.currentTarget
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    if (!canRegister) {
      setError('Registrace je uzavřena. Použijte svůj existující účet.')
      setIsLoading(false)
      return
    }

    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    // Validation
    if (formData.password !== formData.passwordConfirm) {
      setError('Hesla se neshodují')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků')
      setIsLoading(false)
      return
    }

    if (!formData.agreeToTerms) {
      setError('Musíte souhlasit s podmínkami')
      setIsLoading(false)
      return
    }

    try {
      const response = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        installationPassword: formData.installationPassword
      })

      // If server returns installation password (first registration), save and display it
      if (response.data.installationPassword) {
        setNewInstallationPassword(response.data.installationPassword)
        setSuccess('Účet vytvořen! Níže vidíte instalační heslo - ZKOPÍRUJTE SI HO! Po opuštění stránky už ho neuvidíte.')
        // Don't redirect automatically when password is shown
      } else {
        setSuccess('Registrace/aktualizace účtu proběhla úspěšně! Nyní se přihlaste.')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registrace selhala. Zkuste to prosím znovu.')
      if (err.response?.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.response.data.attemptsRemaining)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (canRegister === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">Načítání...</div>
      </div>
    )
  }

  if (!canRegister) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-bold text-gray-900">Registrace uzavřena</h1>
          <p className="mb-6 text-gray-600">Účet byl již vytvořen. Přihlaste se existujícím účtem.</p>
          <Link to="/login" className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700">
            Přejít na přihlášení
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-4xl shadow-lg">☀️</div>
          <h1 className="text-3xl font-bold text-gray-900">Solar Portal</h1>
          <p className="mt-2 text-gray-600">Vytvořte si nový účet</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {attemptsRemaining !== null && <p className="mt-1 text-xs">Zbývá pokusů: {attemptsRemaining}</p>}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {newInstallationPassword && (
            <div className="rounded-xl border-4 border-red-500 bg-red-50 p-6">
              <p className="mb-3 text-center text-sm font-bold text-red-900">
                ⚠️ KRITICKÉ - INSTALAČNÍ HESLO ⚠️
              </p>
              <div className="mb-4 break-all rounded-lg border-2 border-red-500 bg-white px-4 py-4 text-center font-mono text-xl font-bold text-red-700">
                {newInstallationPassword}
              </div>
              
              <div className="mb-3 rounded-lg border border-yellow-400 bg-yellow-100 p-3">
                <p className="text-sm font-bold text-yellow-900">
                  🔒 ZKOPÍRUJTE SI TOTO HESLO IHNED!
                </p>
                <p className="mt-2 text-sm font-semibold text-yellow-900">
                  ⛔ POZOR: HESLO SE NEDÁ RESETOVAT!
                </p>
                <p className="mt-2 text-sm text-yellow-900">
                  Po opuštění této stránky už ho nikdy neuvidíte. Toto je JEDINOU instalační heslo pro váš systém.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                Pokračovat na přihlášení
              </button>
            </div>
          )}

          <div>
            <label htmlFor="installationPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {isFirstRegistration ? 'Instalační heslo (nechte prázdné - bude vygenerováno)' : 'Instalační heslo *'}
            </label>
            <input
              id="installationPassword"
              name="installationPassword"
              type="text"
              value={formData.installationPassword}
              onChange={handleChange}
              required={!isFirstRegistration}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-mono"
              placeholder={isFirstRegistration ? "Bude automaticky vygenerováno" : "Vložte instalační heslo"}
              disabled={isLoading || isFirstRegistration}
            />
            {isFirstRegistration && (
              <p className="text-xs text-gray-500 mt-1">
                Po registraci se vygeneruje instalační heslo pro zabezpečení systému.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Jméno
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              placeholder="Václav Novák"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mailová adresa
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              placeholder="vas@email.cz"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Heslo
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Nejméně 8 znaků</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Potvrzení hesla
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              required
              className="rounded border-gray-300"
              disabled={isLoading}
            />
            <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-600">
              Souhlasím s{' '}
              <button type="button" className="text-indigo-600 hover:text-indigo-700 font-medium">
                podmínkami
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Vytváření účtu...' : 'Vytvořit účet'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Máte již účet?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Přihlášení
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default RegisterPage
