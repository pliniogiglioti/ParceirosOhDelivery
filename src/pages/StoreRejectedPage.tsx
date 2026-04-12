import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Clock3, LogOut, RefreshCcw } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { useMinimumLoading } from '@/hooks/useMinimumLoading'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoresByEmail, isStoreReapplicationBlocked } from '@/services/partner'
import type { PartnerStoreCard } from '@/types'

function formatDateTime(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRemainingTime(value: string | null) {
  if (!value) {
    return null
  }

  const diffMs = new Date(value).getTime() - Date.now()

  if (diffMs <= 0) {
    return 'agora'
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days > 0 && hours > 0) {
    return `${days}d ${hours}h`
  }

  if (days > 0) {
    return `${days}d`
  }

  return `${Math.max(totalHours, 1)}h`
}

export function StoreRejectedPage() {
  const navigate = useNavigate()
  const { user, selectedStoreId, selectStore, signOut } = usePartnerAuth()
  const [store, setStore] = useState<PartnerStoreCard | null>(null)
  const [loading, setLoading] = useState(true)
  const showLoading = useMinimumLoading(loading)

  useEffect(() => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    let isMounted = true

    void getStoresByEmail(user.email)
      .then((stores) => {
        if (!isMounted) {
          return
        }

        const rejectedStores = stores.filter((item) => item.registrationStatus === 'rejeitado')
        const selectedRejectedStore = rejectedStores.find((item) => item.id === selectedStoreId)
        const nextStore = selectedRejectedStore ?? rejectedStores[0] ?? null

        if (nextStore && nextStore.id !== selectedStoreId) {
          selectStore(nextStore.id)
        }

        setStore(nextStore)
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [user?.email, selectedStoreId, selectStore])

  const blocked = useMemo(() => (store ? isStoreReapplicationBlocked(store) : false), [store])
  const availableAtLabel = formatDateTime(store?.reapplyAvailableAt ?? null)
  const remainingLabel = formatRemainingTime(store?.reapplyAvailableAt ?? null)

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (showLoading) {
    return <LoadingScreen />
  }

  if (!store) {
    return <Navigate to="/lojas" replace />
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <header className="border-b border-[#ececec] bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-[1.4rem] font-black italic tracking-[-0.06em] text-[#ea1d2c]">
            ohdelivery
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#686868] transition hover:bg-[#f5f5f5]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-81px)] max-w-3xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-[32px] border border-[#ececec] bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fff1f2] text-[#ea1d2c]">
              <AlertCircle className="h-10 w-10" />
            </div>

            <p className="mt-6 text-[30px] font-bold leading-tight text-[#1d1d1d]">
              Seu cadastro nao foi aprovado
            </p>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#666]">
              Encontramos uma pendencia no cadastro da loja <span className="font-semibold text-[#1d1d1d]">{store.name}</span>.
              Tente novamente em 48 horas.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-[#f3d0d4] bg-[#fff7f8] p-6">
            <p className="text-[15px] font-bold text-[#1d1d1d]">Motivo informado</p>
            <p className="mt-3 text-[14px] leading-6 text-[#555]">
              {store.rejectionReason ?? 'Seu cadastro ainda nao atende aos criterios de aprovacao da plataforma.'}
            </p>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#ececec] bg-[#fafafa] p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ea1d2c]">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#1d1d1d]">
                  {blocked ? 'Novo cadastro bloqueado temporariamente' : 'Novo cadastro liberado'}
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#555]">
                  {blocked
                    ? `Voce podera cadastrar novamente depois que a janela de 48 horas terminar.`
                    : 'A janela de espera terminou. Se quiser, voce ja pode cadastrar a loja novamente.'}
                </p>
                {availableAtLabel ? (
                  <p className="mt-3 text-[13px] font-semibold text-[#ea1d2c]">
                    {blocked
                      ? `Disponivel em ${availableAtLabel}${remainingLabel ? ` (${remainingLabel})` : ''}`
                      : `Liberado desde ${availableAtLabel}`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/lojas')}
              className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-[#d9d9d9] px-6 text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5]"
            >
              Voltar para lojas
            </button>

            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              disabled={blocked}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] px-6 text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Cadastrar novamente
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
