import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, QrCode, TrendingUp, Wallet } from 'lucide-react'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

type Period = 'semana' | 'mes' | 'trimestre'
type TxFilter = 'todas' | 'entradas' | 'saidas'

const PAYMENT_ICON: Record<string, React.ElementType> = {
  'Credito': CreditCard,
  'Debito':  Wallet,
  'Pix':     QrCode,
}
const PAYMENT_COLOR: Record<string, { bg: string; text: string }> = {
  'Credito': { bg: 'bg-blue-50',       text: 'text-blue-600'   },
  'Debito':  { bg: 'bg-indigo-50',     text: 'text-indigo-600' },
  'Pix':     { bg: 'bg-[#14c8bb]/10', text: 'text-[#0fa89d]'  },
}

const ALL_TRANSACTIONS = [
  { id: 'r1', label: 'Repasse semanal',   amount:  1240.00, type: 'entrada' as const, date: '05/04/2026', period: 'semana'    },
  { id: 'r2', label: 'Taxa de serviço',   amount:  -148.80, type: 'saida'   as const, date: '05/04/2026', period: 'semana'    },
  { id: 'r3', label: 'Ajuste financeiro', amount:    45.00, type: 'entrada' as const, date: '06/04/2026', period: 'semana'    },
  { id: 'r4', label: 'Repasse semanal',   amount:   980.50, type: 'entrada' as const, date: '29/03/2026', period: 'mes'       },
  { id: 'r5', label: 'Taxa de serviço',   amount:  -117.66, type: 'saida'   as const, date: '29/03/2026', period: 'mes'       },
  { id: 'r6', label: 'Repasse semanal',   amount:  1105.00, type: 'entrada' as const, date: '22/03/2026', period: 'mes'       },
  { id: 'r7', label: 'Taxa de serviço',   amount:  -132.60, type: 'saida'   as const, date: '22/03/2026', period: 'mes'       },
  { id: 'r8', label: 'Repasse semanal',   amount:   870.00, type: 'entrada' as const, date: '08/03/2026', period: 'trimestre' },
  { id: 'r9', label: 'Taxa de serviço',   amount:  -104.40, type: 'saida'   as const, date: '08/03/2026', period: 'trimestre' },
  { id: 'r10',label: 'Repasse semanal',   amount:  1320.00, type: 'entrada' as const, date: '01/03/2026', period: 'trimestre' },
]

const PERIOD_INCLUDES: Record<Period, string[]> = {
  semana:     ['semana'],
  mes:        ['semana', 'mes'],
  trimestre:  ['semana', 'mes', 'trimestre'],
}

const PERIOD_LABEL: Record<Period, string> = {
  semana:    'Esta semana',
  mes:       'Este mês',
  trimestre: 'Último trimestre',
}

const REVENUE_MULT: Record<Period, number> = { semana: 1, mes: 4.2, trimestre: 13 }

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

