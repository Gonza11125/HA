import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../utils/api'

export const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasAccessCode, setHasAccessCode] = useState<boolean | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      setIsLoading(true)
      try {
        const { data } = await apiClient.get('/auth/registration-status')
        setHasAccessCode(Boolean(data?.hasAccessCode))
      } catch {
        setHasAccessCode(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadStatus()
  }, [])

  const canGenerate = useMemo(() => hasAccessCode === false && !generatedCode, [hasAccessCode, generatedCode])

  const generateCode = async () => {
    setError('')
    setIsGenerating(true)
    setCopied(false)

    try {
      const { data } = await apiClient.post('/auth/register')
      setGeneratedCode(data?.accessCode || null)
      setHasAccessCode(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Generování kódu selhalo.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyCode = async () => {
    if (!generatedCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-slate-200">Načítání aktivace…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-slate-950 p-8">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">Solar Portal</p>
          <h1 className="text-3xl font-semibold mb-2">První aktivace</h1>
          <p className="text-sm text-slate-400">Systém používá jeden trvalý přístupový kód</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {generatedCode ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Kód byl úspěšně vytvořen. Zobrazí se pouze jednou.
            </div>

            <div className="rounded-xl border-2 border-cyan-500/40 bg-slate-950 p-6 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-3">Přístupový kód</p>
              <p className="font-mono text-3xl tracking-[0.25em] text-cyan-300">{generatedCode}</p>
            </div>

            <button
              type="button"
              onClick={copyCode}
              className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium hover:border-cyan-400 hover:text-cyan-300 transition"
            >
              {copied ? 'Zkopírováno' : 'Kopírovat kód'}
            </button>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Ulož kód do správce hesel nebo na bezpečné místo. Bez něj se nepřihlásíš.
            </div>

            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-semibold py-3 hover:bg-cyan-400 transition"
            >
              Pokračovat na přihlášení
            </Link>
          </div>
        ) : hasAccessCode ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              Přístupový kód už je pro tuto instalaci vytvořen.
            </div>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-semibold py-3 hover:bg-cyan-400 transition"
            >
              Přejít na přihlášení
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              Kliknutím vytvoříš jediný přístupový kód pro celou instalaci.
            </div>

            <button
              type="button"
              onClick={generateCode}
              disabled={isGenerating || !canGenerate}
              className="w-full rounded-xl bg-cyan-500 text-slate-950 font-semibold py-3 hover:bg-cyan-400 transition disabled:opacity-50"
            >
              {isGenerating ? 'Generuji kód…' : 'Vygenerovat přístupový kód'}
            </button>

            <Link to="/login" className="block text-center text-sm text-slate-400 hover:text-slate-300">
              Už máš kód? Přihlásit se
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegisterPage
