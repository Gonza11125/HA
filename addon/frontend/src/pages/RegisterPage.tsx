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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">Načítání...</div>
      </div>
    )
  }

  if (!canRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Registrace uzavřena</h1>
          <p className="text-gray-600 mb-6">Účet byl již vytvořen. Přihlaste se existujícím účtem.</p>
          <Link to="/login" className="inline-block bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition">
            Přejít na přihlášení
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">☀️ Solar Portál</h1>
          <p className="text-gray-600">Vytvořit nový účet</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
              {attemptsRemaining !== null && (
                <p className="text-xs mt-1">
                  Zbývá pokusů: {attemptsRemaining}
                </p>
              )}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              {success}
            </div>
          )}

          {newInstallationPassword && (
            <div className="bg-red-50 border-4 border-red-600 rounded-lg p-5">
              <p className="text-sm text-red-900 font-bold mb-3 text-center">
                ⚠️ KRITICKÉ - INSTALAČNÍ HESLO ⚠️
              </p>
              <div className="bg-white border-3 border-red-500 rounded px-4 py-4 font-mono text-xl text-center text-red-700 break-all font-bold mb-3">
                {newInstallationPassword}
              </div>
              
              <div className="bg-yellow-100 border border-yellow-400 rounded p-3 mb-3">
                <p className="text-sm text-yellow-900 font-bold">
                  🔒 ZKOPÍRUJTE SI TOTO HESLO IHNED!
                </p>
                <p className="text-sm text-yellow-900 mt-2 font-semibold">
                  ⛔ POZOR: HESLO SE NEDÁ RESETOVAT!
                </p>
                <p className="text-sm text-yellow-900 mt-2">
                  Po opuštění této stránky už ho nikdy neuvidíte. Toto je JEDINOU instalační heslo pro váš systém. Budete ho potřebovat pro přihlášení všech dalších uživatelů.
                </p>
                <p className="text-sm text-yellow-900 mt-2 font-bold">
                  Pokud heslo ztratíte, nebudete se moct přihlásit!
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-400 rounded p-3 mb-4">
                <p className="text-xs text-blue-900">
                  💡 Tip: Napište si heslo na papír a uschování do trezoru, nebo ji uložte do správce hesel (1Password, Bitwarden, atd.)
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition"
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
            className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Vytváření účtu...' : 'Vytvořit účet'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Máte již účet?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Přihlášení
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
