import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, ShoppingBag, X } from 'lucide-react'
import { createElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { playOrderSound } from '@/lib/orderSound'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import type { PartnerOrder, PartnerOrderSettings } from '@/types'

const REPEAT_MS = 10_000
const STAGE_LIMIT_MS = 5 * 60 * 1000

function canExpire(order: PartnerOrder) {
  return order.status === 'aguardando' || order.status === 'preparo' || order.status === 'confirmado'
}

function lateOrderKey(order: PartnerOrder) {
  return `${order.id}:${order.status}:${order.stageStartedAt ?? order.createdAt}`
}

function getLateStageLimitMs(order: PartnerOrder, settings?: PartnerOrderSettings) {
  if (order.status === 'preparo') return Math.max(settings?.prepareTime ?? 5, 1) * 60 * 1000
  return STAGE_LIMIT_MS
}

function isLateOrder(order: PartnerOrder, settings?: PartnerOrderSettings, now = Date.now()) {
  if (!canExpire(order)) return false

  const startedAt = order.stageStartedAt ?? order.createdAt
  return new Date(startedAt).getTime() + getLateStageLimitMs(order, settings) <= now
}

export function useOrderNotifications(storeId: string) {
  const navigate = useNavigate()
  const { ordersByStoreId, orderSettingsByStoreId } = usePartnerDraftStore()

  const orders   = ordersByStoreId[storeId]   ?? []
  const settings = orderSettingsByStoreId[storeId]

  const seenIds  = useRef<Set<string>>(new Set())
  const lateAlertedKeys = useRef<Set<string>>(new Set())
  const lateAlertsReady = useRef(false)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const lateInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const lateRepeatInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const soundEnabled = settings?.playSound !== false
  const lateSoundEnabled = settings?.playLateOrderSound !== false
  const lateSoundModel = settings?.lateOrderSoundModel ?? 'alerta'
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
                  'flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-soft transition hover:border-coral-200',
                  t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
                ].join(' '),
                role: 'button',
                tabIndex: 0,
                onClick: () => {
                  toast.dismiss(t.id)
                  navigate(`/app/pedidos?orderId=${order.id}`)
                },
                onKeyDown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toast.dismiss(t.id)
                    navigate(`/app/pedidos?orderId=${order.id}`)
                  }
                },
              },
              createElement(
                'span',
                { className: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-50' },
                createElement(ShoppingBag, { className: 'h-4 w-4 text-coral-500' })
              ),
              createElement(
                'div',
                { className: 'min-w-0 flex-1 pr-2' },
                createElement('p', { className: 'text-sm font-semibold text-ink-900' }, 'Novo pedido recebido!'),
                createElement('p', { className: 'text-xs text-ink-500' }, `#${order.code} · ${order.customerName}`)
              ),
              createElement(
                'button',
                {
                  type: 'button',
                  className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700',
                  'aria-label': 'Fechar notificacao',
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation()
                    toast.dismiss(t.id)
                  },
                },
                createElement(X, { className: 'h-3.5 w-3.5' })
              )
            ),
          { duration: 8000, position: 'bottom-right' }
        )
      }
    })
  }, [orders, storeId, soundEnabled, notifEnabled, model, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Play the urgent alert when an order stage becomes late, then repeat on the default cadence ──
  useEffect(() => {
    if (!storeId || !lateSoundEnabled) {
      if (lateInterval.current) {
        clearInterval(lateInterval.current)
        lateInterval.current = null
      }
      if (lateRepeatInterval.current) {
        clearInterval(lateRepeatInterval.current)
        lateRepeatInterval.current = null
      }
      return
    }

    function hasLateOrdersToRepeat() {
      return orders.some((order) => isLateOrder(order, settings) && lateAlertedKeys.current.has(lateOrderKey(order)))
    }

    function checkLateOrders() {
      const knownKeys = new Set(orders.map(lateOrderKey))
      lateAlertedKeys.current.forEach((key) => {
        if (!knownKeys.has(key)) lateAlertedKeys.current.delete(key)
      })

      const lateOrders = orders.filter((order) => {
        const key = lateOrderKey(order)
        return isLateOrder(order, settings) && !lateAlertedKeys.current.has(key)
      })

      if (!lateAlertsReady.current) {
        lateOrders.forEach((order) => lateAlertedKeys.current.add(lateOrderKey(order)))
        lateAlertsReady.current = orders.length > 0
        return
      }

      lateOrders.forEach((order) => {
        const key = lateOrderKey(order)
        lateAlertedKeys.current.add(key)
        playOrderSound(lateSoundModel)

        if (notifEnabled) {
          toast.custom(
            (t) =>
              createElement(
                'div',
                {
                  className: [
                    'flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-soft transition hover:border-coral-200',
                    t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
                  ].join(' '),
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => {
                    toast.dismiss(t.id)
                    navigate(`/app/pedidos?orderId=${order.id}`)
                  },
                  onKeyDown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toast.dismiss(t.id)
                      navigate(`/app/pedidos?orderId=${order.id}`)
                    }
                  },
                },
                createElement(
                  'span',
                  { className: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-50' },
                  createElement(AlertTriangle, { className: 'h-4 w-4 text-coral-500' })
                ),
                createElement(
                  'div',
                  { className: 'min-w-0 flex-1 pr-2' },
                  createElement('p', { className: 'text-sm font-semibold text-ink-900' }, 'Pedido atrasado!'),
                  createElement('p', { className: 'text-xs text-ink-500' }, `${order.code} · ${order.customerName}`)
                ),
                createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700',
                    'aria-label': 'Fechar notificacao',
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      toast.dismiss(t.id)
                    },
                  },
                  createElement(X, { className: 'h-3.5 w-3.5' })
                )
              ),
            { duration: 8000, position: 'bottom-right' }
          )
        }
      })
    }

    checkLateOrders()

    if (!lateInterval.current) {
      lateInterval.current = setInterval(checkLateOrders, 1000)
    }

    if (!lateRepeatInterval.current) {
      lateRepeatInterval.current = setInterval(() => {
        if (hasLateOrdersToRepeat()) {
          playOrderSound(lateSoundModel)
        }
      }, REPEAT_MS)
    }

    return () => {
      if (lateInterval.current) {
        clearInterval(lateInterval.current)
        lateInterval.current = null
      }
      if (lateRepeatInterval.current) {
        clearInterval(lateRepeatInterval.current)
        lateRepeatInterval.current = null
      }
    }
  }, [orders, storeId, lateSoundEnabled, lateSoundModel, settings, notifEnabled, navigate])
}