export function PartnerFinancePage() {
  const { data } = usePartnerPageData()

  const [period,   setPeriod]   = useState<Period>('semana')
  const [txFilter, setTxFilter] = useState<TxFilter>('todas')

  const periodTxs = ALL_TRANSACTIONS.filter((t) => PERIOD_INCLUDES[period].includes(t.period))

  const filteredTxs = periodTxs.filter((t) => {
    if (txFilter === 'entradas') return t.type === 'entrada'
    if (txFilter === 'saidas')   return t.type === 'saida'
    return true
  })

  const totalEntradas = periodTxs.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0)
  const totalSaidas   = periodTxs.filter((t) => t.type === 'saida').reduce((s, t) => s + Math.abs(t.amount), 0)
  const saldo         = totalEntradas - totalSaidas

  const mult = REVENUE_MULT[period]

  const paymentBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    const counts = new Map<string, number>()
    data.orders.forEach((o) => {
      totals.set(o.paymentMethod, (totals.get(o.paymentMethod) ?? 0) + o.total * mult)
      counts.set(o.paymentMethod, (counts.get(o.paymentMethod) ?? 0) + 1)
    })
    const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0)
    return Array.from(totals.entries()).map(([label, total]) => ({
      label, total,
      count: counts.get(label) ?? 0,
      pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
  }, [data.orders, mult])

  return (
    <SectionFrame eyebrow="Financeiro" title="Saude financeira">

      {/* Period filter */}
      <div className="flex items-center justify-between pl-1">
        <p className="text-xs text-ink-400">
          Periodo: <span className="font-semibold text-ink-700">{PERIOD_LABEL[period]}</span>
        </p>
        <Tabs
          options={[
            { id: 'semana',    label: 'Esta semana'       },
            { id: 'mes',       label: 'Este mês'          },
            { id: 'trimestre', label: 'Último trimestre'  },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Faturamento</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">
            {formatCurrency(data.metrics.grossRevenue * mult)}
          </p>
          <p className="mt-1 text-xs text-ink-400">{PERIOD_LABEL[period].toLowerCase()}</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ticket medio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">
            {formatCurrency(data.metrics.averageTicket)}
          </p>
          <p className="mt-1 text-xs text-ink-400">por pedido</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Entradas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
          <p className="mt-1 text-xs text-ink-400">repasses recebidos</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Saidas</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-coral-50">
              <ArrowUpRight className="h-4 w-4 text-coral-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-coral-500">{formatCurrency(totalSaidas)}</p>
          <p className="mt-1 text-xs text-ink-400">taxas descontadas</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Transactions */}
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
            <p className="text-sm font-semibold text-ink-900">Extrato de repasses</p>
            <Tabs
              options={[
                { id: 'todas',    label: 'Todas'    },
                { id: 'entradas', label: 'Entradas' },
                { id: 'saidas',   label: 'Saídas'   },
              ]}
              value={txFilter}
              onChange={setTxFilter}
            />
          </div>

          {filteredTxs.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-ink-400">Nenhuma transação neste filtro.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filteredTxs.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                    t.type === 'entrada' ? 'bg-green-50' : 'bg-coral-50'
                  )}>
                    {t.type === 'entrada'
                      ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight  className="h-4 w-4 text-coral-500" />
                    }
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{t.label}</p>
                    <p className="text-xs text-ink-400">{t.date}</p>
                  </div>
                  <p className={cn('text-sm font-bold', t.type === 'entrada' ? 'text-green-600' : 'text-coral-500')}>
                    {t.type === 'entrada' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-3.5">
            <p className="text-sm font-semibold text-ink-700">Saldo do período</p>
            <p className={cn('text-sm font-bold', saldo >= 0 ? 'text-green-600' : 'text-coral-500')}>
              {saldo >= 0 ? '+' : '-'}{formatCurrency(Math.abs(saldo))}
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Por forma de pagamento</p>
            <div className="mt-4 space-y-4">
              {paymentBreakdown.map(({ label, total, count, pct }) => {
                const Icon = PAYMENT_ICON[label] ?? CreditCard
                const colors = PAYMENT_COLOR[label] ?? { bg: 'bg-ink-100', text: 'text-ink-600' }
                return (
                  <div key={label}>
                    <div className="mb-2 flex items-center gap-3">
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl', colors.bg, colors.text)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-ink-900">{label}</p>
                          <p className="text-xs font-bold text-ink-900">{formatCurrency(total)}</p>
                        </div>
                        <p className="text-[10px] text-ink-400">{count} {count === 1 ? 'pedido' : 'pedidos'}</p>
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
          </div>

          <div className="panel-card bg-ink-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Proximo repasse</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">Sexta-feira</p>
            <p className="mt-1 text-xs text-white/60">até as 18h · direto na conta</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs font-medium text-green-400">Sem pendencias</span>
            </div>
          </div>
        </div>

      </div>
    </SectionFrame>
  )
}
