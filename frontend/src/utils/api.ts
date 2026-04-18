import axios from 'axios'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeConfiguredApiBaseUrl = (value: string) => {
  if (value.startsWith('/')) {
    return trimTrailingSlash(value)
  }

  return trimTrailingSlash(value)
}

const getApiBaseUrl = () => {
  const envValue = String((import.meta as any).env.VITE_API_BASE_URL || '').trim()
  if (envValue) {
    return normalizeConfiguredApiBaseUrl(envValue)
  }

  return '/api'
}

const API_BASE_URL = getApiBaseUrl()

const shouldRedirectToLogin = (error: any) => {
  if (error.response?.status !== 401 || typeof window === 'undefined') {
    return false
  }

  const requestUrl = String(error.config?.url || '')
  const ignoredAuthPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/me',
    '/auth/registration-status',
    '/auth/password-info'
  ]

  if (ignoredAuthPaths.some((path) => requestUrl.includes(path))) {
    return false
  }

  const currentPath = `${window.location.pathname}${window.location.hash}`
  if (currentPath.includes('/login')) {
    return false
  }

  return true
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldRedirectToLogin(error)) {
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
