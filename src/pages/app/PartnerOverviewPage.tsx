import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Bike,
  ClipboardList,
  Clock,
  DollarSign,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  CreditCard,
  BarChart2,
  Calendar,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cn, formatCurrency, DEFAULT_PRODUCT_IMAGE } from '@/lib/utils'

type Period = 'hoje' | 'semana' | 'mes'

const PERIOD_LABEL: Record<Period, string> = {
  hoje: 'hoje',
  semana: 'esta semana',
  mes: 'este mes',
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

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

type OverviewOrder = {
  id: string
  code: string
  customerName: string
  status: string
  total: number
  createdAt: string
  itemsCount: number
  paymentMethod: string
}

type TopProduct = {
  id: string
  name: string
  imageUrl?: string
  qty: number
  revenue: number
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
              ? 'bg-coral-500 text-white'
              : 'border border-ink-100 bg-white text-ink-500 hover:bg-ink-50'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof DollarSign
  iconBg: string
  iconColor: string
  trend?: { value: string; up: boolean } | null
}) {
  return (
    <div className="panel-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
          <p className="mt-2 font-display text-[28px] font-bold leading-none tracking-[-0.03em] text-ink-900">{value}</p>
          {sub ? <p className="mt-1.5 text-xs text-ink-400">{sub}</p> : null}
          {trend ? (
            <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              trend.up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
              {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}
            </div>
          ) : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </span>
      </div>
    </div>
  )
}

function startOfPeriod(period: Period) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'semana') { start.setDate(start.getDate() - 6); return start }
  if (period === 'mes') { start.setDate(1); return start }
  return start
}

