import { Menu, X, Clock, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { PartnerSidebar } from '@/components/partner/PartnerSidebar'
import { PartnerTopbar } from '@/components/partner/PartnerTopbar'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import { useOrderNotifications } from '@/hooks/useOrderNotifications'
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime'
import { useReviewsRealtime } from '@/hooks/useReviewsRealtime'
import { useUnreadMessagesRealtime } from '@/hooks/useUnreadMessagesRealtime'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerUiStore } from '@/hooks/usePartnerUiStore'
import { cn, isSameUtcDate } from '@/lib/utils'
import { saveStore } from '@/services/partner'
import type { PartnerHour } from '@/types'

function isWithinSchedule(hours: PartnerHour[]): boolean {
  const now = new Date()
  const weekDay = now.getDay()
  const todayHour = hours.find((h) => h.weekDay === weekDay)
  if (!todayHour || todayHour.isClosed) return false
  const [openH, openM] = todayHour.opensAt.split(':').map(Number)
  const [closeH, closeM] = todayHour.closesAt.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return nowMinutes >= openH * 60 + openM && nowMinutes < closeH * 60 + closeM
}

function getOutsideScheduleKey(storeId: string): string {
  // Chave única por loja + dia — reseta no dia seguinte automaticamente
  const today = new Date().toISOString().slice(0, 10)
  return `oh-outside-schedule-dismissed:${storeId}:${today}`
}

export function PartnerLayout({ onSignOut }: { onSignOut: () => void }) {
  const { selectedStoreId } = usePartnerAuth()
  const { data, loading, error, source } = usePartnerDashboard(selectedStoreId)
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = usePartnerUiStore()
  const [outsideScheduleModalOpen, setOutsideScheduleModalOpen] = useState(false)
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
    reviewsByStoreId,
    newReviewsCountByStoreId,
    unreadMessagesCountByStoreId,
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
    hydrateReviews,
    addReview,
    incrementUnreadMessages,
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
      hydrateReviews(data.store.id, data.reviews)
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
    data?.reviews,
    hydrateOrders,
    hydratePaymentMethods,
    hydrateCouriers,
    hydrateLogistics,
    hydrateStore,
    hydrateStoreHours,
    hydrateStoreOpen,
    hydrateCategories,
    hydrateProducts,
    hydrateReviews,
  ])

  useOrderNotifications(data?.store.id ?? '')
  useOrdersRealtime(data?.store.id ?? '')
  useReviewsRealtime(data?.store.id ?? '', (review) => {
    if (data?.store.id) {
      addReview(data.store.id, review)
      toast('Nova avaliacao recebida!', { icon: '⭐' })
    }
  })
  useUnreadMessagesRealtime(data?.store.id ?? '', () => {
    if (data?.store.id) {
      incrementUnreadMessages(data.store.id)
      toast('Nova mensagem de cliente!', { icon: '💬', duration: 3000 })
    }
  })

  // Modal de aviso: loja aberta fora do horário
  useEffect(() => {
    if (!data?.store.id) return
    const isOpen = storeOpen ?? data.store.isOpen
    if (!isOpen) return
    if (data.hours.length === 0) return
    if (isWithinSchedule(data.hours)) return

    // Verifica se o usuário já dispensou hoje
    const key = getOutsideScheduleKey(data.store.id)
    if (localStorage.getItem(key) === 'dismissed') return

    setOutsideScheduleModalOpen(true)
  }, [data?.store.id, data?.store.isOpen, data?.hours, storeOpen])

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
  const draftReviews = reviewsByStoreId[data.store.id] ?? data.reviews
  const newReviewsCount = newReviewsCountByStoreId[data.store.id] ?? 0
  const unreadMessagesCount = unreadMessagesCountByStoreId[data.store.id] ?? 0
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
    reviews: draftReviews,
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
    // Persiste no banco
    saveStore(displayData.store.id, { isOpen: nextValue }).catch(() => {
      // Reverte se falhar
      setStoreOpen(!nextValue)
      toast.error('Nao foi possivel atualizar o status da loja.')
    })
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
          newReviewsCount={newReviewsCount}
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
          <PartnerTopbar data={displayData} unreadMessages={unreadMessagesCount} />

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
          <Outlet context={{ data: displayData, source, serverData: data, storeId: data.store.id }} />
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
              newReviewsCount={newReviewsCount}
              className="h-[calc(100dvh-5.5rem)]"
            />
          </div>
        </div>
      ) : null}

      {/* Modal: loja aberta fora do horário */}
      <AnimatedModal
        open={outsideScheduleModalOpen}
        onClose={() => setOutsideScheduleModalOpen(false)}
        panelClassName="panel-card w-full max-w-md p-6"
        ariaLabelledby="outside-schedule-title"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-50">
            <AlertTriangle className="h-6 w-6 text-coral-500" />
          </span>
          <div>
            <h4 id="outside-schedule-title" className="text-lg font-bold text-ink-900">
              Loja aberta fora do horario
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Sua loja esta marcada como <strong className="text-ink-700">aberta</strong>, mas o horario configurado indica que ela deveria estar fechada agora.
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Deseja fechar a loja ou continuar aberta?
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              // Fecha a loja
              setStoreOpen(false)
              saveStore(displayData.store.id, { isOpen: false }).catch(() => {
                setStoreOpen(true)
                toast.error('Nao foi possivel fechar a loja.')
              })
              toast.success('Loja fechada com sucesso.')
              setOutsideScheduleModalOpen(false)
            }}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Fechar a loja agora
          </button>
          <button
            type="button"
            onClick={() => {
              // Salva no localStorage para não exibir mais hoje
              if (data?.store.id) {
                localStorage.setItem(getOutsideScheduleKey(data.store.id), 'dismissed')
              }
              setOutsideScheduleModalOpen(false)
            }}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
          >
            Continuar aberta
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Se clicar em "Continuar aberta", este aviso nao aparecera mais hoje.
        </p>
      </AnimatedModal>
    </div>
  )
}
