import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PartnerAuthUser, Profile } from '@/types'

interface PartnerAuthStoreState {
  user: PartnerAuthUser | null
  profile: Profile | null
  selectedStoreId: string | null
  pendingEmail: string
  codeSent: boolean
  setUser: (user: PartnerAuthUser | null) => void
  setProfile: (profile: Profile | null) => void
  setSelectedStoreId: (id: string | null) => void
  setPendingEmail: (email: string) => void
  setCodeSent: (value: boolean) => void
  resetFlow: () => void
}

export const usePartnerAuthStore = create<PartnerAuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      selectedStoreId: null,
      pendingEmail: '',
      codeSent: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSelectedStoreId: (selectedStoreId) => set({ selectedStoreId }),
      setPendingEmail: (pendingEmail) => set({ pendingEmail }),
      setCodeSent: (codeSent) => set({ codeSent }),
      resetFlow: () => set({ pendingEmail: '', codeSent: false }),
    }),
    {
      name: 'partner-oh-auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        selectedStoreId: state.selectedStoreId,
        pendingEmail: state.pendingEmail,
        codeSent: state.codeSent,
      }),
    }
  )
)
