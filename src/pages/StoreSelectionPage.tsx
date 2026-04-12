import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Clock, LogOut, Plus, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoresByEmail, isStoreReapplicationBlocked } from '@/services/partner'
import type { PartnerStoreCard, RegistrationStatus, UserRole } from '@/types'

const STATUS_CONFIG: Record<RegistrationStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente de aceitação', className: 'bg-[#fffbeb] text-[#d97706]' },
  aprovado: { label: 'Aprovada', className: 'bg-[#f0fdf4] text-[#16a34a]' },
  rejeitado: { label: 'Rejeitada', className: 'bg-[#fff1ee] text-[#ff3600]' },
}

const ROLE_LABELS: Record<UserRole, string> = {
  store_owner: 'Parceiro',
  customer: 'Comprador',
  delivery: 'Entregador',
}

const ROLE_COLORS: Record<UserRole, string> = {
  store_owner: 'bg-[#fff1ee] text-[#ff3600]',
  customer: 'bg-[#eff6ff] text-[#2563eb]',
  delivery: 'bg-[#f0fdf4] text-[#16a34a]',
}

export function StoreSelectionPage() {
  const navigate = useNavigate()
  const { user, profile, selectStore, signOut } = usePartnerAuth()
  const [stores, setStores] = useState<PartnerStoreCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return

    void getStoresByEmail(user.email)
      .then((result) => {
        setStores(result)

        if (result.length === 0) {
          navigate('/cadastro', { replace: true })
          return
        }

        if (result.length === 1 && result[0]?.registrationStatus === 'aprovado') {
          const singleStore = result[0]
          selectStore(singleStore.id)
          if (!singleStore.contract) {
            navigate('/contrato', { replace: true })
            return
          }
          if (!singleStore.firstAccess) {
            navigate('/primeiro-acesso', { replace: true })
            return
          }
          navigate('/app', { replace: true })
          return
        }

        if (result.length === 1 && result[0]?.registrationStatus === 'rejeitado') {
          selectStore(result[0].id)
          navigate('/cadastro-rejeitado', { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [user?.email, navigate, selectStore])

  const hasNoApprovedStore = !loading && stores.length > 0 && stores.every((s) => s.registrationStatus !== 'aprovado')
  const onlyOnePending = stores.length === 1 && stores[0]?.registrationStatus === 'pendente'
  const blockedRejectedStore = stores.find((store) => isStoreReapplicationBlocked(store)) ?? null

  function handleSelectStore(store: PartnerStoreCard) {
    if (store.registrationStatus === 'pendente') {
      toast.error('Sua loja ainda está em análise. Aguarde a aprovação.')
      return
    }
    if (store.registrationStatus === 'rejeitado') {
      selectStore(store.id)
      navigate('/cadastro-rejeitado')
      return
    }
    selectStore(store.id)
    if (!store.contract) {
      navigate('/contrato')
      return
    }
    if (!store.firstAccess) {
      navigate('/primeiro-acesso')
      return
    }
    navigate('/app')
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#ececec] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-[1.4rem] font-black italic tracking-[-0.06em] text-[#ff3600]">
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

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff3600] text-white font-bold text-lg">
              {(profile?.name ?? user?.name ?? 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#1d1d1d] text-[15px]">
                {profile?.name ?? user?.name ?? user?.email}
              </p>
              <p className="text-[12px] text-[#8b8b8b]">{user?.email}</p>
            </div>
          </div>

          {profile && profile.roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${ROLE_COLORS[role]}`}
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          )}
        </div>

        <h1 className="mb-4 text-[1.1rem] font-bold text-[#1d1d1d]">Suas lojas</h1>

        {onlyOnePending && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]" />
            <div>
              <p className="font-bold text-[#92400e] text-[14px]">Cadastro em análise</p>
              <p className="mt-0.5 text-[13px] text-[#b45309]">
                Sua loja foi enviada para avaliação. Assim que for aprovada pela nossa equipe, você poderá acessar o painel. Em geral o processo leva até 24 horas.
              </p>
            </div>
          </div>
        )}

        {!onlyOnePending && hasNoApprovedStore && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]" />
            <div>
              <p className="font-bold text-[#92400e] text-[14px]">Nenhuma loja aprovada ainda</p>
              <p className="mt-0.5 text-[13px] text-[#b45309]">
                Suas lojas estão aguardando avaliação ou foram rejeitadas. Cadastre uma nova loja ou aguarde a aprovação.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-[80px] animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => {
              const statusCfg = STATUS_CONFIG[store.registrationStatus]
              const isClickable = store.registrationStatus === 'aprovado'

              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleSelectStore(store)}
                  className={`flex w-full items-center gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm transition active:scale-[0.99] ${
                    isClickable ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-80'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f5] overflow-hidden">
                    {store.logoImageUrl ? (
                      <img
                        src={store.logoImageUrl}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-5 w-5 text-[#8b8b8b]" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <p className="font-bold text-[#1d1d1d] text-[15px]">{store.name}</p>
                    {store.categoryName && (
                      <p className="text-[12px] text-[#8b8b8b]">{store.categoryName}</p>
                    )}
                    {store.registrationStatus === 'rejeitado' && store.rejectionReason && (
                      <p className="text-[11px] text-[#ff3600] mt-0.5">{store.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                    {isClickable && <ChevronRight className="h-4 w-4 text-[#b3b3b3]" />}
                  </div>
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => {
                if (blockedRejectedStore) {
                  selectStore(blockedRejectedStore.id)
                  navigate('/cadastro-rejeitado')
                  return
                }

                navigate('/cadastro')
              }}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-[#d9d9d9] bg-white px-4 py-4 transition hover:border-[#ff3600] hover:bg-[#fff2ee] group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f5] group-hover:bg-[#fff1ee]">
                <Plus className="h-5 w-5 text-[#8b8b8b] group-hover:text-[#ff3600]" />
              </div>
              <p className="font-semibold text-[#686868] group-hover:text-[#ff3600] text-[15px]">
                Cadastrar nova loja
              </p>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
