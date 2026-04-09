import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerDeliveryAreasPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Areas" title="Cobertura de entrega">
      <div className="grid gap-4 md:grid-cols-3">
        {data.deliveryAreas.map((area) => (
          <article key={area.id} className="panel-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink-900">{area.name}</h3>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  area.active ? 'bg-mint-100 text-mint-700' : 'bg-coral-100 text-coral-700'
                )}
              >
                {area.active ? 'Ativa' : 'Pausada'}
              </span>
            </div>
            <p className="mt-4 text-sm text-ink-500">Prazo medio: {area.etaLabel}</p>
            <p className="mt-2 text-xl font-bold text-ink-900">{formatCurrency(area.fee)}</p>
          </article>
        ))}
      </div>
    </SectionFrame>
  )
}
