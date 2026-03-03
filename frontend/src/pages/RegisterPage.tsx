import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../utils/api'

export const RegisterPage = () => {
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canRegister, setCanRegister] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await apiClient.get('/auth/registration-status')
        setCanRegister(Boolean(data.canRegister))
      } catch {
        setCanRegister(true)
      }
    }

    loadData()
  }, [])

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canRegister) {
      setError('Kód je již vygenerovaný. Použijte přihlášení.')
      return
    }

    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await apiClient.post('/auth/register')

      if (response.data.accessCode) {
        setNewAccessCode(response.data.accessCode)
        setSuccess('Kód byl vytvořen. Uložte si ho, po opuštění stránky ho už neuvidíte.')
      } else {
        setSuccess('Kód byl připraven. Pokračujte na přihlášení.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Generování kódu selhalo. Zkuste to prosím znovu.')
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
          <h1 className="mb-3 text-2xl font-bold text-gray-900">Kód už existuje</h1>
          <p className="mb-6 text-gray-600">Přístupový kód už byl jednou vygenerován. Pokračujte na přihlášení.</p>
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
          <p className="mt-2 text-gray-600">Vygenerování přístupového kódu</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Kód se vygeneruje pouze jednou a bude se používat i pro další registrace/přihlášení.
          </div>

        <form onSubmit={handleGenerateCode} className="space-y-5">
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

          {newAccessCode && (
            <div className="rounded-xl border-4 border-red-500 bg-red-50 p-6">
              <p className="mb-3 text-center text-sm font-bold text-red-900">
                ⚠️ KRITICKÉ - PŘÍSTUPOVÝ KÓD ⚠️
              </p>
              <div className="mb-4 break-all rounded-lg border-2 border-red-500 bg-white px-4 py-4 text-center font-mono text-xl font-bold text-red-700">
                {newAccessCode}
              </div>
              
              <div className="mb-3 rounded-lg border border-yellow-400 bg-yellow-100 p-3">
                <p className="text-sm font-bold text-yellow-900">
                  🔒 ZKOPÍRUJTE SI TENTO KÓD IHNED!
                </p>
                <p className="mt-2 text-sm font-semibold text-yellow-900">
                  ⛔ POZOR: KÓD SE NEDÁ RESETOVAT!
                </p>
                <p className="mt-2 text-sm text-yellow-900">
                  Po opuštění stránky už ho neuvidíte. Toto je jediný přístupový kód pro celý systém.
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

          <button
            type="submit"
            disabled={isLoading || Boolean(newAccessCode)}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Generuji kód...' : 'Vygenerovat přístupový kód'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Už máte kód?{' '}
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
