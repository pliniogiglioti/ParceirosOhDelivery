import { Bell, ChevronDown, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PartnerDashboardData } from '@/types'

const SIMULATED_STORES = [
  { id: '1', name: 'Oh! Burger Centro',  initial: 'B', color: '#EA1D2C' },
  { id: '2', name: 'Oh! Pizza Paulista', initial: 'P', color: '#f97316' },
  { id: '3', name: 'Oh! Sushi Jardins',  initial: 'S', color: '#14c8bb' },
]

const ALL_ID = 'all'

function SingleAvatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  )
}

function StackedAvatars() {
  return (
    <span className="flex items-center">
      {SIMULATED_STORES.map((s, i) => (
        <span
          key={s.id}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
          style={{
            backgroundColor: s.color,
            marginLeft: i === 0 ? 0 : -8,
            zIndex: SIMULATED_STORES.length - i,
          }}
        >
          {s.initial}
        </span>
      ))}
    </span>
  )
}

export function PartnerTopbar({ data }: { data: PartnerDashboardData }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(ALL_ID)
  const ref = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()
  const isAll = selectedId === ALL_ID
  const selected = SIMULATED_STORES.find((s) => s.id === selectedId)
  const label = isAll ? 'Todas as lojas' : (selected?.name ?? 'Todas as lojas')

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div className="panel-card sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 px-4 py-2.5">
      {/* Store selector */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
        >
          {isAll ? (
            <StackedAvatars />
          ) : (
            <SingleAvatar initial={selected!.initial} color={selected!.color} />
          )}
          <span className="max-w-[180px] truncate">{label}</span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        <div
          className={`store-selector-dropdown panel-card absolute left-0 top-[calc(100%+8px)] z-40 w-64 overflow-hidden py-1 ${open ? 'store-selector-dropdown-open' : 'store-selector-dropdown-closed'}`}
          aria-hidden={!open}
        >
          {/* Todas */}
          <button
            type="button"
            onClick={() => { setSelectedId(ALL_ID); setOpen(false) }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-ink-50"
          >
            <StackedAvatars />
            <span className="flex-1 truncate font-medium text-ink-900">Todas as lojas</span>
            {isAll && <span className="h-2 w-2 rounded-full bg-coral-500" />}
          </button>

          <div className="mx-3 my-1 border-t border-ink-100" />

          {SIMULATED_STORES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelectedId(s.id); setOpen(false) }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-ink-50"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.initial}
              </span>
              <span className="flex-1 truncate font-medium text-ink-900">{s.name}</span>
              {s.id === selectedId && <span className="h-2 w-2 rounded-full bg-coral-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
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
