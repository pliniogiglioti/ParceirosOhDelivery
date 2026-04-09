import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerAuthStore } from '@/hooks/usePartnerAuthStore'
import { simulationModeEnabled } from '@/lib/supabase'
import { getCurrentAuthUser, sendLoginCode, signOutAuth, verifyLoginCode } from '@/services/auth'
import type { PartnerAuthUser } from '@/types'

interface PartnerAuthState {
  user: PartnerAuthUser | null
  pendingEmail: string
  codeSent: boolean
  loading: boolean
  sending: boolean
  verifying: boolean
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function usePartnerAuth(): PartnerAuthState {
  const { user, pendingEmail, codeSent, setUser, setPendingEmail, setCodeSent, resetFlow } = usePartnerAuthStore()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let active = true

    async function hydrateAuth() {
      if (simulationModeEnabled) {
        if (active) {
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentAuthUser()

        if (!active) {
          return
        }

        setUser(currentUser)

        if (currentUser) {
          resetFlow()
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
  }, [resetFlow, setUser])

  async function handleSendCode(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    setSending(true)

    try {
      const result = await sendLoginCode(normalizedEmail)
      setPendingEmail(normalizedEmail)
      setCodeSent(true)

      if (result.mode === 'mock') {
        toast.success(`Codigo demo enviado: ${result.code}`)
      } else {
        toast.success('Codigo enviado para o seu email.')
      }
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
    pendingEmail,
    codeSent,
    loading,
    sending,
    verifying,
    sendCode: handleSendCode,
    verifyCode: handleVerifyCode,
    signOut: handleSignOut,
  }
}
