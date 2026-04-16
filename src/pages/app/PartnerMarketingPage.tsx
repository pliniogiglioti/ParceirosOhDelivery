import { Calendar, Eye, ShoppingBag, ShoppingCart, Store, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { fetchFunnelData } from '@/services/funnel'
import type { FunnelData, PeriodFilter } from '@/services/funnel'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

const FUNNEL_STEPS: Array<{
  key: keyof Omit<FunnelData, 'conversionRate'>
  label: string
  sublabel: string
  bg: string
  light: string
  textColor: string
  icon: React.ElementType
}> = [
  { key: 'visita',       label: 'Visitas',         sublabel: 'Acessaram a loja',       bg: '#3b82f6', light: '#eff6ff', textColor: '#1d4ed8', icon: Store },
  { key: 'visualizacao', label: 'Visualizacoes',    sublabel: 'Viram um produto',        bg: '#8b5cf6', light: '#f5f3ff', textColor: '#6d28d9', icon: Eye },
  { key: 'sacola',       label: 'Itens na sacola',  sublabel: 'Adicionaram ao carrinho', bg: '#f59e0b', light: '#fffbeb', textColor: '#b45309', icon: ShoppingCart },
  { key: 'revisao',      label: 'Revisao do pedido',sublabel: 'Abriram o checkout',      bg: '#f97316', light: '#fff7ed', textColor: '#c2410c', icon: ShoppingBag },
  { key: 'venda',        label: 'Concluidos',       sublabel: 'Concluiram o pedido',     bg: '#22c55e', light: '#f0fdf4', textColor: '#15803d', icon: Zap },
]

const PERIODS: Array<{ key: PeriodFilter; label: string }> = [
  { key: 'hoje',          label: 'Hoje' },
  { key: '7dias',         label: '7 dias' },
  { key: '30dias',        label: '30 dias' },
  { key: 'personalizado', label: 'Personalizado' },
]

export function PartnerMarketingPage() {
  const { data } = usePartnerPageData()
  const storeId = data.store.id

  const [period, setPeriod] = useState<PeriodFilter>('7dias')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (period === 'personalizado' && (!customFrom || !customTo)) return

    let active = true
    setLoading(true)

    fetchFunnelData(storeId, period, customFrom, customTo)
      .then((result) => { if (active) setFunnel(result) })
      .catch(() => { if (active) toast.error('Nao foi possivel carregar o funil.') })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [storeId, period, customFrom, customTo])

  const topValue = funnel?.visita ?? 0

  function stepPct(from: number, to: number) {
    if (from === 0) return 0
    return Math.round((to / from) * 100)
  }

  return (
    <SectionFrame eyebrow="Marketing" title="Funil de conversao">

      {/* Filtro de período */}
      <div className="panel-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-ink-400" />
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-2xl px-4 py-2 text-xs font-semibold transition',
                period === p.key
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
              )}
            >
              {p.label}
            </button>
          ))}
          {period === 'personalizado' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-2xl border border-ink-100 bg-white px-3 text-xs text-ink-900 outline-none focus:border-coral-400"
              />
              <span className="text-xs text-ink-400">ate</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-2xl border border-ink-100 bg-white px-3 text-xs text-ink-900 outline-none focus:border-coral-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Visitas</p>
            <Store className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">
            {loading ? '—' : (funnel?.visita ?? 0).toLocaleString('pt-BR')}
          </p>
          <p className="mt-1 text-xs text-ink-400">acessos a loja</p>
        </div>
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Vendas</p>
            <Zap className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">
            {loading ? '—' : (funnel?.venda ?? 0).toLocaleString('pt-BR')}
          </p>
          <p className="mt-1 text-xs text-ink-400">pedidos concluidos</p>
        </div>
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Conversao</p>
            <TrendingUp className="h-4 w-4 text-coral-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">
            {loading ? '—' : `${funnel?.conversionRate ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-ink-400">vendas / visitas</p>
        </div>
      </div>

      {/* Funil — cards lado a lado */}
      <div className="panel-card p-5">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">Funil de conversao</p>

        {loading ? (
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-ink-100">
                <div className="p-3.5 space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-6 w-12 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-3 w-10 animate-pulse rounded-full bg-ink-100" />
                </div>
                <div className="h-10 animate-pulse bg-ink-100" />
              </div>
            ))}
          </div>
        ) : !funnel || funnel.visita === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <TrendingUp className="h-10 w-10 text-ink-200" />
            <p className="text-sm text-ink-400">Nenhum evento registrado neste periodo.</p>
            <p className="text-xs text-ink-300">Os eventos sao registrados automaticamente quando clientes interagem com sua loja.</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {FUNNEL_STEPS.map((step, i) => {
              const val = funnel[step.key]
              const pctTop = topValue > 0 ? Math.round((val / topValue) * 100) : 0
              const prevVal = i > 0 ? funnel[FUNNEL_STEPS[i - 1].key] : null
              const pctPrev = prevVal !== null ? stepPct(prevVal, val) : null

              const nextVal = i < FUNNEL_STEPS.length - 1 ? funnel[FUNNEL_STEPS[i + 1].key] : val
              const nextPctTop = topValue > 0 ? Math.round((nextVal / topValue) * 100) : pctTop

              const footerH = Math.max(56, Math.round((pctTop / 100) * 200))
              const leftY = Math.round((1 - pctTop / 100) * 60)
              const rightY = Math.round((1 - nextPctTop / 100) * 60)
              const cpY = Math.round((leftY + rightY) / 2)

              return (
                <div key={step.key} className="flex flex-col overflow-hidden rounded-2xl border border-ink-100" style={{ minHeight: 260 }}>
                  {/* Topo */}
                  <div className="flex-1 p-3.5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: step.bg }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-xs font-semibold text-ink-700 leading-tight">{step.label}</p>
                    </div>
                    <p className="text-xl font-bold text-ink-900 leading-none">
                      {val.toLocaleString('pt-BR')}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">{step.sublabel}</p>
                    {pctPrev !== null && (
                      <span
                        className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: step.light, color: step.textColor }}
                      >
                        ↑ {pctPrev}% acima
                      </span>
                    )}
                  </div>
                  {/* Rodapé colorido — curva SVG proporcional */}
                  <div className="relative overflow-hidden" style={{ height: footerH }}>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full"
                    >
                      <path
                        d={`M0,${leftY} C40,${cpY} 60,${cpY} 100,${rightY} L100,100 L0,100 Z`}
                        fill={step.bg}
                      />
                    </svg>
                    <p className="absolute bottom-3 left-0 right-0 text-center text-lg font-bold text-white">{pctTop}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </SectionFrame>
  )
}
