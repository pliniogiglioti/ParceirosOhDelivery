import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  DollarSign,
  Headphones,
  House,
  LayoutGrid,
  LogOut,
  MapPinned,
  Megaphone,
  Settings,
  Star,
  Store,
  User,
  WalletCards,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import type { PartnerDashboardData, PartnerSection } from '@/types'
import { SidebarLabel } from '@/components/partner/PartnerUi'

const navItems: Array<{ id: PartnerSection; label: string; icon: LucideIcon; to: string }> = [
  { id: 'inicio', label: 'Inicio', icon: House, to: '/app' },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList, to: '/app/pedidos' },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, to: '/app/financeiro' },
  { id: 'cardapio', label: 'Cardapio', icon: LayoutGrid, to: '/app/cardapio' },
  { id: 'areas', label: 'Areas de entrega', icon: MapPinned, to: '/app/areas' },
  { id: 'logistica', label: 'Logistica', icon: Bike, to: '/app/logistica' },
  { id: 'horarios', label: 'Horarios', icon: Clock3, to: '/app/horarios' },
  { id: 'pagamentos', label: 'Formas de pagamento', icon: WalletCards, to: '/app/pagamentos' },
  { id: 'avaliacoes', label: 'Avaliacoes', icon: Star, to: '/app/avaliacoes' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, to: '/app/marketing' },
  { id: 'loja', label: 'Loja', icon: Store, to: '/app/loja' },
  { id: 'perfil', label: 'Perfil', icon: User, to: '/app/perfil' },
  { id: 'configuracoes', label: 'Configuracoes', icon: Settings, to: '/app/configuracoes' },
  { id: 'suporte', label: 'Suporte', icon: Headphones, to: '/app/suporte' },
]

function StoreStatusToggleCard({
  isOpen,
  onConfirmToggle,
  collapsed,
}: {
  isOpen: boolean
  onConfirmToggle: () => void
  collapsed: boolean
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const toneClass = isOpen ? 'bg-[#14c8bb] text-white' : 'bg-coral-500 text-white'
  const title = isOpen ? 'Loja Aberta' : 'Loja fechada'
  const subtitle = isOpen ? 'Gestor de pedidos aberto' : 'Gestor de pedidos fechado'
  const question = isOpen ? 'Deseja fechar a loja?' : 'Deseja abrir a loja?'
  const actionLabel = isOpen ? 'Fechar loja' : 'Abrir loja'

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setConfirmOpen(false)
      }
    }

    if (confirmOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [confirmOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setConfirmOpen((current) => !current)}
        className={cn(
          'w-full rounded-xl text-left shadow-soft transition hover:brightness-[0.98]',
          collapsed && 'flex justify-center',
          toneClass
        )}
        aria-label={isOpen ? 'Loja aberta' : 'Loja fechada'}
        title={isOpen ? 'Loja aberta' : 'Loja fechada'}
      >
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/18">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-white/12">
              <Store className="h-3.5 w-3.5" />
            </div>
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-5">{title}</p>
              <p className="text-[12px] leading-4 text-white/90">{subtitle}</p>
            </div>
          ) : null}

          {!collapsed ? (
            <ChevronDown
              className={cn('ml-auto mr-2 h-4 w-4 shrink-0 text-white/85 transition-transform', confirmOpen && 'rotate-180')}
            />
          ) : null}
        </div>
      </button>

      <div
        className={cn(
          'store-status-popover absolute left-0 right-0 top-[calc(100%+10px)] z-30 rounded-xl border border-ink-100 bg-white p-3 text-ink-900 shadow-float',
          confirmOpen ? 'store-status-popover-open' : 'store-status-popover-closed'
        )}
        aria-hidden={!confirmOpen}
      >
          <p className="text-sm font-bold text-ink-900">{question}</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            Isso altera o status exibido para o gestor de pedidos.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmToggle()
                setConfirmOpen(false)
              }}
              className={cn(
                'inline-flex flex-1 items-center justify-center rounded-2xl px-3 py-2 text-sm font-semibold text-white transition',
                isOpen ? 'bg-coral-500 hover:bg-coral-600' : 'bg-[#14c8bb] hover:brightness-95'
              )}
            >
              {actionLabel}
            </button>
          </div>
      </div>
    </div>
  )
}

