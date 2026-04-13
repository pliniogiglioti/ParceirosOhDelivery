import { type ElementType, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, Percent, QrCode, TrendingUp, Wallet } from 'lucide-react'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type Period = 'semana' | 'mes' | 'trimestre'
type TxFilter = 'todas' | 'entradas' | 'saidas'
type FinanceTxType = 'entrada' | 'saida'

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

export function PartnerFinancePage() {
  const { data } = usePartnerPageData()
  const [period, setPeriod] = useState<Period>('semana')
  const [txFilter, setTxFilter] = useState<TxFilter>('todas')
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

  const repassePercentual = data.store.repassePercentual ?? 5

  const transactions = useMemo(() => {
    return financeOrders.flatMap((order) => {
      const repasseValor = order.total * (repassePercentual / 100)

      const txs: FinanceTransaction[] = [
        {
          id: `${order.id}-entrada`,
          orderId: order.id,
          label: `${order.code}${order.customerName ? ` - ${order.customerName}` : ''}`,
          amount: order.total,
          repasse: repasseValor,
          type: 'entrada',
          date: order.createdAt,
        },
      ]

      if (order.serviceFee > 0) {
        txs.push({
          id: `${order.id}-taxa`,
          orderId: order.id,
          label: `Taxa da plataforma ${order.code}`,
          amount: -order.serviceFee,
          repasse: null,
          type: 'saida',
          date: order.createdAt,
        })
      }

      return txs
    })
  }, [financeOrders, repassePercentual])

  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'entradas') return tx.type === 'entrada'
      if (txFilter === 'saidas') return tx.type === 'saida'
      return true
    })
  }, [transactions, txFilter])

  const totalEntradas = useMemo(
    () => transactions.filter((tx) => tx.type === 'entrada').reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  )

  const totalSaidas = useMemo(
    () => transactions.filter((tx) => tx.type === 'saida').reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    [transactions]
  )

  const saldoLiquido = totalEntradas - totalSaidas

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

  const valorRepasse = totalEntradas * (repassePercentual / 100)

  const averageTicket = financeOrders.length ? totalEntradas / financeOrders.length : 0
  const latestMovementAt = transactions[0]?.date ?? null

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Saidas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-coral-50">
              <ArrowUpRight className="h-4 w-4 text-coral-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-coral-500">{formatCurrency(totalSaidas)}</p>
          <p className="mt-1 text-xs text-ink-400">taxas registradas nos pedidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="panel-card border-l-4 border-l-violet-400 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Repasse</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-50">
              <Percent className="h-4 w-4 text-violet-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-violet-600">{formatCurrency(valorRepasse)}</p>
          <p className="mt-1 text-xs text-ink-400">
            {repassePercentual}% do faturamento bruto do periodo
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
                { id: 'entradas', label: 'Entradas' },
                { id: 'saidas', label: 'Saidas' },
              ]}
              value={txFilter}
              onChange={setTxFilter}
            />
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
              {filteredTxs.map((tx) => (
                <li key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                      tx.type === 'entrada' ? 'bg-green-50' : 'bg-coral-50'
                    )}
                  >
                    {tx.type === 'entrada' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-coral-500" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{tx.label}</p>
                    <p className="text-xs text-ink-400">{formatShortDate(tx.date)}</p>
                  </div>
                  {tx.repasse !== null && (
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Repasse</p>
                      <p className="text-sm font-bold text-violet-600">+{formatCurrency(tx.repasse)}</p>
                    </div>
                  )}
                  <p className={cn('shrink-0 text-sm font-bold', tx.type === 'entrada' ? 'text-green-600' : 'text-coral-500')}>
                    {tx.type === 'saida' ? '-' : '+'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-3.5">
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
            <p className="mt-1 text-xs text-white/60">saldo liquido calculado com os pedidos salvos no banco</p>
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
