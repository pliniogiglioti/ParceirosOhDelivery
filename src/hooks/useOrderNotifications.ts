import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { ShoppingBag } from 'lucide-react'
import { createElement } from 'react'
import { playOrderSound } from '@/lib/orderSound'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'

const REPEAT_MS = 10_000

export function useOrderNotifications(storeId: string) {
  const { ordersByStoreId, orderSettingsByStoreId } = usePartnerSimulationStore()

  const orders   = ordersByStoreId[storeId]   ?? []
  const settings = orderSettingsByStoreId[storeId]

  const seenIds  = useRef<Set<string>>(new Set())
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  const soundEnabled = settings?.playSound !== false
  const model        = settings?.soundModel ?? 'balcao'
  const notifEnabled = settings?.showNotification !== false
  const hasPending   = orders.some((o) => o.status === 'aguardando')

  // ── Detect new arriving orders → play once + show toast ──
  useEffect(() => {
    if (!storeId) return

    const newOrders = orders
      .filter((o) => o.status === 'aguardando' && !seenIds.current.has(o.id))

    // Register all known IDs to avoid re-firing
    orders.forEach((o) => seenIds.current.add(o.id))

    if (newOrders.length === 0) return

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
          { duration: 8000, position: 'top-right' }
        )
      }
    })
  }, [orders, storeId, soundEnabled, notifEnabled, model]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Repeat sound every 10 s while orders remain pending ──
  useEffect(() => {
    if (!storeId || !soundEnabled || !hasPending) {
      if (interval.current) {
        clearInterval(interval.current)
        interval.current = null
      }
      return
    }

    // Start interval only if not already running
    if (!interval.current) {
      interval.current = setInterval(() => {
        playOrderSound(model)
      }, REPEAT_MS)
    }

    return () => {
      if (interval.current) {
        clearInterval(interval.current)
        interval.current = null
      }
    }
  }, [hasPending, soundEnabled, model, storeId])
}
