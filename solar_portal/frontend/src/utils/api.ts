import axios from 'axios'

// Use dynamic API URL based on current hostname (for Home Assistant add-on)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return `http://${hostname}:5000/api`
  }
  return 'http://localhost:5000/api'
}

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || getApiBaseUrl()

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
    const status = error?.response?.status
    const url = String(error?.config?.url || '')
    const isAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/registration-status') ||
      url.includes('/auth/me')

    if (status === 401 && !isAuthCall && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default apiClient
