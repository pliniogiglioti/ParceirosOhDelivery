import { Menu, X } from 'lucide-react'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { PartnerSidebar } from '@/components/partner/PartnerSidebar'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { usePartnerUiStore } from '@/hooks/usePartnerUiStore'
import { cn, isSameUtcDate } from '@/lib/utils'

export function PartnerLayout({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation()
  const { data, loading, error, source } = usePartnerDashboard(true)
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = usePartnerUiStore()
  const {
    storeOpen,
    storeByStoreId,
    storeHoursByStoreId,
    ordersByStoreId,
    setStoreOpen,
    hydrateStore,
    hydrateStoreOpen,
    hydrateStoreHours,
    hydrateOrders,
  } = usePartnerSimulationStore()

  useEffect(() => {
    if (data) {
      hydrateStore(data.store)
      hydrateStoreOpen(data.store.isOpen)
      hydrateStoreHours(data.store.id, data.hours)
      hydrateOrders(data.store.id, data.orders)
    }
  }, [
    data?.store,
    data?.store.id,
    data?.store.isOpen,
    data?.hours,
    data?.orders,
    hydrateOrders,
    hydrateStore,
    hydrateStoreHours,
    hydrateStoreOpen,
  ])

  if (loading || !data) {
    return <LoadingScreen />
  }

  const simulatedStore = storeByStoreId[data.store.id] ?? data.store
  const simulatedHours = storeHoursByStoreId[data.store.id] ?? data.hours
  const simulatedOrders = ordersByStoreId[data.store.id] ?? data.orders
  const today = new Date()
  const validOrders = simulatedOrders.filter((order) => order.status !== 'cancelado')
  const todayOrders = validOrders.filter((order) => isSameUtcDate(order.createdAt, today))
  const grossRevenue = todayOrders.reduce((total, order) => total + order.total, 0)
  const pendingOrders = simulatedOrders.filter((order) =>
    ['aguardando', 'confirmado', 'preparo'].includes(order.status)
  ).length

  const displayData = {
    ...data,
    store: {
      ...simulatedStore,
      isOpen: storeOpen ?? simulatedStore.isOpen,
    },
    hours: simulatedHours,
    orders: simulatedOrders,
    metrics: {
      ...data.metrics,
      grossRevenue,
      todayOrders: todayOrders.length,
      averageTicket: todayOrders.length ? grossRevenue / todayOrders.length : 0,
      pendingOrders,
    },
  }

  const isOrdersRoute = location.pathname === '/app/pedidos'

  function handleToggleStoreStatus() {
    const nextValue = !displayData.store.isOpen
    setStoreOpen(nextValue)
    toast.success(nextValue ? 'Loja aberta com sucesso.' : 'Loja fechada com sucesso.')
  }

  return (
    <div className="min-h-dvh px-3 py-3 sm:px-4 lg:px-5">
      <div
        className={cn(
          'sidebar-shell hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:p-4',
          sidebarCollapsed ? 'lg:w-[108px]' : 'lg:w-[320px]'
        )}
      >
        <PartnerSidebar
          data={displayData}
          source={source}
          onSignOut={onSignOut}
          onToggleStoreStatus={handleToggleStoreStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-full"
        />
      </div>

      <div
        className={cn(
          'main-shell-shift',
          isOrdersRoute ? 'max-w-none' : 'mx-auto max-w-[1500px]',
          sidebarCollapsed ? 'lg:pl-[120px]' : 'lg:pl-[332px]'
        )}
      >
        <div className="space-y-4">
          <div className="panel-card flex items-center justify-between px-4 py-3 lg:hidden">
            <span className="text-sm font-bold text-ink-900">{displayData.store.name}</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-50 text-ink-900"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {error ? <div className="panel-card px-5 py-4 text-sm text-coral-700">{error}</div> : null}
          <Outlet context={{ data: displayData, source }} />
        </div>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-ink-900/45 p-3 lg:hidden">
          <div className="flex h-full max-w-[290px] flex-col">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="mb-3 ml-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
            <PartnerSidebar
              data={displayData}
              source={source}
              onSignOut={onSignOut}
              onToggleStoreStatus={handleToggleStoreStatus}
              collapsed={false}
              onToggleCollapsed={() => undefined}
              onNavigate={() => setSidebarOpen(false)}
              className="h-[calc(100dvh-5.5rem)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
