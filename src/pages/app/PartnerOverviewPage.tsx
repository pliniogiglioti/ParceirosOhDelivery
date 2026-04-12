import {
  ArrowRight,
  Bike,
  ClipboardList,
  Clock,
  DollarSign,
  ShoppingBag,
  Star,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'

type Period = 'hoje' | 'semana' | 'mes'
type StatusFilter = 'todos' | 'pendentes' | 'preparo' | 'entregues'

type OverviewOrder = {
  id: string
  code: string
  customerName: string
  status: string
  total: number
  createdAt: string
  itemsCount: number
}

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  confirmado: 'Confirmado',
  preparo: 'Em preparo',
  a_caminho: 'A caminho',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: 'bg-yellow-50 text-yellow-700',
  confirmado: 'bg-blue-50 text-blue-700',
  preparo: 'bg-orange-50 text-orange-700',
  a_caminho: 'bg-[#14c8bb]/10 text-[#0fa89d]',
  entregue: 'bg-green-50 text-green-700',
  cancelado: 'bg-ink-100 text-ink-500',
}

const PERIOD_LABEL: Record<Period, string> = {
  hoje: 'hoje',
  semana: 'esta semana',
  mes: 'este mes',
}

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-2xl px-3 py-1.5 text-xs font-semibold transition',
            value === o.id
              ? 'bg-ink-900 text-white'
              : 'border border-ink-100 bg-white text-ink-500 hover:bg-ink-50'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function startOfPeriod(period: Period) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (period === 'semana') {
    start.setDate(start.getDate() - 6)
    return start
  }

  if (period === 'mes') {
    start.setDate(1)
    return start
  }

  return start
}

