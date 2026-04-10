import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, GripVertical, Maximize2, Minimize2, Plus, Search, Settings, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { OrderStatus, PartnerOrder, PartnerOrderSettings } from '@/types'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'

type KanbanColumnId = 'aceitar' | 'preparo' | 'pronto' | 'rota' | 'finalizado'
const DEFAULT_STAGE_LIMIT_MS = 5 * 60 * 1000
const DEFAULT_PREPARE_TIME = 5

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
]

function mapOrderToColumn(order: PartnerOrder): KanbanColumnId {
  if (order.status === 'aguardando') return 'aceitar'
  if (order.status === 'preparo') return 'preparo'
  if (order.status === 'confirmado') return 'pronto'
  if (order.status === 'a_caminho') return 'rota'
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
  const { addOrder, hydrateOrderSettings, orderSettingsByStoreId, updateOrder, updateOrderSettings } = usePartnerSimulationStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const boardScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null)
  const thumbDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const lastSelectedOrderRef = useRef<PartnerOrder | null>(null)
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
  const [scrollMetrics, setScrollMetrics] = useState({
    clientWidth: 0,
    scrollLeft: 0,
    scrollWidth: 0,
  })
  const [now, setNow] = useState(() => Date.now())
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
      if (!container || !track || !dragState) return

      const scrollableWidth = container.scrollWidth - container.clientWidth
      const thumbWidth = Math.max((container.clientWidth / container.scrollWidth) * track.clientWidth, 72)
      const trackScrollableWidth = Math.max(track.clientWidth - thumbWidth, 1)
      const deltaX = event.clientX - dragState.startX
      const nextScrollLeft = dragState.startScrollLeft + (deltaX / trackScrollableWidth) * scrollableWidth

      container.scrollLeft = nextScrollLeft
    }

    function handleMouseUp() {
      thumbDragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

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

  function closeOrderDetails() {
    setSelectedOrder(null)
    setSearchParams({})
  }

  function handleBoardDragOver(event: DragEvent<HTMLDivElement>) {
    if (!draggingOrderId || !boardScrollRef.current) return

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
    setDraggingOrderId(null)
    setHoveredColumn(null)
    if (!order) return

    const columnIds = kanbanColumns.map((c) => c.id)
    const currentColumn = mapOrderToColumn(order)
    const currentIndex = columnIds.indexOf(currentColumn)
    const targetIndex  = columnIds.indexOf(targetColumn)

    if (currentColumn === targetColumn) return

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
  }

  function handleAdvanceOrder(order: PartnerOrder) {
    const next = nextStatus(order.status)
    if (!next) return

    updateOrder(data.store.id, order.id, {
      status: next,
      stageStartedAt: new Date().toISOString(),
    })
    toast.success(`Pedido ${order.code} movido com sucesso.`)
  }

  function handleSavePrepareTime() {
    const prepareTime = Math.max(prepareTimeDraft, 1)
    updateOrderSettings(data.store.id, { prepareTime })
    setPrepareTimeModalOpen(false)
    toast.success(`Tempo de preparo ajustado para ${prepareTime} min.`)
  }

  function handleSimulateIncomingOrder() {
    const nextCodeNumber = Math.max(
      1042,
      ...data.orders.map((order) => Number.parseInt(order.code.replace(/\D/g, ''), 10)).filter(Number.isFinite)
    ) + 1
    const createdAt = new Date().toISOString()
    const order: PartnerOrder = {
      id: `sim-order-${Date.now()}`,
      code: `#${nextCodeNumber}`,
      customerName: 'Pedido Teste',
      status: 'aguardando',
      total: 58.7,
      paymentMethod: 'Pix',
      fulfillmentType: 'delivery',
      createdAt,
      stageStartedAt: createdAt,
      itemsCount: 2,
      items: [
        { id: `sim-item-${Date.now()}-1`, name: 'Combo Oh Bacon', quantity: 1, unitPrice: 34.9, totalPrice: 34.9 },
        { id: `sim-item-${Date.now()}-2`, name: 'Batata da Casa', quantity: 1, unitPrice: 23.8, totalPrice: 23.8 },
      ],
    }

    addOrder(data.store.id, order)
    toast.success(`Pedido teste ${order.code} recebido.`)
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

  async function toggleFullscreen() {
    const panel = panelRef.current
    if (!panel) return

    if (document.fullscreenElement === panel) {
      await document.exitFullscreen()
      return
    }

    await panel.requestFullscreen()
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
            <p className="mt-1 text-sm text-ink-500">Arraste os cards com o mouse entre as etapas do fluxo.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={handleSimulateIncomingOrder}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-semibold text-white transition hover:bg-coral-600"
            >
              <Plus className="h-4 w-4" />
              Simular pedido
            </button>

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
              onClick={() => {
                void toggleFullscreen()
              }}
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
          className="hide-scrollbar h-full flex-1 overflow-x-auto overflow-y-hidden pb-2"
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

                        return (
                          <article
                            key={order.id}
                            draggable
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setExpandedOrderId((current) => (current === order.id ? null : order.id))
                              }
                            }}
                            onDragStart={(event) => {
                              setDraggingOrderId(order.id)
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('text/plain', order.id)
                            }}
                            onDragEnd={() => {
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
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSelectedOrder(order)
                                    }}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-ink-100 bg-white px-3 text-[13px] font-semibold text-ink-800 transition hover:border-coral-200 hover:text-coral-600"
                                  >
                                    Ver pedido
                                  </button>
                                </div>
                              </div>
                            </div>

                            {nextActionLabel ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleAdvanceOrder(order)
                                }}
                                className={cn(
                                  'mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-semibold text-white transition',
                                  nextStatusButtonTone(order.status)
                                )}
                              >
                                {nextActionLabel}
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
      </div>
    </SectionFrame>
  )
}
