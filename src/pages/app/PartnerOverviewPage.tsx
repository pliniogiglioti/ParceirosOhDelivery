import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  MetricCard,
  MiniInfoCard,
  MiniInfoCardDark,
  SectionFrame,
} from '@/components/partner/PartnerUi'

export function PartnerOverviewPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Inicio" title="Visao geral da operacao">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Receita do dia" value={formatCurrency(data.metrics.grossRevenue)} helper="Baseada nos pedidos atuais do painel." />
        <MetricCard label="Pedidos do dia" value={String(data.metrics.todayOrders)} helper="Conta pedidos nao cancelados da data atual." />
        <MetricCard label="Ticket medio" value={formatCurrency(data.metrics.averageTicket)} helper="Indicador util para estrategia de combos." />
        <MetricCard label="Pendentes" value={String(data.metrics.pendingOrders)} helper="Pedidos aguardando fluxo operacional." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="panel-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Loja</p>
              <h3 className="mt-2 text-xl font-bold text-ink-900">{data.store.name}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">{data.store.description}</p>
            </div>
            <div className="rounded-3xl bg-coral-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral-500">Entrega</p>
              <p className="mt-1 text-lg font-bold text-coral-700">{data.store.etaMin}-{data.store.etaMax} min</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MiniInfoCard label="Taxa" value={formatCurrency(data.store.deliveryFee)} />
            <MiniInfoCard label="Avaliacoes" value={`${data.store.reviewCount}`} />
            <MiniInfoCard label="Nota" value={data.store.rating.toFixed(1)} />
          </div>
        </article>

        <article className="panel-card bg-ink-900 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Suporte e chat</p>
          <div className="mt-5 space-y-4">
            <MiniInfoCardDark label="Conversas abertas" value={String(data.support.openChats)} />
            <MiniInfoCardDark label="Mensagens nao lidas" value={String(data.support.unreadMessages)} />
            <MiniInfoCardDark label="Ultima atividade" value={formatDateTime(data.support.lastUpdateAt)} />
          </div>
        </article>
      </div>
    </SectionFrame>
  )
}
