import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuthStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'customer'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">Načítání...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
