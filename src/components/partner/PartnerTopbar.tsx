import { Bell, ChevronDown, HelpCircle, MessageCircle, Store } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoresByEmail } from '@/services/partner'
import type { PartnerDashboardData, PartnerStoreCard } from '@/types'

export function PartnerTopbar({ data }: { data: PartnerDashboardData }) {
  const [open, setOpen] = useState(false)
  const [stores, setStores] = useState<PartnerStoreCard[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, selectStore } = usePartnerAuth()

  useEffect(() => {
    if (!user?.email) return
    void getStoresByEmail(user.email).then(setStores)
  }, [user?.email])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function handleSelectStore(store: PartnerStoreCard) {
    if (store.registrationStatus !== 'aprovado') return
    selectStore(store.id)
    navigate(!store.contract ? '/contrato' : !store.firstAccess ? '/primeiro-acesso' : '/app')
    setOpen(false)
  }

  const currentStoreName = data.store.name

  return (
    <div className="panel-card sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 px-4 py-2.5">
      {/* Store selector */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white"
          >
            {currentStoreName.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[180px] truncate">{currentStoreName}</span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        <div
          className={`store-selector-dropdown panel-card absolute left-0 top-[calc(100%+8px)] z-40 w-64 overflow-hidden py-1 ${open ? 'store-selector-dropdown-open' : 'store-selector-dropdown-closed'}`}
          aria-hidden={!open}
        >
          {stores.map((store) => {
            const isCurrent = store.id === data.store.id
            const isApproved = store.registrationStatus === 'aprovado'
            return (
              <button
                key={store.id}
                type="button"
                disabled={!isApproved}
                onClick={() => handleSelectStore(store)}
                className={[
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition',
                  isApproved ? 'hover:bg-ink-50 cursor-pointer' : 'cursor-default opacity-50',
                ].join(' ')}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#ff3600' }}
                >
                  {store.logoImageUrl ? (
                    <img src={store.logoImageUrl} alt={store.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Store className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{store.name}</p>
                  {!isApproved && (
                    <p className="text-[10px] text-amber-600 capitalize">{store.registrationStatus}</p>
                  )}
                </div>
                {isCurrent && <span className="h-2 w-2 rounded-full bg-coral-500" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <a
          href="/ajuda"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
          aria-label="Ajuda"
          title="Central de Ajuda"
        >
          <HelpCircle className="h-5 w-5" />
        </a>

        <button
          type="button"
          onClick={() => navigate('/app/mensagens')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
          aria-label="Mensagens"
          title="Mensagens"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-coral-500" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/notificacoes')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
          aria-label="Notificacoes"
          title="Notificacoes"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-coral-500" />
        </button>
      </div>
    </div>
  )
}
