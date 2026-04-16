import { type ElementType, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, Ban, CreditCard, DollarSign, Percent, QrCode, TrendingUp, Wallet } from 'lucide-react'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type Period = 'semana' | 'mes' | 'trimestre'
type TxFilter = 'todas' | 'pedidos' | 'cancelados'
type FinanceTxType = 'pedido' | 'cancelado'

type FinanceOrder = {
  id: string
  code: string
  customerName: string
  status: string
  paymentMethod: string
  total: number
  serviceFee: number
  createdAt: string
}

type FinanceTransaction = {
  id: string
  orderId: string
  label: string
  amount: number
  repasse: number | null
  type: FinanceTxType
  date: string
}

const PAYMENT_ICON: Record<string, ElementType> = {
  Cartao: CreditCard,
  Dinheiro: Wallet,
  Pix: QrCode,
}

const PAYMENT_COLOR: Record<string, { bg: string; text: string }> = {
  Cartao: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Dinheiro: { bg: 'bg-amber-50', text: 'text-amber-600' },
  Pix: { bg: 'bg-[#14c8bb]/10', text: 'text-[#0fa89d]' },
}

const PERIOD_LABEL: Record<Period, string> = {
  semana: 'Ultimos 7 dias',
  mes: 'Este mes',
  trimestre: 'Ultimos 90 dias',
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

  start.setDate(start.getDate() - 89)
  return start
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function isFinancialOrder(order: FinanceOrder) {
  return order.status !== 'cancelado'
}

function normalizePaymentMethod(value: string) {
  if (value === 'Credito' || value === 'Debito') {
    return 'Cartao'
  }

  return value
}

function getOrderRepasse(order: FinanceOrder, repassePercentual: number) {
  if (order.status === 'cancelado') return 0
  if (order.serviceFee > 0) return order.serviceFee
  return order.total * (repassePercentual / 100)
}

export function PartnerFinancePage() {
  const { data } = usePartnerPageData()
  const [period, setPeriod] = useState<Period>('semana')
  const [txFilter, setTxFilter] = useState<TxFilter>('todas')
  const [txPage, setTxPage] = useState(1)
  const TX_PER_PAGE = 10
  const [orders, setOrders] = useState<FinanceOrder[]>([])
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

    async function loadFinanceOrders() {
      setLoading(true)
      setError(null)

      const { data: orderRows, error: orderError } = await client
        .from('orders')
        .select('id, order_code, customer_name, status, payment_method, total_amount, service_fee, created_at')
        .eq('store_id', data.store.id)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (!active) {
        return
      }

      if (orderError) {
        setOrders([])
        setLoading(false)
        setError('Nao foi possivel carregar os dados financeiros.')
        return
      }

      setOrders(
        (orderRows ?? []).map((row) => ({
          id: String(row.id),
          code: String(row.order_code ?? '#0000'),
          customerName: String(row.customer_name ?? 'Cliente'),
          status: String(row.status ?? 'aguardando'),
          paymentMethod: normalizePaymentMethod(String(row.payment_method ?? 'Pix')),
          total: Number(row.total_amount ?? 0),
          serviceFee: Number(row.service_fee ?? 0),
          createdAt: String(row.created_at ?? new Date().toISOString()),
        }))
      )
      setLoading(false)
    }

    void loadFinanceOrders()

    return () => {
      active = false
    }
  }, [data.store.id, period])

  const financeOrders = useMemo(() => orders.filter(isFinancialOrder), [orders])
  const canceledOrders = useMemo(() => orders.filter((o) => o.status === 'cancelado'), [orders])

  const repassePercentual = data.store.repassePercentual ?? 5

  const transactions = useMemo(() => {
    const txs: FinanceTransaction[] = []

    for (const order of financeOrders) {
      const repasseValor = getOrderRepasse(order, repassePercentual)

      txs.push({
        id: `${order.id}-pedido`,
        orderId: order.id,
        label: `${order.code}${order.customerName ? ` - ${order.customerName}` : ''}`,
        amount: order.total,
        repasse: repasseValor,
        type: 'pedido',
        date: order.createdAt,
      })
    }

    for (const order of canceledOrders) {
      txs.push({
        id: `${order.id}-cancelado`,
        orderId: order.id,
        label: `${order.code}${order.customerName ? ` - ${order.customerName}` : ''}`,
        amount: order.total,
        repasse: null,
        type: 'cancelado',
        date: order.createdAt,
      })
    }

    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [financeOrders, canceledOrders, repassePercentual])

  const filteredTxs = useMemo(() => {
    setTxPage(1)
    return transactions.filter((tx) => {
      if (txFilter === 'pedidos') return tx.type === 'pedido'
      if (txFilter === 'cancelados') return tx.type === 'cancelado'
      return true
    })
  }, [transactions, txFilter])

  const totalEntradas = useMemo(
    () => financeOrders.reduce((sum, order) => sum + order.total, 0),
    [financeOrders]
  )

  const totalRepasse = useMemo(
    () => financeOrders.reduce((sum, order) => sum + getOrderRepasse(order, repassePercentual), 0),
    [financeOrders, repassePercentual]
  )

  const canceledTotal = useMemo(
    () => canceledOrders.reduce((sum, order) => sum + order.total, 0),
    [canceledOrders]
  )

  const saldoLiquido = totalEntradas - totalRepasse

  const paymentBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    const counts = new Map<string, number>()

    financeOrders.forEach((order) => {
      totals.set(order.paymentMethod, (totals.get(order.paymentMethod) ?? 0) + order.total)
      counts.set(order.paymentMethod, (counts.get(order.paymentMethod) ?? 0) + 1)
    })

    const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0)

    return Array.from(totals.entries())
      .map(([label, total]) => ({
        label,
        total,
        count: counts.get(label) ?? 0,
        pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      }))
      .sort((left, right) => right.total - left.total)
  }, [financeOrders])

  const averageTicket = financeOrders.length ? totalEntradas / financeOrders.length : 0
  const latestMovementAt = transactions[0]?.date ?? null
  const tableGridClass = 'grid grid-cols-[minmax(0,1.6fr)_140px_140px] items-center gap-x-4'

  const totalPages = Math.max(1, Math.ceil(filteredTxs.length / TX_PER_PAGE))
  const pagedTxs = filteredTxs.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE)

  return (
    <SectionFrame eyebrow="Financeiro" title="Saude financeira">
      <div className="flex items-center justify-between pl-1">
        <p className="text-xs text-ink-400">
          Periodo: <span className="font-semibold text-ink-700">{PERIOD_LABEL[period]}</span>
        </p>
        <Tabs
          options={[
            { id: 'semana', label: '7 dias' },
            { id: 'mes', label: 'Mes' },
            { id: 'trimestre', label: '90 dias' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {error ? <div className="panel-card px-5 py-4 text-sm text-coral-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Faturamento</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{formatCurrency(totalEntradas)}</p>
          <p className="mt-1 text-xs text-ink-400">{financeOrders.length} pedidos validos no periodo</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ticket medio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{formatCurrency(averageTicket)}</p>
          <p className="mt-1 text-xs text-ink-400">calculado com pedidos do banco</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Entradas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
          <p className="mt-1 text-xs text-ink-400">valor bruto dos pedidos</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Repasse</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-50">
              <Percent className="h-4 w-4 text-violet-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-violet-600">-{formatCurrency(totalRepasse)}</p>
          <p className="mt-1 text-xs text-ink-400">{repassePercentual}% descontado do faturamento valido</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Cancelados</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-zinc-100">
              <Ban className="h-4 w-4 text-zinc-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-zinc-500">{canceledOrders.length}</p>
          <p className="mt-1 text-xs text-ink-400">
            {canceledOrders.length === 1 ? 'pedido cancelado' : 'pedidos cancelados'} · {formatCurrency(canceledTotal)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="panel-card border-l-4 border-l-violet-400 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Liquido previsto</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-50">
              <Percent className="h-4 w-4 text-violet-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-violet-600">{formatCurrency(saldoLiquido)}</p>
          <p className="mt-1 text-xs text-ink-400">
            faturamento valido menos o repasse da plataforma
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-ink-900">Extrato financeiro</p>
              <p className="mt-1 text-xs text-ink-400">Movimentos derivados dos pedidos da loja no periodo selecionado</p>
            </div>
            <Tabs
              options={[
                { id: 'todas', label: 'Todas' },
                { id: 'pedidos', label: 'Pedidos' },
                { id: 'cancelados', label: 'Cancelados' },
              ]}
              value={txFilter}
              onChange={setTxFilter}
            />
          </div>

          <div className={cn(tableGridClass, 'border-b border-ink-100 px-5 py-2.5')}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">Venda</p>
            <p className="text-right text-[11px] font-semibold uppercase tracking-widest text-ink-400">Repasse</p>
            <p className="text-right text-[11px] font-semibold uppercase tracking-widest text-ink-400">Total</p>
          </div>

          {loading ? (
            <div className="space-y-3 px-5 py-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-2xl bg-ink-50" />
              ))}
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-ink-400">Nenhuma movimentacao encontrada para este periodo.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {pagedTxs.map((tx) => (
                <li
                  key={tx.id}
                  className={cn(
                    tableGridClass,
                    'px-5 py-3.5',
                    tx.type === 'cancelado' && 'opacity-60'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                        tx.type === 'cancelado' ? 'bg-zinc-100' : 'bg-green-50'
                      )}
                    >
                      {tx.type === 'cancelado' ? (
                        <Ban className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{tx.label}</p>
                      <p className="text-xs text-ink-400">
                        {tx.type === 'cancelado' ? 'Cancelado · ' : ''}
                        {formatShortDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <p className="text-right text-sm font-bold text-violet-600">
                    {tx.repasse !== null ? `-${formatCurrency(tx.repasse)}` : '—'}
                  </p>

                  <p
                    className={cn(
                      'text-right text-sm font-bold',
                      tx.type === 'cancelado' ? 'text-zinc-400 line-through' : 'text-green-600'
                    )}
                  >
                    {tx.type === 'cancelado' ? '' : '+'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Paginação */}
          {!loading && filteredTxs.length > TX_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
              <p className="text-xs text-ink-400">
                {(txPage - 1) * TX_PER_PAGE + 1}–{Math.min(txPage * TX_PER_PAGE, filteredTxs.length)} de {filteredTxs.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 text-xs font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - txPage) <= 1)
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-ink-400">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTxPage(p as number)}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition',
                          txPage === p
                            ? 'bg-ink-900 text-white'
                            : 'border border-ink-100 text-ink-700 hover:bg-ink-50'
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  type="button"
                  onClick={() => setTxPage((p) => Math.min(totalPages, p + 1))}
                  disabled={txPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 text-xs font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Rodapé saldo */}
          <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3.5">
            <p className="text-sm font-semibold text-ink-700">Saldo liquido do periodo</p>
            <p className={cn('text-sm font-bold', saldoLiquido >= 0 ? 'text-green-600' : 'text-coral-500')}>
              {saldoLiquido >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(saldoLiquido))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Por forma de pagamento</p>
            {loading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-10 animate-pulse rounded-2xl bg-ink-50" />
                ))}
              </div>
            ) : paymentBreakdown.length === 0 ? (
              <p className="mt-4 text-sm text-ink-400">Sem pedidos registrados neste periodo.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {paymentBreakdown.map(({ label, total, count, pct }) => {
                  const Icon = PAYMENT_ICON[label] ?? CreditCard
                  const colors = PAYMENT_COLOR[label] ?? { bg: 'bg-ink-100', text: 'text-ink-600' }

                  return (
                    <div key={label}>
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
                            colors.bg,
                            colors.text
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-ink-900">{label}</p>
                            <p className="text-xs font-bold text-ink-900">{formatCurrency(total)}</p>
                          </div>
                          <p className="text-[10px] text-ink-400">
                            {count} {count === 1 ? 'pedido' : 'pedidos'}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', colors.text.replace('text-', 'bg-'))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="panel-card bg-ink-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Resumo real do periodo</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">{formatCurrency(saldoLiquido)}</p>
            <p className="mt-1 text-xs text-white/60">saldo liquido apos desconto do repasse em pedidos validos</p>
            <div className="mt-4 space-y-2 text-xs text-white/70">
              <p>{financeOrders.length} pedidos considerados</p>
              <p>{latestMovementAt ? `Ultima movimentacao em ${formatShortDate(latestMovementAt)}` : 'Sem movimentacoes no periodo'}</p>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  )
}
