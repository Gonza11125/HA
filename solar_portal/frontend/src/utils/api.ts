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

// 401 responses are handled by ProtectedRoute + useAuthStore (App.tsx /me check).
// No redirect here – an aggressive global redirect was the root cause of being
// kicked to login when navigating to the Automation page.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export default apiClient
