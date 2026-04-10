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
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

type Period = 'hoje' | 'semana' | 'mes'
type StatusFilter = 'todos' | 'pendentes' | 'preparo' | 'entregues'

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  confirmado: 'Confirmado',
  preparo:    'Em preparo',
  a_caminho:  'A caminho',
  entregue:   'Entregue',
  cancelado:  'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: 'bg-yellow-50 text-yellow-700',
  confirmado: 'bg-blue-50 text-blue-700',
  preparo:    'bg-orange-50 text-orange-700',
  a_caminho:  'bg-[#14c8bb]/10 text-[#0fa89d]',
  entregue:   'bg-green-50 text-green-700',
  cancelado:  'bg-ink-100 text-ink-500',
}

// Simulated multipliers per period so KPIs react to filter
const PERIOD_MULTIPLIER: Record<Period, number> = { hoje: 1, semana: 6.4, mes: 27 }
const PERIOD_LABEL: Record<Period, string> = { hoje: 'hoje', semana: 'esta semana', mes: 'este mês' }

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

export function PartnerOverviewPage() {
  const { data } = usePartnerPageData()
  const navigate = useNavigate()

  const [period, setPeriod]         = useState<Period>('hoje')
  const [statusFilter, setStatus]   = useState<StatusFilter>('todos')

  const mult = PERIOD_MULTIPLIER[period]

  const scaledRevenue       = data.metrics.grossRevenue * mult
  const scaledOrders        = Math.round(data.metrics.todayOrders * mult)
  const scaledAverageTicket = data.metrics.averageTicket
  const scaledPending       = data.metrics.pendingOrders

  const filteredOrders = data.orders.filter((o) => {
    if (statusFilter === 'pendentes') return ['aguardando', 'confirmado'].includes(o.status)
    if (statusFilter === 'preparo')   return o.status === 'preparo'
    if (statusFilter === 'entregues') return o.status === 'entregue'
    return true
  }).slice(0, 6)

  const rating = data.store.rating.toFixed(1)

  return (
    <SectionFrame eyebrow="Inicio" title="Visao geral">

      {/* Period filter */}
      <div className="flex items-center justify-between pl-1">
        <p className="text-xs text-ink-400">Exibindo dados de <span className="font-semibold text-ink-700">{PERIOD_LABEL[period]}</span></p>
        <Tabs
          options={[
            { id: 'hoje',   label: 'Hoje'        },
            { id: 'semana', label: 'Esta semana'  },
            { id: 'mes',    label: 'Este mês'     },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Receita</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{formatCurrency(scaledRevenue)}</p>
          <p className="mt-1 text-xs text-ink-400">{PERIOD_LABEL[period]}</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Pedidos</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{scaledOrders}</p>
          <p className="mt-1 text-xs text-ink-400">{PERIOD_LABEL[period]}</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Ticket medio</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{formatCurrency(scaledAverageTicket)}</p>
          <p className="mt-1 text-xs text-ink-400">por pedido</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Pendentes</p>
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-2xl', scaledPending > 0 ? 'bg-coral-50' : 'bg-ink-50')}>
              <ClipboardList className={cn('h-4 w-4', scaledPending > 0 ? 'text-coral-500' : 'text-ink-400')} />
            </span>
          </div>
          <p className={cn('mt-3 font-display text-3xl font-bold', scaledPending > 0 ? 'text-coral-500' : 'text-ink-900')}>
            {scaledPending}
          </p>
          <p className="mt-1 text-xs text-ink-400">aguardando acao</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

        {/* Orders */}
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
            <p className="text-sm font-semibold text-ink-900">Pedidos recentes</p>
            <div className="flex items-center gap-3">
              <Tabs
                options={[
                  { id: 'todos',     label: 'Todos'      },
                  { id: 'pendentes', label: 'Pendentes'  },
                  { id: 'preparo',   label: 'Preparo'    },
                  { id: 'entregues', label: 'Entregues'  },
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

          {filteredOrders.length === 0 ? (
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

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Sua loja</p>
            <p className="mt-2 font-display text-base font-bold text-ink-900">{data.store.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500 line-clamp-2">{data.store.tagline}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-ink-50 p-3 text-center">
                <Star className="mx-auto h-4 w-4 text-yellow-400" />
                <p className="mt-1 text-sm font-bold text-ink-900">{rating}</p>
                <p className="text-[10px] text-ink-400">Nota</p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-3 text-center">
                <Clock className="mx-auto h-4 w-4 text-blue-500" />
                <p className="mt-1 text-sm font-bold text-ink-900">{data.store.etaMin}-{data.store.etaMax}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Logistica</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">Tempo medio de preparo</p>
                <p className="text-sm font-bold text-white">{data.logistics.averagePrepTime}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70">Entregas no prazo</p>
                <p className="text-sm font-bold text-white">{data.logistics.onTimeRate}</p>
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