export function PartnerSidebar({
  data,
  onSignOut,
  onToggleStoreStatus,
  collapsed,
  onToggleCollapsed,
  onNavigate,
  className,
}: {
  data: PartnerDashboardData
  source: 'supabase'
  onSignOut: () => void
  onToggleStoreStatus: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigate?: () => void
  className?: string
}) {
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const acceptOrdersCount = data.orders.filter((order) => order.status === 'aguardando').length

  useEffect(() => {
    if (!signOutModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSignOutModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [signOutModalOpen])

  return (
    <>
      <aside className={cn('panel-card sidebar-content flex h-full w-full flex-col overflow-hidden bg-white', className)}>
        <div className={cn('sidebar-content border-b border-ink-100 pb-4 pt-5', collapsed ? 'px-3' : 'px-4')}>
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <div className={cn('min-w-0', collapsed ? 'flex justify-center' : 'flex-1')}>
              <img
                src="/logo.png"
                alt="Oh Delivery"
                style={collapsed ? undefined : { width: '155px', height: 'auto' }}
                className={cn('object-contain', collapsed ? 'h-9 w-auto' : 'pl-3')}
              />
              {!collapsed ? <p className="pl-3 text-sm text-ink-500">{data.store.name}</p> : null}
            </div>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-50 text-ink-900 transition hover:bg-ink-100"
              aria-label={collapsed ? 'Expandir menu lateral' : 'Contrair menu lateral'}
              title={collapsed ? 'Expandir menu lateral' : 'Contrair menu lateral'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className={cn('sidebar-content space-y-3 py-4', collapsed ? 'px-3' : 'px-4')}>
          <StoreStatusToggleCard
            isOpen={data.store.isOpen}
            onConfirmToggle={onToggleStoreStatus}
            collapsed={collapsed}
          />
        </div>

        <nav className={cn('hide-scrollbar sidebar-content flex-1 space-y-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
          {navItems.map((item) => {
            const Icon = item.icon

            return [
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === '/app'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'sidebar-link w-full text-left',
                    collapsed && 'justify-center px-2',
                    !collapsed && 'gap-3',
                    isActive && 'sidebar-link-active'
                  )
                }
                aria-label={item.label}
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className="h-5 w-5" />
                      {item.id === 'pedidos' && acceptOrdersCount > 0 ? (
                        <span
                          className={cn(
                            'absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
                            isActive ? 'bg-coral-600' : 'bg-coral-500'
                          )}
                        >
                          {acceptOrdersCount}
                        </span>
                      ) : null}
                    </span>
                    <SidebarLabel collapsed={collapsed} className="whitespace-nowrap">
                      {item.label}
                    </SidebarLabel>
                  </>
                )}
              </NavLink>,
              item.id === 'suporte' ? (
                <div key={`suporte-signout-group`} className="pt-1">
                  <div className={cn('mb-1 border-t border-ink-100', collapsed ? 'mx-1' : 'mx-1')} />
                  <button
                    type="button"
                    onClick={() => setSignOutModalOpen(true)}
                    className={cn(
                      'sidebar-link w-full text-left text-ink-700 transition hover:bg-ink-50',
                      collapsed && 'justify-center px-2',
                      !collapsed && 'gap-3'
                    )}
                    aria-label="Sair"
                    title="Sair"
                  >
                    <LogOut className="h-5 w-5" />
                    <SidebarLabel collapsed={collapsed} className="whitespace-nowrap">
                      Sair
                    </SidebarLabel>
                  </button>
                </div>
              ) : null,
            ]
          })}
        </nav>

        <div className={cn('sidebar-content border-t border-ink-100 py-4', collapsed ? 'px-3' : 'px-4')}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-sm font-bold text-ink-700">
              {data.profile.name.slice(0, 1)}
            </div>
            <div
              className={cn(
                'sidebar-label min-w-0',
                collapsed ? 'sidebar-label-hidden' : 'sidebar-label-visible'
              )}
            >
              <p className="truncate text-sm font-semibold text-ink-900">{data.profile.name}</p>
              <p className="truncate text-xs text-ink-500">{data.profile.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <AnimatedModal
        open={signOutModalOpen}
        onClose={() => setSignOutModalOpen(false)}
        panelClassName="panel-card w-full max-w-md p-6"
        ariaLabelledby="signout-modal-title"
      >
        <p
          id="signout-modal-title"
          className="text-lg font-bold tracking-[-0.02em] text-ink-900"
        >
          Deseja realmente sair?
        </p>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Voce precisara entrar novamente para acessar o painel da loja.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setSignOutModalOpen(false)}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setSignOutModalOpen(false)
              onSignOut()
            }}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Sair
          </button>
        </div>
      </AnimatedModal>
    </>
  )
}
