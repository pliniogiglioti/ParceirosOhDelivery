import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PartnerAuthUser } from '@/types'

interface PartnerAuthStoreState {
  user: PartnerAuthUser | null
  pendingEmail: string
  codeSent: boolean
  setUser: (user: PartnerAuthUser | null) => void
  setPendingEmail: (email: string) => void
  setCodeSent: (value: boolean) => void
  resetFlow: () => void
}

export const usePartnerAuthStore = create<PartnerAuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      pendingEmail: '',
      codeSent: false,
      setUser: (user) => set({ user }),
      setPendingEmail: (pendingEmail) => set({ pendingEmail }),
      setCodeSent: (codeSent) => set({ codeSent }),
      resetFlow: () => set({ pendingEmail: '', codeSent: false }),
    }),
    {
      name: 'partner-oh-auth',
      partialize: (state) => ({
        user: state.user,
        pendingEmail: state.pendingEmail,
        codeSent: state.codeSent,
      }),
    }
  )
)
