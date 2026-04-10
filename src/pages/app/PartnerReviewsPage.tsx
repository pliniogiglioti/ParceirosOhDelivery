import { MessageSquare, Star, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

type Filter = 'todas' | 'positivas' | 'negativas'

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn('h-3.5 w-3.5', i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-ink-200')}
        />
      ))}
    </span>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-right text-xs font-semibold text-ink-600">{label}</span>
      <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-right text-xs text-ink-400">{count}</span>
    </div>
  )
}

export function PartnerReviewsPage() {
  const { data } = usePartnerPageData()
  const [filter, setFilter] = useState<Filter>('todas')

  const reviews = data.reviews
  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
  const positive = reviews.filter((r) => r.rating >= 4).length
  const negative = reviews.filter((r) => r.rating <= 2).length
  const neutral  = total - positive - negative

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  const filtered = reviews.filter((r) => {
    if (filter === 'positivas') return r.rating >= 4
    if (filter === 'negativas') return r.rating <= 2
    return true
  })

  return (
    <SectionFrame eyebrow="Avaliacoes" title="Feedback dos clientes">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Media geral</p>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">{avg.toFixed(1)}</p>
          <StarRow rating={Math.round(avg)} />
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Total</p>
            <MessageSquare className="h-4 w-4 text-ink-400" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">{total}</p>
          <p className="mt-1 text-xs text-ink-400">avaliacoes publicas</p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Positivas</p>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">{positive}</p>
          <p className="mt-1 text-xs text-ink-400">
            {total > 0 ? Math.round((positive / total) * 100) : 0}% do total
          </p>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Negativas</p>
            <ThumbsDown className="h-4 w-4 text-coral-500" />
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">{negative}</p>
          <p className="mt-1 text-xs text-ink-400">
            {total > 0 ? Math.round((negative / total) * 100) : 0}% do total
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Review list */}
        <div className="flex flex-col gap-3">
          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['todas', 'positivas', 'negativas'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-2xl px-4 py-2 text-xs font-semibold capitalize transition',
                  filter === f
                    ? 'bg-ink-900 text-white'
                    : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
                )}
              >
                {f === 'todas' ? `Todas (${total})` : f === 'positivas' ? `Positivas (${positive})` : `Negativas (${negative})`}
              </button>
            ))}
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="panel-card flex items-center justify-center py-14">
              <p className="text-sm text-ink-400">Nenhuma avaliacao nesta categoria.</p>
            </div>
          ) : (
            <div className="panel-card divide-y divide-ink-100 overflow-hidden">
              {filtered.map((review) => (
                <div key={review.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
                        {review.author.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{review.author}</p>
                        <StarRow rating={review.rating} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                          review.rating >= 4
                            ? 'bg-green-50 text-green-600'
                            : review.rating <= 2
                            ? 'bg-coral-50 text-coral-600'
                            : 'bg-ink-100 text-ink-500'
                        )}
                      >
                        {review.rating >= 4 ? 'Positiva' : review.rating <= 2 ? 'Negativa' : 'Neutra'}
                      </span>
                      <span className="text-[11px] text-ink-400">{review.createdAt}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel — distribution */}
        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Distribuicao</p>
            <div className="mt-4 space-y-3">
              {dist.map((d) => (
                <RatingBar key={d.star} label={String(d.star)} count={d.count} total={total} />
              ))}
            </div>
          </div>

          <div className="panel-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Satisfacao</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink-900">
              {total > 0 ? Math.round((positive / total) * 100) : 0}%
            </p>
            <p className="mt-1 text-xs text-ink-400">clientes satisfeitos</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Positivas</span>
                <span className="font-semibold text-green-600">{positive}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Neutras</span>
                <span className="font-semibold text-ink-600">{neutral}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Negativas</span>
                <span className="font-semibold text-coral-600">{negative}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </SectionFrame>
  )
}
