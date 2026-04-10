import { Bell, CheckCheck, ChevronRight, DollarSign, MessageCircle, ShoppingBag, Star, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

type NotifType = 'pedido' | 'financeiro' | 'avaliacao' | 'mensagem' | 'alerta'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  read: boolean
  action?: { label: string; to: string }
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'pedido',
    title: 'Novo pedido recebido',
    body: 'Pedido #1042 de João Silva — R$ 58,90. Aguardando confirmação.',
    time: 'Agora',
    read: false,
    action: { label: 'Ver pedido', to: '/app/pedidos' },
  },
  {
    id: 'n2',
    type: 'mensagem',
    title: 'Nova mensagem do Suporte',
    body: 'O valor correto será creditado até amanhã. Alguma outra dúvida?',
    time: '10 min',
    read: false,
    action: { label: 'Responder', to: '/app/mensagens' },
  },
  {
    id: 'n3',
    type: 'avaliacao',
    title: 'Nova avaliação recebida',
    body: 'Maria Oliveira avaliou sua loja com 5 estrelas: "Entrega rápida e comida deliciosa!"',
    time: '35 min',
    read: false,
    action: { label: 'Ver avaliação', to: '/app/avaliacoes' },
  },
  {
    id: 'n4',
    type: 'financeiro',
    title: 'Repasse processado',
    body: 'Seu repasse semanal de R$ 1.240,00 foi processado e será creditado em até 1 dia útil.',
    time: '2 h',
    read: true,
    action: { label: 'Ver financeiro', to: '/app/financeiro' },
  },
  {
    id: 'n5',
    type: 'alerta',
    title: 'Produto sem estoque',
    body: 'O produto "X-Burguer Duplo" está com estoque zerado e foi pausado automaticamente.',
    time: '3 h',
    read: true,
    action: { label: 'Ver cardápio', to: '/app/cardapio' },
  },
  {
    id: 'n6',
    type: 'pedido',
    title: 'Pedido cancelado pelo cliente',
    body: 'Pedido #1038 de Carlos Mendes foi cancelado antes da confirmação.',
    time: '5 h',
    read: true,
  },
  {
    id: 'n7',
    type: 'financeiro',
    title: 'Taxa de serviço atualizada',
    body: 'A partir de 01/05, a taxa de serviço para entregas será de 12%. Veja os detalhes.',
    time: 'Ontem',
    read: true,
    action: { label: 'Ver detalhes', to: '/app/financeiro' },
  },
]

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; bg: string; color: string }> = {
  pedido:     { icon: ShoppingBag,    bg: 'bg-coral-50',   color: 'text-coral-500' },
  financeiro: { icon: DollarSign,     bg: 'bg-green-50',   color: 'text-green-600' },
  avaliacao:  { icon: Star,           bg: 'bg-yellow-50',  color: 'text-yellow-500' },
  mensagem:   { icon: MessageCircle,  bg: 'bg-sky-50',     color: 'text-sky-500' },
  alerta:     { icon: TriangleAlert,  bg: 'bg-orange-50',  color: 'text-orange-500' },
}

export function PartnerNotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <section className="animate-rise space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between pl-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral-500">Central</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-ink-900">
            Notificações
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
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-400">
            <Bell className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma notificação por aqui.</p>
          </div>
        ) : (
          <ul>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type]
              const Icon = cfg.icon

              return (
                <li
                  key={n.id}
                  className={cn(
                    'relative flex items-start gap-4 px-5 py-4 transition',
                    i !== 0 && 'border-t border-ink-100',
                    !n.read && 'bg-coral-50/40',
                    n.action && 'cursor-pointer hover:bg-ink-50'
                  )}
                  onClick={() => {
                    markRead(n.id)
                    if (n.action) navigate(n.action.to)
                  }}
                >
                  {/* Unread dot */}
                  {!n.read && (
                    <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-coral-500" />
                  )}

                  {/* Icon */}
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', cfg.bg, cfg.color)}>
                    <Icon className="h-4 w-4" />
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn('text-sm font-semibold', n.read ? 'text-ink-700' : 'text-ink-900')}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-ink-400">{n.time}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{n.body}</p>
                    {n.action && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-coral-500">
                        {n.action.label}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
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
