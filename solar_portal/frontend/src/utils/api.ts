import axios from 'axios'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getRuntimeApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000/api'
  }

  const cleanPath = window.location.pathname.replace(/\/+$/, '')

  if (window.location.port === '3000') {
    const host = window.location.hostname || 'localhost'
    return `http://${host}:5000/api`
  }

  // In ingress mode, keep the add-on prefix in the path.
  if (cleanPath && cleanPath !== '/') {
    return `${cleanPath}/api`
  }

  // Direct backend mode (same-origin root)
  return '/api'

}

const getApiBaseUrl = () => {
  const envValue = String((import.meta as any).env.VITE_API_BASE_URL || '').trim()
  if (!envValue) {
    return getRuntimeApiBaseUrl()
  }

  if (envValue.startsWith(':')) {
    if (typeof window === 'undefined') {
      return trimTrailingSlash(`http://localhost${envValue}`)
    }

    const host = window.location.hostname || 'localhost'
    return trimTrailingSlash(`http://${host}${envValue}`)
  }

  if (envValue.startsWith('/')) {
    return trimTrailingSlash(envValue)
  }

  return trimTrailingSlash(envValue)
}

const API_BASE_URL = getApiBaseUrl()

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Inject Authorization header from stored token on every request.
// This avoids relying on cookies which break over HTTP on cross-port/cross-origin setups.
apiClient.interceptors.request.use((config) => {
  // Dynamically import to avoid circular dependency at module load time
  const stored = sessionStorage.getItem('solar-portal-auth')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const token: string | null = parsed?.state?.token ?? null
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`)
      }
    } catch {
      // ignore malformed sessionStorage
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export default apiClient
