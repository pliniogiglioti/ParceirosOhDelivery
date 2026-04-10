import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { ShoppingBag } from 'lucide-react'
import { createElement } from 'react'
import { playOrderSound } from '@/lib/orderSound'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'

const REPEAT_MS = 10_000

export function useOrderNotifications(storeId: string) {
  // Single store subscription — avoids unstable selector hooks
  const { ordersByStoreId, orderSettingsByStoreId } = usePartnerSimulationStore()

  const orders   = ordersByStoreId[storeId]   ?? []
  const settings = orderSettingsByStoreId[storeId]

  const seenIds  = useRef<Set<string>>(new Set())
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!storeId) return

    const soundEnabled = settings?.playSound !== false
    const model        = settings?.soundModel ?? 'balcao'
    const notifEnabled = settings?.showNotification !== false

    // ── Detect genuinely new pending orders ──
    const pending   = orders.filter((o) => o.status === 'aguardando')
    const newOrders = pending.filter((o) => !seenIds.current.has(o.id))

    // Always register all known ids so we don't re-fire on re-render
    orders.forEach((o) => seenIds.current.add(o.id))

    newOrders.forEach((order) => {
      if (soundEnabled) playOrderSound(model)

      if (notifEnabled) {
        toast.custom(
          (t) =>
            createElement(
              'div',
              {
                className: [
                  'flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3',
                  t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
                ].join(' '),
              },
              createElement(
                'span',
                { className: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-50' },
                createElement(ShoppingBag, { className: 'h-4 w-4 text-coral-500' })
              ),
              createElement(
                'div',
                null,
                createElement('p', { className: 'text-sm font-semibold text-ink-900' }, 'Novo pedido recebido!'),
                createElement('p', { className: 'text-xs text-ink-500' }, `#${order.code} · ${order.customerName}`)
              )
            ),
          { duration: 6000, position: 'top-right' }
        )
      }
    })

    // ── Repeat every 10 s while any order is still pending ──
    const hasPending = pending.length > 0

    if (hasPending && soundEnabled) {
      if (!interval.current) {
        interval.current = setInterval(() => playOrderSound(model), REPEAT_MS)
      }
    } else {
      if (interval.current) {
        clearInterval(interval.current)
        interval.current = null
      }
    }

    return () => {
      if (interval.current) {
        clearInterval(interval.current)
        interval.current = null
      }
    }
  })   // ← intentionally no dep array: runs every render, interval managed by ref
}
