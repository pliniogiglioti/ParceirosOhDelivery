import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerPaymentsPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Pagamentos" title="Formas aceitas na operacao">
      <div className="grid gap-4 md:grid-cols-3">
        {data.paymentMethods.map((method) => (
          <article key={method.id} className="panel-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink-900">{method.label}</h3>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  method.active ? 'bg-mint-100 text-mint-700' : 'bg-ink-100 text-ink-600'
                )}
              >
                {method.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="mt-4 text-sm text-ink-500">{method.detail}</p>
          </article>
        ))}
      </div>
    </SectionFrame>
  )
}
