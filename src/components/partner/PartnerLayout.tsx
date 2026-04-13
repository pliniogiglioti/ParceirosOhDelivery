import { Menu, X } from 'lucide-react'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { PartnerSidebar } from '@/components/partner/PartnerSidebar'
import { PartnerTopbar } from '@/components/partner/PartnerTopbar'
import { useOrderNotifications } from '@/hooks/useOrderNotifications'
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerUiStore } from '@/hooks/usePartnerUiStore'
import { cn, isSameUtcDate } from '@/lib/utils'

export function PartnerLayout({ onSignOut }: { onSignOut: () => void }) {
  const { selectedStoreId } = usePartnerAuth()
  const { data, loading, error, source } = usePartnerDashboard(selectedStoreId)
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = usePartnerUiStore()
  const {
    storeOpen,
    storeByStoreId,
    storeHoursByStoreId,
    ordersByStoreId,
    paymentMethodsByStoreId,
    couriersByStoreId,
    logisticsByStoreId,
    categoriesByStoreId,
    productsByStoreId,
    setStoreOpen,
    hydrateStore,
    hydrateStoreOpen,
    hydrateStoreHours,
    hydrateOrders,
    hydratePaymentMethods,
    hydrateCouriers,
    hydrateLogistics,
    hydrateCategories,
    hydrateProducts,
  } = usePartnerDraftStore()

  useEffect(() => {
    if (data) {
      hydrateStore(data.store)
      hydrateStoreOpen(data.store.isOpen)
      hydrateStoreHours(data.store.id, data.hours)
      hydrateOrders(data.store.id, data.orders)
      hydratePaymentMethods(data.store.id, data.paymentMethods)
      hydrateCouriers(data.store.id, data.couriers)
      hydrateLogistics(data.store.id, data.logistics)
      hydrateCategories(data.store.id, data.categories)
      hydrateProducts(data.store.id, data.products)
    }
  }, [
    data?.store,
    data?.store.id,
    data?.store.isOpen,
    data?.hours,
    data?.orders,
    data?.paymentMethods,
    data?.couriers,
    data?.logistics,
    data?.categories,
    data?.products,
    hydrateOrders,
    hydratePaymentMethods,
    hydrateCouriers,
    hydrateLogistics,
    hydrateStore,
    hydrateStoreHours,
    hydrateStoreOpen,
    hydrateCategories,
    hydrateProducts,
  ])

  useOrderNotifications(data?.store.id ?? '')
  useOrdersRealtime(data?.store.id ?? '')

  if (loading) {
    return <LoadingScreen />
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="panel-card max-w-md px-6 py-5 text-center">
          <p className="font-display text-lg font-bold text-ink-900">Nao foi possivel carregar o painel.</p>
          <p className="mt-2 text-sm text-ink-500">
            {error ?? 'Confira a configuracao do Supabase e tente novamente.'}
          </p>
        </div>
      </div>
    )
  }

  const draftStore = storeByStoreId[data.store.id] ?? data.store
  const draftHours = storeHoursByStoreId[data.store.id] ?? data.hours
  const draftOrders = ordersByStoreId[data.store.id] ?? data.orders
  const draftPaymentMethods = paymentMethodsByStoreId[data.store.id] ?? data.paymentMethods
  const draftCouriers = couriersByStoreId[data.store.id] ?? data.couriers
  const draftLogistics = logisticsByStoreId[data.store.id] ?? data.logistics
  const draftCategories = categoriesByStoreId[data.store.id] ?? data.categories
  const draftProducts = productsByStoreId[data.store.id] ?? data.products
  const today = new Date()
  const validOrders = draftOrders.filter((order) => order.status !== 'cancelado')
  const todayOrders = validOrders.filter((order) => isSameUtcDate(order.createdAt, today))
  const grossRevenue = todayOrders.reduce((total, order) => total + order.total, 0)
  const pendingOrders = draftOrders.filter((order) =>
    ['aguardando', 'confirmado', 'preparo'].includes(order.status)
  ).length

  const displayData = {
    ...data,
    store: {
      ...draftStore,
      isOpen: storeOpen ?? draftStore.isOpen,
    },
    hours: draftHours,
    orders: draftOrders,
    paymentMethods: draftPaymentMethods,
    couriers: draftCouriers,
    logistics: draftLogistics,
    categories: draftCategories,
    products: draftProducts,
    metrics: {
      ...data.metrics,
      grossRevenue,
      todayOrders: todayOrders.length,
      averageTicket: todayOrders.length ? grossRevenue / todayOrders.length : 0,
      pendingOrders,
    },
  }

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
          'max-w-none',
          sidebarCollapsed ? 'lg:pl-[120px]' : 'lg:pl-[332px]'
        )}
      >
        <div className="space-y-4">
          <PartnerTopbar data={displayData} />

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
          <Outlet context={{ data: displayData, source, serverData: data }} />
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
