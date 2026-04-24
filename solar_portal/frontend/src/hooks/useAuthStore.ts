import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  fullName?: string
  role: 'customer' | 'admin'
}

interface AuthStore {
  user: User | null
  isSessionChecked: boolean
  setUser: (user: User | null) => void
  setSessionChecked: (checked: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isSessionChecked: false,
      setUser: (user) => set({ user }),
      setSessionChecked: (isSessionChecked) => set({ isSessionChecked }),
      logout: () => set({ user: null, isSessionChecked: true }),
    }),
    {
      name: 'solar-portal-auth',
      // Only persist user – isSessionChecked always starts false on page load
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
