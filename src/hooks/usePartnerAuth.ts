import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerAuthStore } from '@/hooks/usePartnerAuthStore'
import { getCurrentAuthUser, sendLoginCode, signOutAuth, verifyLoginCode } from '@/services/auth'
import { getOrCreateProfile } from '@/services/profile'
import type { PartnerAuthUser, Profile } from '@/types'

interface PartnerAuthState {
  user: PartnerAuthUser | null
  profile: Profile | null
  selectedStoreId: string | null
  pendingEmail: string
  codeSent: boolean
  loading: boolean
  sending: boolean
  verifying: boolean
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  selectStore: (storeId: string) => void
}

function getErrorMessage(error: unknown, defaultMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return defaultMessage
}

export function usePartnerAuth(): PartnerAuthState {
  const {
    user,
    profile,
    selectedStoreId,
    pendingEmail,
    codeSent,
    setUser,
    setProfile,
    setSelectedStoreId,
    setPendingEmail,
    setCodeSent,
    resetFlow,
  } = usePartnerAuthStore()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let active = true

    async function hydrateAuth() {
      try {
        const currentUser = await getCurrentAuthUser()

        if (!active) return

        setUser(currentUser)

        if (currentUser) {
          resetFlow()
          const userProfile = await getOrCreateProfile(currentUser.id, currentUser.email, currentUser.name)
          if (active) setProfile(userProfile)
        }
      } catch (error) {
        if (active) {
          toast.error(getErrorMessage(error, 'Nao foi possivel carregar a sessao atual.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void hydrateAuth()

    return () => {
      active = false
    }
  }, [resetFlow, setUser, setProfile])

  async function handleSendCode(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    setSending(true)

    try {
      await sendLoginCode(normalizedEmail)
      setPendingEmail(normalizedEmail)
      setCodeSent(true)
      toast.success('Codigo enviado para o seu email.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel enviar o codigo.'))
    } finally {
      setSending(false)
    }
  }

  async function handleVerifyCode(email: string, code: string) {
    setVerifying(true)

    try {
      const userData = await verifyLoginCode(email.trim().toLowerCase(), code.trim())
      setUser(userData)
      resetFlow()

      const userProfile = await getOrCreateProfile(userData.id, userData.email, userData.name)
      setProfile(userProfile)

      toast.success('Login realizado com sucesso.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel validar o codigo.'))
    } finally {
      setVerifying(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)

    try {
      await signOutAuth()
      setUser(null)
      setProfile(null)
      setSelectedStoreId(null)
      resetFlow()
      toast.success('Sessao encerrada com sucesso.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel encerrar a sessao.'))
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    profile,
    selectedStoreId,
    pendingEmail,
    codeSent,
    loading,
    sending,
    verifying,
    sendCode: handleSendCode,
    verifyCode: handleVerifyCode,
    signOut: handleSignOut,
    selectStore: setSelectedStoreId,
  }
}
