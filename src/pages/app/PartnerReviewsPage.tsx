import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerReviewsPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Avaliacoes" title="Feedback recente dos clientes">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="panel-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Media geral</p>
          <p className="mt-3 font-display text-5xl font-bold text-ink-900">{data.store.rating.toFixed(1)}</p>
          <p className="mt-3 text-sm text-ink-500">{data.store.reviewCount} avaliacoes publicas da loja.</p>
        </article>
        <article className="panel-card p-6">
          <div className="space-y-3">
            {data.reviews.map((review) => (
              <div key={review.id} className="rounded-3xl bg-ink-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink-900">{review.author}</p>
                  <p className="text-sm font-medium text-sand-700">{review.rating}/5</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </SectionFrame>
  )
}
