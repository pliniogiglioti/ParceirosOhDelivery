import { MessageSquare, Reply, Star, ThumbsDown, ThumbsUp, TrendingUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { replyToReview } from '@/services/partner'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'
import type { ReviewItem } from '@/types'

type Filter = 'todas' | 'positivas' | 'negativas' | 'sem_resposta'

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

function ReplyBox({
  review,
  storeId,
  onSaved,
}: {
  review: ReviewItem
  storeId: string
  onSaved: (reviewId: string, reply: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(review.ownerReply ?? '')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Open in edit mode if there's already a reply
  function handleOpen() {
    setText(review.ownerReply ?? '')
    setOpen(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handleSave() {
    if (!text.trim() && !review.ownerReply) return
    setSaving(true)
    try {
      await replyToReview(review.id, text)
      onSaved(review.id, text.trim())
      toast.success(text.trim() ? 'Resposta salva.' : 'Resposta removida.')
      setOpen(false)
    } catch {
      toast.error('Nao foi possivel salvar a resposta.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        {review.ownerReply ? (
          <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Reply className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Sua resposta
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpen}
                className="text-[11px] font-semibold text-coral-500 hover:text-coral-600 transition"
              >
                Editar
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{review.ownerReply}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-400 transition hover:text-ink-700"
          >
            <Reply className="h-3.5 w-3.5" />
            Responder avaliacao
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {review.ownerReply ? 'Editar resposta' : 'Escrever resposta'}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-400 hover:text-ink-700 transition"
          aria-label="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Escreva sua resposta publica ao cliente..."
        className="w-full resize-none rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {review.ownerReply && (
          <button
            type="button"
            onClick={async () => {
              setSaving(true)
              try {
                await replyToReview(review.id, '')
                onSaved(review.id, '')
                toast.success('Resposta removida.')
                setOpen(false)
              } catch {
                toast.error('Nao foi possivel remover a resposta.')
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
            className="text-xs font-semibold text-coral-500 hover:text-coral-600 transition disabled:opacity-50"
          >
            Remover resposta
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-2xl border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (!text.trim() && !review.ownerReply)}
            className="rounded-2xl bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartnerReviewsPage() {
  const { data } = usePartnerPageData()
  const { updateReview, clearNewReviews } = usePartnerDraftStore()
  const [filter, setFilter] = useState<Filter>('todas')

  const storeId = data.store.id
  const reviews = data.reviews

  // Clear new reviews badge when user visits this page
  useEffect(() => {
    clearNewReviews(storeId)
  }, [storeId, clearNewReviews])

  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
  const positive = reviews.filter((r) => r.rating >= 4).length
  const negative = reviews.filter((r) => r.rating <= 2).length
  const neutral = total - positive - negative
  const withoutReply = reviews.filter((r) => !r.ownerReply).length
  const responseRate = total > 0 ? Math.round(((total - withoutReply) / total) * 100) : 0

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  const filtered = reviews.filter((r) => {
    if (filter === 'positivas') return r.rating >= 4
    if (filter === 'negativas') return r.rating <= 2
    if (filter === 'sem_resposta') return !r.ownerReply
    return true
  })

  function handleReplySaved(reviewId: string, reply: string) {
    updateReview(storeId, reviewId, {
      ownerReply: reply || null,
      ownerRepliedAt: reply ? new Date().toISOString() : null,
    })
  }

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
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'todas', label: `Todas (${total})` },
                { key: 'positivas', label: `Positivas (${positive})` },
                { key: 'negativas', label: `Negativas (${negative})` },
                { key: 'sem_resposta', label: `Sem resposta (${withoutReply})` },
              ] as { key: Filter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'rounded-2xl px-4 py-2 text-xs font-semibold capitalize transition',
                  filter === key
                    ? 'bg-ink-900 text-white'
                    : 'border border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
                )}
              >
                {label}
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
                        {review.author.slice(0, 1).toUpperCase()}
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
                      <span className="text-[11px] text-ink-400">
                        {new Date(review.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{review.comment}</p>
                  )}

                  <ReplyBox
                    review={review}
                    storeId={storeId}
                    onSaved={handleReplySaved}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel — distribution + satisfaction */}
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

          <div className="panel-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Respostas</p>
              <Reply className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink-900">{responseRate}%</p>
            <p className="mt-1 text-xs text-ink-400">taxa de resposta</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Respondidas</span>
                <span className="font-semibold text-ink-700">{total - withoutReply}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Sem resposta</span>
                <span className={cn('font-semibold', withoutReply > 0 ? 'text-coral-600' : 'text-ink-400')}>
                  {withoutReply}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </SectionFrame>
  )
}
