import { useMemo } from 'react'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatCurrency } from '@/lib/utils'
import { MetricCard, SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerFinancePage() {
  const { data } = usePartnerPageData()

  const paymentBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    data.orders.forEach((order) => {
      totals.set(order.paymentMethod, (totals.get(order.paymentMethod) ?? 0) + order.total)
    })
    return Array.from(totals.entries())
  }, [data.orders])

  return (
    <SectionFrame eyebrow="Financeiro" title="Saude financeira do parceiro">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Faturamento" value={formatCurrency(data.metrics.grossRevenue)} helper="Volume do dia no painel." />
        <MetricCard label="Ticket medio" value={formatCurrency(data.metrics.averageTicket)} helper="Media por pedido fechado." />
        <MetricCard label="Taxa media de entrega" value={formatCurrency(data.store.deliveryFee)} helper="Configuracao atual da loja." />
      </div>
      <div className="panel-card p-6">
        <h3 className="text-lg font-bold text-ink-900">Recebimentos por forma de pagamento</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {paymentBreakdown.map(([label, total]) => (
            <div key={label} className="rounded-3xl bg-sand-50 p-4">
              <p className="text-sm font-semibold text-sand-700">{label}</p>
              <p className="mt-2 text-xl font-bold text-ink-900">{formatCurrency(total)}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  )
}
