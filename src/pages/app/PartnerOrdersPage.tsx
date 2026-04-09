import type { DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, GripVertical, Maximize2, Minimize2, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { OrderStatus, PartnerOrder } from '@/types'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'

type KanbanColumnId = 'aceitar' | 'preparo' | 'pronto' | 'rota' | 'finalizado'

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

function formatStageCountdown(stageStartedAt?: string, now = Date.now()) {
  if (!stageStartedAt) return '05:00'

  const endAt = new Date(stageStartedAt).getTime() + 5 * 60 * 1000
  const remainingMs = Math.max(endAt - now, 0)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isStageExpired(status: OrderStatus, stageStartedAt?: string, now = Date.now()) {
  if (!nextStatus(status) || !stageStartedAt) return false

  return new Date(stageStartedAt).getTime() + 5 * 60 * 1000 <= now
}

export function PartnerOrdersPage() {
  const { data } = usePartnerPageData()
  const { updateOrder } = usePartnerSimulationStore()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const boardScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null)
  const thumbDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<KanbanColumnId | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null)
  const [search, setSearch] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scrollMetrics, setScrollMetrics] = useState({
    clientWidth: 0,
    scrollLeft: 0,
    scrollWidth: 0,
  })
  const [now, setNow] = useState(() => Date.now())

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
        setSelectedOrder(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

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

    const next = columnToStatus(targetColumn)
    if (order.status === next) return

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
                isStageExpired(order.status, order.stageStartedAt, now)
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
                    'flex h-full min-h-0 w-[310px] shrink-0 self-stretch flex-col rounded-[28px] border p-3 transition',
                    hoveredColumn === column.id
                      ? 'border-coral-300 bg-coral-50/50'
                      : 'border-ink-100 bg-ink-50/80'
                  )}
                >
                  <div className="rounded-[18px] border border-ink-100 bg-white px-3 py-2 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-bold leading-5 text-ink-900">{column.label}</p>

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
                        const countdown = formatStageCountdown(order.stageStartedAt, now)
                        const nextActionLabel = nextStatusTimerLabel(order.status, countdown)
                        const expired = isStageExpired(order.status, order.stageStartedAt, now)

                        return (
                          <article
                            key={order.id}
                            draggable
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedOrder(order)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedOrder(order)
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
                              'cursor-grab rounded-[24px] border border-ink-100 bg-white p-3 shadow-soft transition active:cursor-grabbing',
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

                            <p className="mt-3 text-[13px] font-semibold text-ink-900">
                              {fulfillmentLabel(order.fulfillmentType)} - {order.itemsCount} itens
                            </p>

                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                                  Criado em
                                </p>
                                <p className="mt-1 text-[13px] text-ink-600">{formatDateTime(order.createdAt)}</p>
                              </div>
                              <p className="text-base font-bold text-ink-900">{formatCurrency(order.total)}</p>
                            </div>

                            {nextActionLabel ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleAdvanceOrder(order)
                                }}
                                className={cn(
                                  'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold text-white transition',
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
                      <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-ink-200 bg-white/70 p-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-ink-700">Nenhum pedido encontrado</p>
                          <p className="mt-1 text-sm text-ink-500">A busca atual nao retornou pedidos nesta etapa.</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'flex flex-1 items-center justify-center rounded-[24px] border border-dashed p-6 text-center transition',
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

        {selectedOrder ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center rounded-[28px] bg-ink-950/30 p-4 backdrop-blur-[2px]"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="w-full max-w-[520px] rounded-[28px] border border-ink-100 bg-white p-5 shadow-soft sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Detalhes do pedido</p>
                  <h4 className="mt-2 text-2xl font-bold text-ink-900">{selectedOrder.code}</h4>
                  <p className="mt-1 text-sm text-ink-500">{selectedOrder.customerName}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-700 transition hover:border-coral-200 hover:text-coral-600"
                  aria-label="Fechar detalhes do pedido"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{orderStatusLabel(selectedOrder)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Total</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{formatCurrency(selectedOrder.total)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Atendimento</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {fulfillmentLabel(selectedOrder.fulfillmentType)}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Pagamento</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{selectedOrder.paymentMethod}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Criado em</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Itens</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{selectedOrder.itemsCount} itens</p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                      Tempo da etapa
                    </p>
                    <p className="mt-1 text-base font-bold text-ink-900">
                      {formatStageCountdown(selectedOrder.stageStartedAt, now)}
                    </p>
                  </div>
                  {isStageExpired(selectedOrder.status, selectedOrder.stageStartedAt, now) ? (
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
            </div>
          </div>
        ) : null}
      </div>
    </SectionFrame>
  )
}
