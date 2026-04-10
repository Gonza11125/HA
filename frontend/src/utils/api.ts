import axios from 'axios'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getRuntimeApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000/api'
  }

  // Prefer same-origin API path so localhost and public domain behave consistently behind a proxy.
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

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
