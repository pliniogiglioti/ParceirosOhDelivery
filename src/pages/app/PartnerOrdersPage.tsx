import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, FlaskConical, GripVertical, Info, Maximize2, MessageCircle, Minimize2, Printer, Search, Settings, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { OrderStatus, OrderStatusEvent, PartnerOrder, PartnerOrderSettings } from '@/types'
import { cancelOrder, dispatchEntregohCourier, fetchOrderStatusEvents, updateOrderStatus } from '@/services/partner'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import { OrderChatPanel } from '@/components/partner/OrderChatPanel'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { isElectron, printOrder, getSavedPrinter } from '@/hooks/usePrint'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type KanbanColumnId = 'aceitar' | 'preparo' | 'pronto' | 'rota' | 'finalizado' | 'cancelado'
const DEFAULT_STAGE_LIMIT_MS = 5 * 60 * 1000
const DEFAULT_PREPARE_TIME = 5
const DEFAULT_ACCEPT_TIME = 10

const defaultOrderSettings: PartnerOrderSettings = {
  acceptTime: 10,
  prepareTime: DEFAULT_PREPARE_TIME,
  playSound: true,
  playLateOrderSound: true,
  lateOrderSoundModel: 'alerta',
  soundModel: 'balcao',
  showNotification: true,
  printAutomatically: false,
  acceptAutomatically: false,
}

const kanbanColumns: Array<{
  id: KanbanColumnId
  label: string
  tone: string
}> = [
  {
    id: 'aceitar',
    label: 'Aceitar',
    tone: 'bg-sand-100 text-sand-800',
  },
  {
    id: 'preparo',
    label: 'Em preparo',
    tone: 'bg-coral-100 text-coral-700',
  },
  {
    id: 'pronto',
    label: 'Pronto',
    tone: 'bg-ink-100 text-ink-800',
  },
  {
    id: 'rota',
    label: 'Em rota',
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    tone: 'bg-mint-100 text-mint-700',
  },
  {
    id: 'cancelado',
    label: 'Cancelado',
    tone: 'bg-coral-100 text-coral-700',
  },
]

function mapOrderToColumn(order: PartnerOrder): KanbanColumnId {
  if (order.status === 'aguardando') return 'aceitar'
  if (order.status === 'preparo') return 'preparo'
  if (order.status === 'confirmado') return 'pronto'
  if (order.status === 'a_caminho') return 'rota'
  if (order.status === 'cancelado') return 'cancelado'
  return 'finalizado'
}

function columnToStatus(columnId: KanbanColumnId): OrderStatus {
  if (columnId === 'aceitar') return 'aguardando'
  if (columnId === 'preparo') return 'preparo'
  if (columnId === 'pronto') return 'confirmado'
  if (columnId === 'rota') return 'a_caminho'
  return 'entregue'
}

function fulfillmentLabel(value: string) {
  if (value === 'pickup') return 'Retirada'
  if (value === 'delivery') return 'Entrega'
  return value
}

function orderStatusPill(order: PartnerOrder) {
  if (order.status === 'cancelado') return 'bg-coral-100 text-coral-700'
  if (order.status === 'entregue') return 'bg-mint-100 text-mint-700'
  if (order.status === 'a_caminho') return 'bg-sky-100 text-sky-700'
  if (order.status === 'preparo') return 'bg-coral-100 text-coral-700'
  if (order.status === 'confirmado') return 'bg-ink-100 text-ink-800'
  return 'bg-sand-100 text-sand-800'
}

function orderStatusLabel(order: PartnerOrder) {
  if (order.status === 'aguardando') return 'Aguardando'
  if (order.status === 'preparo') return 'Em preparo'
  if (order.status === 'confirmado') return 'Pronto'
  if (order.status === 'a_caminho') return 'Em rota'
  if (order.status === 'cancelado') return 'Cancelado'
  return 'Finalizado'
}

function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === 'aguardando') return 'preparo'
  if (status === 'preparo') return 'confirmado'
  if (status === 'confirmado') return 'a_caminho'
  return null
}

function nextStatusTimerLabel(status: OrderStatus, countdown: string) {
  if (status === 'aguardando') return `Aceite em ${countdown}`
  if (status === 'preparo') return `Prepare em ${countdown}`
  if (status === 'confirmado') return `Envie em ${countdown}`
  return null
}