export function PartnerOverviewPage() {
  const { data } = usePartnerPageData()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('hoje')
  const [statusFilter, setStatus] = useState<StatusFilter>('todos')
  const [orders, setOrders] = useState<OverviewOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data.store.id) {
      setOrders([])
      setLoading(false)
      setError(null)
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setOrders([])
      setLoading(false)
      setError('Supabase nao configurado.')
      return
    }

    let active = true
    const client = supabase
    const fromDate = startOfPeriod(period)

    async function loadOverviewOrders() {
      setLoading(true)
      setError(null)

      const orderQuery =
        period === 'mes'
          ? client
              .from('orders')
              .select('id, order_code, customer_name, status, total_amount, created_at')
              .eq('store_id', data.store.id)
              .gte('created_at', fromDate.toISOString())
              .order('created_at', { ascending: false })
              .limit(500)
          : client
              .from('orders')
              .select('id, order_code, customer_name, status, total_amount, created_at')
              .eq('store_id', data.store.id)
              .gte('created_at', fromDate.toISOString())
              .order('created_at', { ascending: false })
              .limit(200)

      const { data: orderRows, error: orderError } = await orderQuery

      if (!active) {
        return
      }

      if (orderError) {
        setOrders([])
        setLoading(false)
        setError('Nao foi possivel carregar os dados da visao geral.')
        return
      }

      const orderIds = (orderRows ?? []).map((row) => String(row.id))
      const { data: itemRows, error: itemError } = orderIds.length
        ? await client.from('order_items').select('order_id, quantity').in('order_id', orderIds)
        : { data: [], error: null }

      if (!active) {
        return
      }

      if (itemError) {
        setOrders([])
        setLoading(false)
        setError('Nao foi possivel carregar os itens dos pedidos.')
        return
      }

      const itemCountByOrder = new Map<string, number>()
      ;(itemRows ?? []).forEach((row) => {
        const orderId = String(row.order_id)
        itemCountByOrder.set(orderId, (itemCountByOrder.get(orderId) ?? 0) + Number(row.quantity ?? 0))
      })

      setOrders(
        (orderRows ?? []).map((row) => ({
          id: String(row.id),
          code: String(row.order_code ?? '#0000'),
          customerName: String(row.customer_name ?? 'Cliente'),
          status: String(row.status ?? 'aguardando'),
          total: Number(row.total_amount ?? 0),
          createdAt: String(row.created_at ?? new Date().toISOString()),
          itemsCount: itemCountByOrder.get(String(row.id)) ?? 0,
        }))
      )
      setLoading(false)
    }

    void loadOverviewOrders()

    return () => {
      active = false
    }
  }, [data.store.id, period])

  const validOrders = useMemo(() => orders.filter((order) => order.status !== 'cancelado'), [orders])
  const revenue = useMemo(() => validOrders.reduce((sum, order) => sum + order.total, 0), [validOrders])
  const ordersCount = validOrders.length
  const averageTicket = ordersCount ? revenue / ordersCount : 0
  const pendingCount = orders.filter((order) => ['aguardando', 'confirmado', 'preparo'].includes(order.status)).length
  const deliveredCount = orders.filter((order) => order.status === 'entregue').length

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (statusFilter === 'pendentes') return ['aguardando', 'confirmado'].includes(order.status)
        if (statusFilter === 'preparo') return order.status === 'preparo'
        if (statusFilter === 'entregues') return order.status === 'entregue'
        return true
      })
      .slice(0, 6)
  }, [orders, statusFilter])

  const rating = useMemo(() => {
    if (data.reviews.length === 0) {
      return data.store.rating.toFixed(1)
    }

    const total = data.reviews.reduce((sum, review) => sum + review.rating, 0)
    return (total / data.reviews.length).toFixed(1)
  }, [data.reviews, data.store.rating])

  return (
    <SectionFrame eyebrow="Inicio" title="Visao geral">
      <div className="flex items-center justify-between pl-1">
        <p className="text-xs text-ink-400">
          Exibindo dados de <span className="font-semibold text-ink-700">{PERIOD_LABEL[period]}</span>
        </p>
        <Tabs
          options={[
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: 'Esta semana' },
            { id: 'mes', label: 'Este mes' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {error ? <div className="panel-card px-5 py-4 text-sm text-coral-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Receita</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">
            {loading ? '--' : formatCurrency(revenue)}
          </p>
          <p className="mt-1 text-xs text-ink-400">{PERIOD_LABEL[period]}</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Pedidos</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{loading ? '--' : ordersCount}</p>
          <p className="mt-1 text-xs text-ink-400">{PERIOD_LABEL[period]}</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ticket medio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">
            {loading ? '--' : formatCurrency(averageTicket)}
          </p>
          <p className="mt-1 text-xs text-ink-400">por pedido real</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Pendentes</p>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-2xl',
                pendingCount > 0 ? 'bg-coral-50' : 'bg-ink-50'
              )}
            >
              <ClipboardList className={cn('h-4 w-4', pendingCount > 0 ? 'text-coral-500' : 'text-ink-400')} />
            </span>
          </div>
          <p className={cn('mt-3 font-display text-3xl font-bold', pendingCount > 0 ? 'text-coral-500' : 'text-ink-900')}>
            {loading ? '--' : pendingCount}
          </p>
          <p className="mt-1 text-xs text-ink-400">aguardando acao</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
            <p className="text-sm font-semibold text-ink-900">Pedidos recentes</p>
            <div className="flex items-center gap-3">
              <Tabs
                options={[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pendentes', label: 'Pendentes' },
                  { id: 'preparo', label: 'Preparo' },
                  { id: 'entregues', label: 'Entregues' },
                ]}
                value={statusFilter}
                onChange={setStatus}
              />
              <button
                type="button"
                onClick={() => navigate('/app/pedidos')}
                className="flex items-center gap-1 text-xs font-semibold text-coral-500 transition hover:text-coral-600"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 px-5 py-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-2xl bg-ink-50" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ink-400">Nenhum pedido neste filtro.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filteredOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition hover:bg-ink-50"
                  onClick={() => navigate(`/app/pedidos?orderId=${order.id}`)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ink-50">
                    <ShoppingBag className="h-4 w-4 text-ink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{order.customerName}</p>
                    <p className="text-xs text-ink-400">
                      #{order.code} · {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-ink-900">{formatCurrency(order.total)}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        STATUS_COLOR[order.status] ?? 'bg-ink-100 text-ink-500'
                      )}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Sua loja</p>
            <p className="mt-2 font-display text-base font-bold text-ink-900">{data.store.name}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-ink-50 p-3 text-center">
                <Star className="mx-auto h-4 w-4 text-yellow-400" />
                <p className="mt-1 text-sm font-bold text-ink-900">{rating}</p>
                <p className="text-[10px] text-ink-400">{data.reviews.length || data.store.reviewCount} avaliacoes</p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-3 text-center">
                <Clock className="mx-auto h-4 w-4 text-blue-500" />
                <p className="mt-1 text-sm font-bold text-ink-900">
                  {data.store.etaMin}-{data.store.etaMax}
                </p>
                <p className="text-[10px] text-ink-400">min</p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-3 text-center">
                <Bike className="mx-auto h-4 w-4 text-[#14c8bb]" />
                <p className="mt-1 text-sm font-bold text-ink-900">{formatCurrency(data.store.deliveryFee)}</p>
                <p className="text-[10px] text-ink-400">Taxa</p>
              </div>
            </div>
          </div>

          <div className="panel-card bg-ink-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Operacao</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">Tempo medio de preparo</p>
                <p className="text-sm font-bold text-white">{data.logistics.averagePrepTime}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">Pedidos entregues</p>
                <p className="text-sm font-bold text-white">{loading ? '--' : deliveredCount}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">Modo de entrega</p>
                <p className="text-sm font-bold text-white">{data.logistics.courierMode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  )
}
