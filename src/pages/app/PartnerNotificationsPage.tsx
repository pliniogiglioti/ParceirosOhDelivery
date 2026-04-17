import { Bell, CheckCheck, ChevronRight, MessageCircle, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type NotifType = 'pedido' | 'mensagem'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  createdAt: string
  action: { label: string; to: string }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Ontem'
  return `${d} dias`
}

function getReadKey(storeId: string) {
  return `oh-notif-read:${storeId}`
}

function loadReadIds(storeId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getReadKey(storeId))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(storeId: string, ids: Set<string>) {
  localStorage.setItem(getReadKey(storeId), JSON.stringify([...ids]))
}

export function PartnerNotificationsPage() {
  const { data } = usePartnerPageData()
  const navigate = useNavigate()
  const storeId = data.store.id

  const [chatMessages, setChatMessages] = useState<Array<{
    id: string; chatId: string; orderCode: string; body: string; createdAt: string
  }>>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(storeId))

  // Carrega últimas mensagens de clientes (sender = 'user') das sessões da loja
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setLoadingMessages(false); return }
    let active = true

    supabase
      .from('chat_sessions')
      .select('id, order_code')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false })
      .limit(30)
      .then(async ({ data: sessions }) => {
        if (!active || !sessions?.length) { setLoadingMessages(false); return }
        const sessionIds = sessions.map((s) => s.id)
        const { data: msgs } = await supabase!
          .from('chat_messages')
          .select('id, chat_id, body, created_at')
          .in('chat_id', sessionIds)
          .eq('sender', 'user')
          .order('created_at', { ascending: false })
          .limit(50)

        if (!active) return
        const orderCodeById = new Map(sessions.map((s) => [s.id, s.order_code]))
        setChatMessages((msgs ?? []).map((m) => ({
          id: `msg-${m.id}`,
          chatId: String(m.chat_id),
          orderCode: orderCodeById.get(String(m.chat_id)) ?? '',
          body: String(m.body ?? ''),
          createdAt: String(m.created_at),
        })))
        setLoadingMessages(false)
      })
      .catch(() => setLoadingMessages(false))

    return () => { active = false }
  }, [storeId])

  // Monta lista de notificações: pedidos + mensagens, ordenados por data
  const notifications = useMemo<Notification[]>(() => {
    const orderNotifs: Notification[] = data.orders
      .filter((o) => o.status !== 'cancelado' && o.status !== 'aguardando_pagamento')
      .slice(0, 30)
      .map((o) => ({
        id: `order-${o.id}`,
        type: 'pedido' as NotifType,
        title: 'Novo pedido recebido',
        body: `Pedido ${o.code} de ${o.customerName} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.total)}`,
        createdAt: o.createdAt,
        action: { label: 'Ver pedido', to: `/app/pedidos?orderId=${o.id}` },
      }))

    const msgNotifs: Notification[] = chatMessages.map((m) => ({
      id: m.id,
      type: 'mensagem' as NotifType,
      title: 'Nova mensagem do cliente',
      body: `Pedido ${m.orderCode}: "${m.body.length > 80 ? m.body.slice(0, 80) + '...' : m.body}"`,
      createdAt: m.createdAt,
      action: { label: 'Responder', to: '/app/mensagens' },
    }))

    return [...orderNotifs, ...msgNotifs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [data.orders, chatMessages])

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(storeId, next)
      return next
    })
  }

  function markAllRead() {
    const next = new Set(notifications.map((n) => n.id))
    setReadIds(next)
    saveReadIds(storeId, next)
  }

  const loading = loadingMessages

  return (
    <section className="animate-rise space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between pl-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral-500">Central</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-ink-900">
            Notificacoes
            {unreadCount > 0 && (
              <span className="ml-2.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-2xl border border-ink-100 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="panel-card overflow-hidden">
        {loading ? (
          <div className="space-y-0 divide-y divide-ink-100">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-2xl bg-ink-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-3 w-64 animate-pulse rounded-full bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-400">
            <Bell className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma notificacao ainda.</p>
          </div>
        ) : (
          <ul>
            {notifications.map((n, i) => {
              const isRead = readIds.has(n.id)
              const Icon = n.type === 'pedido' ? ShoppingBag : MessageCircle
              const iconBg = n.type === 'pedido' ? 'bg-coral-50' : 'bg-sky-50'
              const iconColor = n.type === 'pedido' ? 'text-coral-500' : 'text-sky-500'

              return (
                <li
                  key={n.id}
                  className={cn(
                    'relative flex cursor-pointer items-start gap-4 px-5 py-4 transition',
                    i !== 0 && 'border-t border-ink-100',
                    !isRead && 'bg-coral-50/40',
                    'hover:bg-ink-50'
                  )}
                  onClick={() => {
                    markRead(n.id)
                    navigate(n.action.to)
                  }}
                >
                  {!isRead && (
                    <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-coral-500" />
                  )}
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', iconBg, iconColor)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn('text-sm font-semibold', isRead ? 'text-ink-700' : 'text-ink-900')}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-ink-400">{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{n.body}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-coral-500">
                      {n.action.label}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