function nextStatusButtonTone(status: OrderStatus) {
  if (status === 'aguardando') return 'bg-coral-500 hover:bg-coral-600'
  if (status === 'preparo') return 'bg-ink-800 hover:bg-ink-900'
  if (status === 'confirmado') return 'bg-sky-500 hover:bg-sky-600'
  if (status === 'a_caminho') return 'bg-mint-600 hover:bg-mint-700'
  return 'bg-coral-500 hover:bg-coral-600'
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function getStageLimitMs(status: OrderStatus, settings?: PartnerOrderSettings) {
  if (status === 'aguardando') return Math.max(settings?.acceptTime ?? DEFAULT_ACCEPT_TIME, 1) * 60 * 1000
  if (status === 'preparo') return Math.max(settings?.prepareTime ?? DEFAULT_PREPARE_TIME, 1) * 60 * 1000
  return DEFAULT_STAGE_LIMIT_MS
}

function formatStageCountdown(stageStartedAt?: string, now = Date.now(), limitMs = DEFAULT_STAGE_LIMIT_MS) {
  const remainingMs = stageStartedAt
    ? Math.max(new Date(stageStartedAt).getTime() + limitMs - now, 0)
    : limitMs
  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isStageExpired(status: OrderStatus, stageStartedAt?: string, now = Date.now(), limitMs = DEFAULT_STAGE_LIMIT_MS) {
  if (!nextStatus(status) || !stageStartedAt) return false

  return new Date(stageStartedAt).getTime() + limitMs <= now
}

export function PartnerOrdersPage() {
  const { data } = usePartnerPageData()
  const { hydrateOrderSettings, orderSettingsByStoreId, updateOrder, updateOrderSettings } = usePartnerDraftStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const boardScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null)
  const thumbDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const boardPanRef = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  const dragPointerXRef = useRef<number | null>(null)
  const lastSelectedOrderRef = useRef<PartnerOrder | null>(null)
  const autoCancelledRef = useRef<Set<string>>(new Set())
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<KanbanColumnId | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(() => {
    const id = new URLSearchParams(window.location.search).get('orderId')
    return id ? (data?.orders.find((o) => o.id === id) ?? null) : null
  })
  const [search, setSearch] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [prepareTimeModalOpen, setPrepareTimeModalOpen] = useState(false)
  const [prepareTimeDraft, setPrepareTimeDraft] = useState(DEFAULT_PREPARE_TIME)
  const [acceptTimeModalOpen, setAcceptTimeModalOpen] = useState(false)
  const [acceptTimeDraft, setAcceptTimeDraft] = useState(DEFAULT_ACCEPT_TIME)
  const [isBoardPanning, setIsBoardPanning] = useState(false)
  const [scrollMetrics, setScrollMetrics] = useState({
    clientWidth: 0,
    scrollLeft: 0,
    scrollWidth: 0,
  })
  const [now, setNow] = useState(() => Date.now())
  const [statusEvents, setStatusEvents] = useState<OrderStatusEvent[]>([])
  const [statusEventsLoading, setStatusEventsLoading] = useState(false)
  const [orderModalTab, setOrderModalTab] = useState<'detalhes' | 'chat'>('detalhes')
  const [cancelTarget, setCancelTarget] = useState<PartnerOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [simulateModalOpen, setSimulateModalOpen] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simPaymentMethod, setSimPaymentMethod] = useState<'Pix' | 'Cartão' | 'Dinheiro'>('Pix')
  const [simFulfillment, setSimFulfillment] = useState<'delivery' | 'pickup'>('delivery')
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null)
  const orderSettings = {
    ...defaultOrderSettings,
    ...(orderSettingsByStoreId[data.store.id] ?? {}),
  }

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId) return

    const order = data.orders.find((item) => item.id === orderId)
    if (order) {
      setSelectedOrder(order)
    }
  }, [data.orders, searchParams])

  useEffect(() => {
    hydrateOrderSettings(data.store.id, defaultOrderSettings)
  }, [data.store.id, hydrateOrderSettings])

  useEffect(() => {
    setPrepareTimeDraft(orderSettings.prepareTime)
  }, [orderSettings.prepareTime])

  useEffect(() => {
    setAcceptTimeDraft(orderSettings.acceptTime)
  }, [orderSettings.acceptTime])

  useEffect(() => {
    const acceptLimitMs = getStageLimitMs('aguardando', orderSettings)
    const pending = data.orders.filter((o) => o.status === 'aguardando')

    for (const order of pending) {
      if (autoCancelledRef.current.has(order.id)) continue
      if (!isStageExpired('aguardando', order.stageStartedAt, now, acceptLimitMs)) continue

      autoCancelledRef.current.add(order.id)
      updateOrder(data.store.id, order.id, { status: 'cancelado' })
      toast.error(`Pedido ${order.code} cancelado por falta de aceite.`)
      void cancelOrder(order.id, 'Pedido cancelado automaticamente por falta de aceite dentro do prazo.').catch(() => undefined)
    }
  }, [now, data.orders, data.store.id, orderSettings, updateOrder])

  useEffect(() => {
    const container = boardScrollRef.current
    if (!container) return

    const updateMetrics = () => {
      setScrollMetrics({
        clientWidth: container.clientWidth,
        scrollLeft: container.scrollLeft,
        scrollWidth: container.scrollWidth,
      })
    }

    updateMetrics()
    container.addEventListener('scroll', updateMetrics)
    window.addEventListener('resize', updateMetrics)

    return () => {
      container.removeEventListener('scroll', updateMetrics)
      window.removeEventListener('resize', updateMetrics)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const container = boardScrollRef.current
      const track = scrollbarTrackRef.current
      const dragState = thumbDragRef.current
      const panState = boardPanRef.current

      if (container && panState) {
        const deltaX = event.clientX - panState.startX
        if (!panState.moved && Math.abs(deltaX) > 4) {
          panState.moved = true
          setIsBoardPanning(true)
        }

        if (panState.moved) {
          container.scrollLeft = panState.startScrollLeft - deltaX
        }
      }

      if (!container || !track || !dragState) return

      const scrollableWidth = container.scrollWidth - container.clientWidth
      const thumbWidth = Math.max((container.clientWidth / container.scrollWidth) * track.clientWidth, 72)
      const trackScrollableWidth = Math.max(track.clientWidth - thumbWidth, 1)
      const deltaX = event.clientX - dragState.startX
      const nextScrollLeft = dragState.startScrollLeft + (deltaX / trackScrollableWidth) * scrollableWidth

      container.scrollLeft = nextScrollLeft
    }

    function handleMouseUp() {
      boardPanRef.current = null
      thumbDragRef.current = null
      setIsBoardPanning(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!draggingOrderId) {
      dragPointerXRef.current = null
      return
    }

    let frameId = 0

    const autoScroll = () => {
      const container = boardScrollRef.current
      const pointerX = dragPointerXRef.current

      if (container && pointerX !== null) {
        const bounds = container.getBoundingClientRect()
        const edgeThreshold = Math.min(220, bounds.width * 0.28)
        const maxStep = 28

        if (pointerX <= bounds.left + edgeThreshold) {
          const intensity = 1 - (pointerX - bounds.left) / edgeThreshold
          container.scrollLeft -= Math.max(8, intensity * maxStep)
        } else if (pointerX >= bounds.right - edgeThreshold) {
          const intensity = 1 - (bounds.right - pointerX) / edgeThreshold
          container.scrollLeft += Math.max(8, intensity * maxStep)
        }
      }

      frameId = window.requestAnimationFrame(autoScroll)
    }

    frameId = window.requestAnimationFrame(autoScroll)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [draggingOrderId])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === panelRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeOrderDetails()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    const orderId = selectedOrder?.id
    if (!orderId || !supabase) {
      setStatusEvents([])
      return
    }

    setStatusEventsLoading(true)
    fetchOrderStatusEvents(orderId)
      .then(setStatusEvents)
      .catch(() => setStatusEvents([]))
      .finally(() => setStatusEventsLoading(false))

    const channel = supabase
      .channel(`order_status_events:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          setStatusEvents((prev) => [
            ...prev,
            {
              id: String(row.id),
              orderId: String(row.order_id),
              status: String(row.status) as OrderStatus,
              label: String(row.label),
              createdAt: String(row.created_at),
            },
          ])
        }
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [selectedOrder?.id])

  function closeOrderDetails() {
    setSelectedOrder(null)
    setSearchParams({})
    setStatusEvents([])
    setOrderModalTab('detalhes')
  }

  function handleBoardDragOver(event: DragEvent<HTMLDivElement>) {
    if (!draggingOrderId || !boardScrollRef.current) return

    dragPointerXRef.current = event.clientX

    const container = boardScrollRef.current
    const bounds = container.getBoundingClientRect()
    const edgeThreshold = 120
    const scrollStep = 24

    if (event.clientX <= bounds.left + edgeThreshold) {
      container.scrollLeft -= scrollStep
    } else if (event.clientX >= bounds.right - edgeThreshold) {
      container.scrollLeft += scrollStep
    }
  }

  function handleDropOrder(targetColumn: KanbanColumnId) {
    if (!draggingOrderId) return

    const order = data.orders.find((item) => item.id === draggingOrderId)
    dragPointerXRef.current = null
    setDraggingOrderId(null)
    setHoveredColumn(null)
    if (!order) return

    const columnIds = kanbanColumns.map((c) => c.id)
    const currentColumn = mapOrderToColumn(order)
    const currentIndex = columnIds.indexOf(currentColumn)
    const targetIndex  = columnIds.indexOf(targetColumn)

    if (currentColumn === targetColumn) return

    if (currentColumn === 'cancelado') {
      toast.error('Pedidos cancelados nao podem ser movidos.')
      return
    }

    // Arrastar para cancelado → abre modal de motivo
    if (targetColumn === 'cancelado') {
      setCancelTarget(order)
      setCancelReason('')
      return
    }

    if (targetIndex < currentIndex) {
      toast.error('Não é permitido mover um pedido para uma etapa anterior.')
      return
    }

    const next = columnToStatus(targetColumn)

    updateOrder(data.store.id, order.id, {
      status: next,
      stageStartedAt: new Date().toISOString(),
    })
    toast.success(`Pedido ${order.code} movido com sucesso.`)
    void updateOrderStatus(order.id, next).catch(() => undefined)
  }

  async function handleConfirmCancel() {
    if (!cancelTarget || !cancelReason.trim() || cancelling) return

    setCancelling(true)
    try {
      updateOrder(data.store.id, cancelTarget.id, { status: 'cancelado' })
      await cancelOrder(cancelTarget.id, cancelReason.trim())
      toast.success(`Pedido ${cancelTarget.code} cancelado.`)
      setCancelTarget(null)
      setCancelReason('')
    } catch {
      toast.error('Nao foi possivel cancelar o pedido.')
      updateOrder(data.store.id, cancelTarget.id, { status: cancelTarget.status })
    } finally {
      setCancelling(false)
    }
  }

  function handleAdvanceOrder(order: PartnerOrder) {
    const next = nextStatus(order.status)
    if (!next) return

    updateOrder(data.store.id, order.id, {
      status: next,
      stageStartedAt: new Date().toISOString(),
    })
    toast.success(`Pedido ${order.code} movido com sucesso.`)
    void updateOrderStatus(order.id, next).catch(() => undefined)
  }

  async function handleSendOrder(order: PartnerOrder) {
    if (order.status !== 'confirmado' || order.fulfillmentType !== 'delivery') {
      handleAdvanceOrder(order)
      return
    }

    if (dispatchingOrderId) return

    setDispatchingOrderId(order.id)
    try {
      const result = await dispatchEntregohCourier(order.id)

      if (!result.success) {
        toast.error(result.message ?? 'Nenhum parceiro EntregoH disponivel para este pedido.')
        return
      }

      const distance = typeof result.distanceKm === 'number'
        ? ` (${result.distanceKm.toFixed(1).replace('.', ',')} km)`
        : ''
      toast.success(
        result.alreadyPending
          ? 'Este pedido ja esta aguardando aceite no EntregoH.'
          : `EntregoH notificado: ${result.courierName ?? 'entregador'}${distance}.`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel chamar o EntregoH.')
    } finally {
      setDispatchingOrderId(null)
    }
  }

  function handleSavePrepareTime() {
    const prepareTime = Math.max(prepareTimeDraft, 1)
    updateOrderSettings(data.store.id, { prepareTime })
    setPrepareTimeModalOpen(false)
    toast.success(`Tempo de preparo ajustado para ${prepareTime} min.`)
  }

  function handleSaveAcceptTime() {
    const acceptTime = Math.max(acceptTimeDraft, 1)
    updateOrderSettings(data.store.id, { acceptTime })
    autoCancelledRef.current.clear()
    setAcceptTimeModalOpen(false)
    toast.success(`Tempo de aceite ajustado para ${acceptTime} min.`)
  }

  function handleTrackPointerDown(event: ReactMouseEvent<HTMLDivElement>) {
    const container = boardScrollRef.current
    const track = scrollbarTrackRef.current
    if (!container || !track) return

    const bounds = track.getBoundingClientRect()
    const thumbWidth = Math.max((container.clientWidth / container.scrollWidth) * track.clientWidth, 72)
    const clickOffset = event.clientX - bounds.left - thumbWidth / 2
    const trackScrollableWidth = Math.max(track.clientWidth - thumbWidth, 1)
    const scrollRatio = clickOffset / trackScrollableWidth
    const scrollableWidth = container.scrollWidth - container.clientWidth

    container.scrollLeft = Math.max(0, Math.min(scrollableWidth, scrollRatio * scrollableWidth))
  }

  function handleThumbPointerDown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (!boardScrollRef.current) return

    thumbDragRef.current = {
      startX: event.clientX,
      startScrollLeft: boardScrollRef.current.scrollLeft,
    }
  }

  function handleBoardMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const container = boardScrollRef.current
    const target = event.target as HTMLElement | null
    if (!container || event.button !== 0 || draggingOrderId) return
    if (target?.closest('[data-prevent-board-pan="true"]')) return

    boardPanRef.current = {
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false,
    }
  }

  async function toggleFullscreen() {
    const panel = panelRef.current
    if (!panel) return

    if (document.fullscreenElement === panel) {
      await document.exitFullscreen()
      return
    }

    await panel.requestFullscreen()
  }

  async function handleSimulateOrder() {
    if (!supabase || simulating) return
    setSimulating(true)
    try {
      // Perfil de teste fixo
      const TEST_PROFILE_ID = 'a30fc969-3dd2-49fe-a7e3-f583cd2782b6'
      const TEST_ADDRESS = 'Rua Engenheiro Hans Klotz, 11A - Centro, Osvaldo Cruz/SP'

      // Pega um produto ativo da loja
      const product = data.products.find((p) => p.active && p.price > 0)
      if (!product) { toast.error('Nenhum produto ativo encontrado na loja.'); return }

      // Cria o pedido
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          store_id: data.store.id,
          store_name: data.store.name,
          profile_id: TEST_PROFILE_ID,
          customer_name: 'Plinio Giglioti (Teste)',
          customer_email: 'plinio.giglioti@gmail.com',
          status: 'aguardando',
          payment_status: 'confirmado',
          payment_method: simPaymentMethod,
          fulfillment_type: simFulfillment,
          address_label: simFulfillment === 'delivery' ? TEST_ADDRESS : null,
          subtotal_amount: product.price,
          delivery_fee: simFulfillment === 'delivery' ? data.store.deliveryFee : 0,
          service_fee: 0,
          total_amount: product.price + (simFulfillment === 'delivery' ? data.store.deliveryFee : 0),
          metadata: { simulated: true },
        })
        .select('id, order_code')
        .single()

      if (error) throw error

      // Adiciona o item
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
      })

      // Evento de status
      await supabase.from('order_status_events').insert({
        order_id: order.id,
        status: 'aguardando',
        label: 'Pedido recebido',
      })

      toast.success(`Pedido simulado ${order.order_code} criado!`)
      setSimulateModalOpen(false)
    } catch (err) {
      toast.error('Erro ao simular pedido.')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredOrders = normalizedSearch
    ? data.orders.filter((order) => {
        const orderCode = order.code.toLowerCase()
        const customerName = order.customerName.toLowerCase()
        return orderCode.includes(normalizedSearch) || customerName.includes(normalizedSearch)
      })
    : data.orders

  const hasHorizontalOverflow = scrollMetrics.scrollWidth > scrollMetrics.clientWidth
  const thumbWidth = hasHorizontalOverflow
    ? Math.max((scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100, 12)
    : 100
  const maxScrollLeft = Math.max(scrollMetrics.scrollWidth - scrollMetrics.clientWidth, 1)
  const thumbOffset = hasHorizontalOverflow
    ? (scrollMetrics.scrollLeft / maxScrollLeft) * (100 - thumbWidth)
    : 0
  if (selectedOrder) {
    lastSelectedOrderRef.current = selectedOrder
  }
  const orderDetails = selectedOrder ?? lastSelectedOrderRef.current

  return (
    <SectionFrame eyebrow="Pedidos" title="Kanban operacional da loja">
      <div
        ref={panelRef}
        className={cn(
          'panel-card relative flex h-[calc(100dvh-7.5rem)] flex-col p-4 sm:p-5',
          isFullscreen && 'h-screen rounded-none border-0 p-5 sm:p-6'
        )}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-900">Quadro de pedidos</h3>
            <p className="mt-1 text-sm text-ink-500">
              Arraste o quadro na horizontal nas areas livres e mova os pedidos arrastando o card inteiro entre etapas.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <label className="relative flex min-w-[280px] flex-1 items-center lg:w-[320px]">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por pedido ou cliente"
                className="h-11 w-full rounded-2xl border border-ink-100 bg-ink-50/70 pl-10 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-300 focus:bg-white"
              />
            </label>

            <button
              type="button"
              onClick={() => setSimulateModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-300 bg-ink-50/70 px-3 text-sm font-semibold text-ink-600 transition hover:border-coral-300 hover:bg-coral-50 hover:text-coral-600"
              title="Simular pedido de teste"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Simular pedido</span>
            </button>

            <button
              type="button"
              onClick={() => { void toggleFullscreen() }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50/70 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
              aria-label={isFullscreen ? 'Sair da tela cheia do kanban' : 'Abrir kanban em tela cheia'}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <div
          ref={boardScrollRef}
          className={cn(
            'hide-scrollbar h-full flex-1 overflow-x-auto overflow-y-hidden pb-2 cursor-grab',
            isBoardPanning && 'cursor-grabbing select-none'
          )}
          onMouseDown={handleBoardMouseDown}
          onDragOver={handleBoardDragOver}
        >
          <div className="flex h-full w-max min-w-[1700px] gap-4 pr-6">
            {kanbanColumns.map((column) => {
              const columnOrders = filteredOrders.filter((order) => mapOrderToColumn(order) === column.id)
              const expiredCount = columnOrders.filter((order) =>
                isStageExpired(order.status, order.stageStartedAt, now, getStageLimitMs(order.status, orderSettings))
              ).length

              return (
                <section
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault()
                    dragPointerXRef.current = event.clientX
                    setHoveredColumn(column.id)
                  }}
                  onDragLeave={() => {
                    if (hoveredColumn === column.id) {
                      setHoveredColumn(null)
                    }
                  }}
                  onDrop={() => handleDropOrder(column.id)}
                  className={cn(
                    'flex h-full min-h-0 w-[310px] shrink-0 self-stretch flex-col rounded-xl border p-3 transition',
                    hoveredColumn === column.id
                      ? 'border-coral-300 bg-coral-50/50'
                      : 'border-ink-100 bg-ink-50/80'
                  )}
                >
                  <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-bold leading-5 text-ink-900">{column.label}</p>
                        {column.id === 'aceitar' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptTimeDraft(orderSettings.acceptTime)
                              setAcceptTimeModalOpen(true)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-ink-100 text-ink-400 transition hover:border-coral-200 hover:bg-ink-50 hover:text-coral-600"
                            aria-label="Configurar tempo de aceite"
                            title="Configurar tempo de aceite"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {column.id === 'preparo' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPrepareTimeDraft(orderSettings.prepareTime)
                              setPrepareTimeModalOpen(true)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-ink-100 text-ink-400 transition hover:border-coral-200 hover:bg-ink-50 hover:text-coral-600"
                            aria-label="Configurar tempo de preparo"
                            title="Configurar tempo de preparo"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {expiredCount ? (
                          <div className="kanban-alert-triangle" aria-label={`${expiredCount} pedidos atrasados`}>
                            <span>{expiredCount}</span>
                          </div>
                        ) : null}
                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', column.tone)}>
                          {columnOrders.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hide-scrollbar mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    {columnOrders.length ? (
                      columnOrders.map((order) => {
                        const stageLimitMs = getStageLimitMs(order.status, orderSettings)
                        const countdown = formatStageCountdown(order.stageStartedAt, now, stageLimitMs)
                        const nextActionLabel = nextStatusTimerLabel(order.status, countdown)
                        const expired = isStageExpired(order.status, order.stageStartedAt, now, stageLimitMs)
                        const expanded = expandedOrderId === order.id
                        const dispatching = dispatchingOrderId === order.id
                        const actionLabel = dispatching
                          ? 'Chamando EntregoH...'
                          : order.status === 'confirmado' && order.fulfillmentType === 'delivery'
                            ? 'Chamar EntregoH'
                            : nextActionLabel

                        return (
                          <article
                            key={order.id}
                            draggable
                            data-prevent-board-pan="true"
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setExpandedOrderId((current) => (current === order.id ? null : order.id))
                              }
                            }}
                            onDrag={(event) => {
                              if (event.clientX > 0) {
                                dragPointerXRef.current = event.clientX
                              }
                            }}
                            onDragStart={(event) => {
                              dragPointerXRef.current = event.clientX
                              setDraggingOrderId(order.id)
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('text/plain', order.id)
                            }}
                            onDragEnd={() => {
                              dragPointerXRef.current = null
                              setDraggingOrderId(null)
                              setHoveredColumn(null)
                            }}
                            className={cn(
                              'cursor-grab rounded-xl border border-ink-100 bg-white p-3 shadow-soft transition active:cursor-grabbing',
                              expanded && 'border-coral-200 shadow-float',
                              expired && 'order-card-expired',
                              draggingOrderId === order.id &&
                                'scale-[0.98] border-coral-200 bg-white/40 opacity-35 shadow-none'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <GripVertical className="h-3.5 w-3.5 text-ink-300" />
                                  <p className="text-[15px] font-bold text-ink-900">{order.code}</p>
                                  {column.id === 'aceitar' ? (
                                    <span
                                      title={`Pedido sera cancelado automaticamente apos ${orderSettings.acceptTime} min sem aceite`}
                                      className="inline-flex items-center text-ink-300 hover:text-coral-500 transition cursor-default"
                                    >
                                      <Info className="h-3.5 w-3.5" />
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1.5 text-[13px] text-ink-500">{order.customerName}</p>
                              </div>

                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  orderStatusPill(order)
                                )}
                              >
                                {orderStatusLabel(order)}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                              <p className="text-[13px] font-semibold text-ink-900">
                                {fulfillmentLabel(order.fulfillmentType)} - {order.itemsCount} itens
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-bold text-ink-900">{formatCurrency(order.total)}</p>
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 text-ink-400 transition-transform duration-300',
                                    expanded && 'rotate-180 text-coral-500'
                                  )}
                                />
                              </div>
                            </div>

                            <div
                              className={cn(
                                'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                                expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                              )}
                            >
                              <div className="overflow-hidden">
                                <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                                    Criado em
                                  </p>
                                  <p className="mt-1 text-[13px] text-ink-600">{formatDateTime(order.createdAt)}</p>
                                </div>

                                <div className="mt-3 grid gap-2">
                                  <button
                                    type="button"
                                    data-prevent-board-pan="true"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setOrderModalTab('detalhes')
                                      setSelectedOrder(order)
                                    }}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-ink-100 bg-white px-3 text-[13px] font-semibold text-ink-800 transition hover:border-coral-200 hover:text-coral-600"
                                  >
                                    Ver pedido
                                  </button>
                                  <button
                                    type="button"
                                    data-prevent-board-pan="true"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setOrderModalTab('chat')
                                      setSelectedOrder(order)
                                    }}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 text-[13px] font-semibold text-ink-800 transition hover:border-coral-200 hover:text-coral-600"
                                  >
                                    <MessageCircle className="h-4 w-4 text-coral-500" />
                                    Mensagem ao cliente
                                  </button>
                                  {isElectron && (
                                    <button
                                      type="button"
                                      data-prevent-board-pan="true"
                                      onClick={async (event) => {
                                        event.stopPropagation()
                                        const printer = await getSavedPrinter()
                                        if (!printer) {
                                          toast.error('Nenhuma impressora configurada. Acesse Configuracoes.')
                                          return
                                        }
                                        const result = await printOrder(order, data.store, printer)
                                        if (!result.success) toast.error('Erro ao imprimir: ' + (result.error ?? 'desconhecido'))
                                        else toast.success('Imprimindo...')
                                      }}
                                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 text-[13px] font-semibold text-ink-800 transition hover:border-coral-200 hover:text-coral-600"
                                    >
                                      <Printer className="h-4 w-4 text-ink-500" />
                                      Imprimir pedido
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {actionLabel ? (
                              <button
                                type="button"
                                data-prevent-board-pan="true"
                                disabled={Boolean(dispatchingOrderId)}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleSendOrder(order)
                                }}
                                className={cn(
                                  'mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold text-white transition',
                                  nextStatusButtonTone(order.status),
                                  dispatchingOrderId && 'cursor-not-allowed opacity-70'
                                )}
                              >
                                {actionLabel}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </article>
                        )
                      })
                    ) : normalizedSearch ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white/70 p-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-ink-700">Nenhum pedido encontrado</p>
                          <p className="mt-1 text-sm text-ink-500">A busca atual nao retornou pedidos nesta etapa.</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'flex flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center transition',
                          hoveredColumn === column.id
                            ? 'border-coral-300 bg-white'
                            : 'border-ink-200 bg-white/80'
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink-700">Solte um pedido aqui</p>
                          <p className="mt-1 text-sm text-ink-500">Arraste um card com o mouse para mover de etapa.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {hasHorizontalOverflow ? (
          <div
            ref={scrollbarTrackRef}
            className="kanban-scrollbar mt-2"
            onMouseDown={handleTrackPointerDown}
          >
            <button
              type="button"
              onMouseDown={handleThumbPointerDown}
              className="kanban-scrollbar-thumb"
              style={{
                left: `${thumbOffset}%`,
                width: `${thumbWidth}%`,
              }}
              aria-label="Rolar colunas do kanban"
            />
          </div>
        ) : null}

        <AnimatedModal
          open={Boolean(selectedOrder)}
          onClose={closeOrderDetails}
          panelClassName="panel-card w-full max-w-[520px] p-5 sm:p-6"
          ariaLabelledby="order-details-title"
        >
          {orderDetails ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Detalhes do pedido</p>
                  <h4 id="order-details-title" className="mt-2 text-2xl font-bold text-ink-900">{orderDetails.code}</h4>
                  <p className="mt-1 text-sm text-ink-500">{orderDetails.customerName}</p>
                </div>

                <button
                  type="button"
                  onClick={closeOrderDetails}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
                  aria-label="Fechar detalhes do pedido"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-1 rounded-2xl border border-ink-100 bg-ink-50 p-1">
                <button
                  type="button"
                  onClick={() => setOrderModalTab('detalhes')}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-xs font-semibold transition',
                    orderModalTab === 'detalhes'
                      ? 'bg-white text-ink-900 shadow-soft'
                      : 'text-ink-500 hover:text-ink-700'
                  )}
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModalTab('chat')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition',
                    orderModalTab === 'chat'
                      ? 'bg-white text-ink-900 shadow-soft'
                      : 'text-ink-500 hover:text-ink-700'
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </button>
              </div>

              {orderModalTab === 'chat' ? (
                <div className="mt-4">
                  <OrderChatPanel
                    order={orderDetails}
                    storeId={data.store.id}
                    storeName={data.store.name}
                    profileId={orderDetails.customerProfileId ?? undefined}
                  />
                </div>
              ) : (
                <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{orderStatusLabel(orderDetails)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Total</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{formatCurrency(orderDetails.total)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Atendimento</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {fulfillmentLabel(orderDetails.fulfillmentType)}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Pagamento</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{orderDetails.paymentMethod}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Criado em</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{formatDateTime(orderDetails.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Itens</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{orderDetails.itemsCount} itens</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Produtos</p>
                  <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-500">
                    {orderDetails.itemsCount} {orderDetails.itemsCount === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {orderDetails.items?.length ? (
                  <div className="mt-3 space-y-2">
                    {orderDetails.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-2xl bg-ink-50/70 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">{item.quantity}x {item.name}</p>
                          <p className="mt-0.5 text-xs text-ink-500">{formatCurrency(item.unitPrice)} por unidade</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-ink-900">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">Produtos nao informados neste pedido.</p>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                      Tempo da etapa
                    </p>
                    <p className="mt-1 text-base font-bold text-ink-900">
                      {formatStageCountdown(orderDetails.stageStartedAt, now, getStageLimitMs(orderDetails.status, orderSettings))}
                    </p>
                  </div>
                  {isStageExpired(orderDetails.status, orderDetails.stageStartedAt, now, getStageLimitMs(orderDetails.status, orderSettings)) ? (
                    <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
                      Atrasado
                    </span>
                  ) : (
                    <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700">
                      No prazo
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                  Histórico do pedido
                </p>
                {statusEventsLoading ? (
                  <p className="mt-3 text-sm text-ink-400">Carregando...</p>
                ) : statusEvents.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-400">Nenhum evento registrado ainda.</p>
                ) : (
                  <ol className="mt-3 space-y-0">
                    {statusEvents.map((event, index) => {
                      const isLast = index === statusEvents.length - 1
                      return (
                        <li key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2',
                                isLast
                                  ? 'border-coral-500 bg-coral-500'
                                  : 'border-ink-300 bg-white'
                              )}
                            />
                            {!isLast && (
                              <span className="mt-0.5 w-px flex-1 bg-ink-100" style={{ minHeight: '1.25rem' }} />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className={cn('text-sm font-semibold', isLast ? 'text-ink-900' : 'text-ink-600')}>
                              {event.label}
                            </p>
                            <p className="text-xs text-ink-400">{formatDateTime(event.createdAt)}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
              </>
              )}
            </>
          ) : null}
        </AnimatedModal>

        <AnimatedModal
          open={prepareTimeModalOpen}
          onClose={() => setPrepareTimeModalOpen(false)}
          panelClassName="panel-card w-full max-w-md p-5 sm:p-6"
          ariaLabelledby="prepare-time-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Em preparo</p>
              <h4 id="prepare-time-title" className="mt-2 text-xl font-bold text-ink-900">
                Configurar tempo de preparo
              </h4>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Define quando os pedidos em preparo passam a ficar atrasados.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPrepareTimeModalOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
              aria-label="Fechar configuracao de preparo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Tempo de preparo
            </span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="99"
                value={prepareTimeDraft}
                onChange={(event) => setPrepareTimeDraft(parseInteger(event.target.value))}
                className="h-12 w-28 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
              <span className="text-sm font-medium text-ink-500">min</span>
            </div>
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPrepareTimeModalOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSavePrepareTime}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-6 text-sm font-semibold text-white transition hover:bg-coral-600"
            >
              Salvar
            </button>
          </div>
        </AnimatedModal>

        <AnimatedModal
          open={acceptTimeModalOpen}
          onClose={() => setAcceptTimeModalOpen(false)}
          panelClassName="panel-card w-full max-w-md p-5 sm:p-6"
          ariaLabelledby="accept-time-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Aceitar</p>
              <h4 id="accept-time-title" className="mt-2 text-xl font-bold text-ink-900">
                Configurar tempo de aceite
              </h4>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Pedidos nao aceitos dentro deste prazo serao cancelados automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAcceptTimeModalOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
              aria-label="Fechar configuracao de aceite"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Tempo de aceite
            </span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="99"
                value={acceptTimeDraft}
                onChange={(event) => setAcceptTimeDraft(parseInteger(event.target.value))}
                className="h-12 w-28 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
              <span className="text-sm font-medium text-ink-500">min</span>
            </div>
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAcceptTimeModalOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAcceptTime}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-6 text-sm font-semibold text-white transition hover:bg-coral-600"
            >
              Salvar
            </button>
          </div>
        </AnimatedModal>

        {/* Modal de cancelamento com motivo obrigatório */}
        <AnimatedModal
          open={Boolean(cancelTarget)}
          onClose={() => { if (!cancelling) { setCancelTarget(null); setCancelReason('') } }}
          panelClassName="panel-card w-full max-w-md p-5 sm:p-6"
          ariaLabelledby="cancel-order-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Cancelar pedido</p>
              <h4 id="cancel-order-title" className="mt-2 text-xl font-bold text-ink-900">
                {cancelTarget?.code}
              </h4>
              <p className="mt-1 text-sm text-ink-500">{cancelTarget?.customerName}</p>
            </div>
            <button
              type="button"
              onClick={() => { if (!cancelling) { setCancelTarget(null); setCancelReason('') } }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-coral-100 bg-coral-50 px-4 py-3">
            <p className="text-sm text-coral-700">
              Esta acao nao pode ser desfeita. O cliente sera notificado do cancelamento.
            </p>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Motivo do cancelamento <span className="text-coral-500">*</span>
            </span>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Ex: Cliente solicitou cancelamento, item indisponivel, endereco invalido..."
              className="w-full resize-none rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-300 focus:border-coral-400 transition"
              autoFocus
            />
            {cancelReason.trim().length === 0 && (
              <p className="mt-1.5 text-xs text-ink-400">Campo obrigatorio para cancelar o pedido.</p>
            )}
          </label>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setCancelTarget(null); setCancelReason('') }}
              disabled={cancelling}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmCancel()}
              disabled={!cancelReason.trim() || cancelling}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-6 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-40"
            >
              {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </div>
        </AnimatedModal>

        {/* Modal de simulação de pedido */}
        <AnimatedModal
          open={simulateModalOpen}
          onClose={() => { if (!simulating) setSimulateModalOpen(false) }}
          panelClassName="panel-card w-full max-w-md p-5 sm:p-6"
          ariaLabelledby="simulate-order-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Ambiente de teste</p>
              <h4 id="simulate-order-title" className="mt-2 text-xl font-bold text-ink-900">
                Simular pedido
              </h4>
              <p className="mt-1 text-sm text-ink-500">
                Cria um pedido real usando o perfil de teste <strong>plinio.giglioti@gmail.com</strong> com endereço cadastrado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimulateModalOpen(false)}
              disabled={simulating}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-xs text-ink-500">
            <p>📍 <strong>Endereço:</strong> Rua Engenheiro Hans Klotz, 11A — Centro, Osvaldo Cruz/SP</p>
            <p className="mt-1">🛍️ <strong>Produto:</strong> Primeiro produto ativo da loja</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Pagamento</span>
              <select
                value={simPaymentMethod}
                onChange={(e) => setSimPaymentMethod(e.target.value as 'Pix' | 'Cartão' | 'Dinheiro')}
                className="h-11 w-full rounded-2xl border border-ink-100 bg-white px-3 text-sm font-medium text-ink-900 outline-none focus:border-coral-400"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tipo</span>
              <select
                value={simFulfillment}
                onChange={(e) => setSimFulfillment(e.target.value as 'delivery' | 'pickup')}
                className="h-11 w-full rounded-2xl border border-ink-100 bg-white px-3 text-sm font-medium text-ink-900 outline-none focus:border-coral-400"
              >
                <option value="delivery">Entrega</option>
                <option value="pickup">Retirada</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSimulateModalOpen(false)}
              disabled={simulating}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSimulateOrder()}
              disabled={simulating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-6 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50"
            >
              {simulating ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Criando...</>
              ) : (
                <><FlaskConical className="h-4 w-4" /> Criar pedido</>
              )}
            </button>
          </div>
        </AnimatedModal>
      </div>
    </SectionFrame>
  )
}