export function PartnerOverviewPage() {
  const { data } = usePartnerPageData()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('hoje')
  const [orders, setOrders] = useState<OverviewOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [pageViews, setPageViews] = useState(0)
  const [funnelCounts, setFunnelCounts] = useState({ visita: 0, visualizacao: 0, sacola: 0, revisao: 0, venda: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!data.store.id || !isSupabaseConfigured || !supabase) { setLoading(false); return }
    let active = true
    const client = supabase
    const fromDate = startOfPeriod(period)

    async function load() {
      setLoading(true)

      const [ordersRes, funnelRes] = await Promise.all([
        client.from('orders')
          .select('id, order_code, customer_name, status, total_amount, created_at, payment_method')
          .eq('store_id', data.store.id)
          .gte('created_at', fromDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(500),
        client.from('store_funnel_events')
          .select('event_type')
          .eq('store_id', data.store.id)
          .gte('created_at', fromDate.toISOString()),
      ])

      if (!active) return

      const orderRows = ordersRes.data ?? []
      const orderIds = orderRows.map((r) => String(r.id))

      const itemsRes = orderIds.length
        ? await client.from('order_items')
            .select('order_id, product_id, product_name, quantity, total_price')
            .in('order_id', orderIds)
        : { data: [] }

      if (!active) return

      const itemRows = itemsRes.data ?? []
      const itemCountByOrder = new Map<string, number>()
      itemRows.forEach((r) => {
        const oid = String(r.order_id)
        itemCountByOrder.set(oid, (itemCountByOrder.get(oid) ?? 0) + Number(r.quantity ?? 0))
      })

      setOrders(orderRows.map((r) => ({
        id: String(r.id),
        code: String(r.order_code ?? '#0000'),
        customerName: String(r.customer_name ?? 'Cliente'),
        status: String(r.status ?? 'aguardando'),
        total: Number(r.total_amount ?? 0),
        createdAt: String(r.created_at ?? ''),
        itemsCount: itemCountByOrder.get(String(r.id)) ?? 0,
        paymentMethod: String(r.payment_method ?? ''),
      })))

      // Top products
      const productMap = new Map<string, { name: string; qty: number; revenue: number; imageUrl?: string }>()
      itemRows.forEach((r) => {
        const pid = String(r.product_id ?? r.product_name)
        const existing = productMap.get(pid)
        if (existing) {
          existing.qty += Number(r.quantity ?? 0)
          existing.revenue += Number(r.total_price ?? 0)
        } else {
          const product = data.products.find((p) => p.id === String(r.product_id))
          productMap.set(pid, {
            name: String(r.product_name ?? 'Produto'),
            qty: Number(r.quantity ?? 0),
            revenue: Number(r.total_price ?? 0),
            imageUrl: product?.imageUrl,
          })
        }
      })
      const sorted = [...productMap.entries()]
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 6)
      setTopProducts(sorted)

      const funnelRows = funnelRes.data ?? []
      const funnelCount = (type: string) => funnelRows.filter((r) => r.event_type === type).length
      const deliveredInPeriod = orderRows.filter((r) => r.status === 'entregue').length

      setPageViews(funnelCount('visita'))
      setFunnelCounts({
        visita: funnelCount('visita'),
        visualizacao: funnelCount('visualizacao'),
        sacola: funnelCount('sacola'),
        revisao: funnelCount('revisao'),
        venda: deliveredInPeriod,
      })
      setLoading(false)
    }

    void load()
    return () => { active = false }
  }, [data.store.id, data.products, period])

  // ── Metrics ──────────────────────────────────────────────────────────────
  const validOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelado'), [orders])
  const revenue = useMemo(() => validOrders.reduce((s, o) => s + o.total, 0), [validOrders])
  const ordersCount = validOrders.length
  const avgTicket = ordersCount ? revenue / ordersCount : 0
  const pendingCount = orders.filter((o) => ['aguardando', 'confirmado', 'preparo'].includes(o.status)).length
  const deliveredCount = orders.filter((o) => o.status === 'entregue').length
  const cancelledCount = orders.filter((o) => o.status === 'cancelado').length

  // Funil — 5 etapas reais
  const funnelSteps = [
    { label: 'Visitas', value: funnelCounts.visita, color: 'bg-blue-500' },
    { label: 'Visualizacao', value: funnelCounts.visualizacao, color: 'bg-purple-500' },
    { label: 'Sacola', value: funnelCounts.sacola, color: 'bg-orange-400' },
    { label: 'Revisao', value: funnelCounts.revisao, color: 'bg-yellow-500' },
    { label: 'Vendas', value: funnelCounts.venda, color: 'bg-green-500' },
  ]
  const funnelMax = Math.max(...funnelSteps.map((s) => s.value), 1)

  // Horários com mais vendas
  const hourMap = new Map<number, number>()
  validOrders.forEach((o) => {
    const h = new Date(o.createdAt).getHours()
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  })
  const topHours = [...hourMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxHourCount = Math.max(...topHours.map((h) => h[1]), 1)

  // Dias com mais vendas
  const dayMap = new Map<number, number>()
  validOrders.forEach((o) => {
    const d = new Date(o.createdAt).getDay()
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
  })
  const topDays = [...dayMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxDayCount = Math.max(...topDays.map((d) => d[1]), 1)

  // Formas de pagamento
  const payMap = new Map<string, number>()
  validOrders.forEach((o) => {
    const m = o.paymentMethod || 'Outro'
    payMap.set(m, (payMap.get(m) ?? 0) + 1)
  })
  const payMethods = [...payMap.entries()].sort((a, b) => b[1] - a[1])
  const maxPayCount = Math.max(...payMethods.map((p) => p[1]), 1)

  const rating = useMemo(() => {
    if (!data.reviews.length) return data.store.rating.toFixed(1)
    return (data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length).toFixed(1)
  }, [data.reviews, data.store.rating])

  const topProductMax = Math.max(...topProducts.map((p) => p.qty), 1)

  return (
    <SectionFrame eyebrow="Inicio" title="Dashboard">
      {/* Period selector */}
      <div className="flex items-center justify-between pl-1">
        <p className="text-xs text-ink-400">
          Dados de <span className="font-semibold text-ink-700">{PERIOD_LABEL[period]}</span>
        </p>
        <Tabs
          options={[
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mes' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* KPI Cards skeleton */}
      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="panel-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-ink-100" />
                </div>
                <div className="h-8 w-28 animate-pulse rounded-xl bg-ink-100" />
                <div className="h-3 w-16 animate-pulse rounded-full bg-ink-100" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="panel-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-ink-100" />
                </div>
                <div className="h-8 w-28 animate-pulse rounded-xl bg-ink-100" />
                <div className="h-3 w-16 animate-pulse rounded-full bg-ink-100" />
              </div>
            ))}
          </div>
          <div className="panel-card p-5">
            <div className="h-4 w-32 animate-pulse rounded-full bg-ink-100 mb-5" />
            <div className="flex items-end gap-3">
              {[1,2,3].map((i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="h-3 w-8 animate-pulse rounded-full bg-ink-100" />
                  <div className="w-full animate-pulse rounded-2xl bg-ink-100" style={{ height: 120 }} />
                  <div className="h-6 w-10 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-3 w-14 animate-pulse rounded-full bg-ink-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="panel-card overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <div className="h-4 w-40 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="space-y-3 p-5">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 w-4 animate-pulse rounded-full bg-ink-100" />
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-ink-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded-full bg-ink-100" />
                      <div className="h-1.5 w-full animate-pulse rounded-full bg-ink-100" />
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="h-4 w-8 animate-pulse rounded-full bg-ink-100" />
                      <div className="h-3 w-16 animate-pulse rounded-full bg-ink-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-card overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <div className="h-4 w-32 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="space-y-3 p-5">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-2xl bg-ink-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 animate-pulse rounded-full bg-ink-100" />
                      <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="h-4 w-16 animate-pulse rounded-full bg-ink-100" />
                      <div className="h-3 w-12 animate-pulse rounded-full bg-ink-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[1,2,3].map((i) => (
              <div key={i} className="panel-card p-5 space-y-4">
                <div className="h-4 w-36 animate-pulse rounded-full bg-ink-100" />
                {[1,2,3,4].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-3 w-10 animate-pulse rounded-full bg-ink-100 shrink-0" />
                    <div className="flex-1 h-2 animate-pulse rounded-full bg-ink-100" />
                    <div className="h-3 w-6 animate-pulse rounded-full bg-ink-100 shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* KPI Cards */}
      {!loading ? (
      <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Receita" value={formatCurrency(revenue)}
          sub={PERIOD_LABEL[period]} icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" />
        <KpiCard label="Pedidos" value={String(ordersCount)}
          sub={`${cancelledCount} cancelados`} icon={ShoppingBag} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <KpiCard label="Ticket medio" value={formatCurrency(avgTicket)}
          sub="por pedido" icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-500" />
        <KpiCard label="Pendentes" value={String(pendingCount)}
          sub="aguardando acao" icon={ClipboardList}
          iconBg={pendingCount > 0 ? 'bg-coral-50' : 'bg-ink-50'}
          iconColor={pendingCount > 0 ? 'text-coral-500' : 'text-ink-400'} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Entregues" value={String(deliveredCount)}
          sub={PERIOD_LABEL[period]} icon={Bike} iconBg="bg-[#14c8bb]/10" iconColor="text-[#0fa89d]" />
        <KpiCard label="Visitas" value={String(funnelCounts.visita)}
          sub="pagina da loja" icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <KpiCard label="Avaliacao" value={rating}
          sub={`${data.reviews.length || data.store.reviewCount} avaliacoes`}
          icon={Star} iconBg="bg-yellow-50" iconColor="text-yellow-500" />
        <KpiCard label="Entrega" value={formatCurrency(data.store.deliveryFee)}
          sub={`${data.store.etaMin}-${data.store.etaMax} min`}
          icon={Clock} iconBg="bg-ink-50" iconColor="text-ink-500" />
      </div>

      {/* Funil de vendas — cards lado a lado */}
      <div className="panel-card p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">Funil de vendas</p>
            <p className="mt-1 text-sm text-ink-500">Conversao do periodo selecionado</p>
          </div>
          <BarChart2 className="h-5 w-5 text-ink-300" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {funnelSteps.map((step, i) => {
            const pct = funnelSteps[0].value > 0
              ? Math.round((step.value / funnelSteps[0].value) * 100)
              : 0
            const stepPct = i > 0 && funnelSteps[i - 1].value > 0
              ? Math.round((step.value / funnelSteps[i - 1].value) * 100)
              : null

            const colors: Record<string, { bg: string; light: string; text: string }> = {
              'Visitas':      { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8' },
              'Visualizacao': { bg: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9' },
              'Sacola':       { bg: '#f59e0b', light: '#fffbeb', text: '#b45309' },
              'Revisao':      { bg: '#f97316', light: '#fff7ed', text: '#c2410c' },
              'Vendas':       { bg: '#22c55e', light: '#f0fdf4', text: '#15803d' },
            }
            const c = colors[step.label] ?? { bg: '#6b7280', light: '#f9fafb', text: '#374151' }

            // Altura do rodapé colorido: mínimo 56px, máximo 160px, proporcional ao pct
            const footerH = Math.max(56, Math.round((pct / 100) * 160))

            return (
              <div key={step.label} className="flex flex-col overflow-hidden rounded-2xl border border-ink-100" style={{ minHeight: 200 }}>
                {/* Topo — info (cresce para preencher o espaço restante) */}
                <div className="flex-1 p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: c.bg }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-xs font-semibold text-ink-700 leading-tight">{step.label}</p>
                  </div>
                  <p className="text-xl font-bold text-ink-900 leading-none">
                    {step.value.toLocaleString('pt-BR')}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">clientes</p>
                  {stepPct !== null && (
                    <span
                      className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: c.light, color: c.text }}
                    >
                      ↑ {stepPct}% acima
                    </span>
                  )}
                </div>
                {/* Rodapé colorido — topo arredondado + altura proporcional */}
                <div
                  className="flex items-center justify-center transition-all duration-700"
                  style={{
                    backgroundColor: c.bg,
                    height: footerH,
                    borderRadius: '16px 16px 0 0',
                  }}
                >
                  <p className="text-lg font-bold text-white">{pct}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Produtos mais vendidos + Pedidos recentes */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Produtos mais vendidos */}
        <div className="panel-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <p className="text-sm font-semibold text-ink-900">Produtos mais vendidos</p>
            <button type="button" onClick={() => navigate('/app/cardapio')}
              className="flex items-center gap-1 text-xs font-semibold text-coral-500 hover:text-coral-600">
              Ver cardapio <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">{[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-50" />)}</div>
          ) : topProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ink-400">Nenhum produto vendido neste periodo.</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {topProducts.map((product, i) => (
                <div key={product.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-ink-400">{i + 1}</span>
                  <img src={product.imageUrl ?? DEFAULT_PRODUCT_IMAGE} alt={product.name}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-coral-500 transition-all duration-500"
                        style={{ width: `${Math.round((product.qty / topProductMax) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ink-900">{product.qty}x</p>
                    <p className="text-xs text-ink-400">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos recentes */}
        <div className="panel-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <p className="text-sm font-semibold text-ink-900">Pedidos recentes</p>
            <button type="button" onClick={() => navigate('/app/pedidos')}
              className="flex items-center gap-1 text-xs font-semibold text-coral-500 hover:text-coral-600">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">{[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-50" />)}</div>
          ) : orders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ink-400">Nenhum pedido neste periodo.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {orders.slice(0, 6).map((order) => (
                <li key={order.id} className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-ink-50"
                  onClick={() => navigate(`/app/pedidos?orderId=${order.id}`)}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ink-50">
                    <ShoppingBag className="h-4 w-4 text-ink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{order.customerName}</p>
                    <p className="text-xs text-ink-400">#{order.code} · {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-ink-900">{formatCurrency(order.total)}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLOR[order.status] ?? 'bg-ink-100 text-ink-500')}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Horários / Dias / Pagamentos */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Horários com mais vendas */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-ink-400" />
            <p className="text-sm font-semibold text-ink-900">Horarios com mais vendas</p>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-ink-50" />)}</div>
          : topHours.length === 0 ? <p className="text-sm text-ink-400">Sem dados</p>
          : (
            <div className="space-y-2.5">
              {topHours.map(([hour, count]) => (
                <div key={hour} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-semibold text-ink-600">
                    {String(hour).padStart(2, '0')}h–{String(hour + 1).padStart(2, '0')}h
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-ink-100 h-2">
                    <div className="h-full rounded-full bg-coral-500 transition-all duration-500"
                      style={{ width: `${Math.round((count / maxHourCount) * 100)}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-bold text-ink-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dias com mais vendas */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-ink-400" />
            <p className="text-sm font-semibold text-ink-900">Dias com mais vendas</p>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-ink-50" />)}</div>
          : topDays.length === 0 ? <p className="text-sm text-ink-400">Sem dados</p>
          : (
            <div className="space-y-2.5">
              {topDays.map(([day, count]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-xs font-semibold text-ink-600">{DAY_NAMES[day]}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-ink-100 h-2">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.round((count / maxDayCount) * 100)}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-bold text-ink-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formas de pagamento */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-ink-400" />
            <p className="text-sm font-semibold text-ink-900">Formas de pagamento</p>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-ink-50" />)}</div>
          : payMethods.length === 0 ? <p className="text-sm text-ink-400">Sem dados</p>
          : (
            <div className="space-y-2.5">
              {payMethods.map(([method, count]) => {
                const pct = Math.round((count / maxPayCount) * 100)
                const totalPct = ordersCount > 0 ? Math.round((count / ordersCount) * 100) : 0
                return (
                  <div key={method} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 truncate text-xs font-semibold text-ink-600">{method}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-ink-100 h-2">
                      <div className="h-full rounded-full bg-[#14c8bb] transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-ink-700">{totalPct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Loja info */}
      <div className="panel-card bg-ink-900 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Sua loja</p>
            <p className="mt-1 text-base font-bold text-white">{data.store.name}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: 'Avaliacao', value: `${rating} ★` },
              { label: 'Tempo', value: `${data.store.etaMin}-${data.store.etaMax} min` },
              { label: 'Frete', value: formatCurrency(data.store.deliveryFee) },
              { label: 'Modo entrega', value: data.logistics.courierMode },
              { label: 'Tempo preparo', value: data.logistics.averagePrepTime },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </> ) : null}
    </SectionFrame>
  )
}
