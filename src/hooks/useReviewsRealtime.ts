import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReviewItem } from '@/types'

export function useReviewsRealtime(
  storeId: string,
  onNewReview: (review: ReviewItem) => void
) {
  // Keep a stable ref so the callback doesn't re-subscribe on every render
  const callbackRef = useRef(onNewReview)
  callbackRef.current = onNewReview

  useEffect(() => {
    if (!storeId || !supabase) return

    const channel = supabase
      .channel(`reviews:store:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_reviews',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const review: ReviewItem = {
            id: String(row.id),
            author: 'Cliente',
            rating: Number(row.rating ?? 0),
            comment: String(row.comment ?? ''),
            createdAt: String(row.created_at ?? new Date().toISOString()),
            ownerReply: null,
            ownerRepliedAt: null,
            tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
            orderId: row.order_id ? String(row.order_id) : null,
          }
          callbackRef.current(review)
        }
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [storeId])
}
