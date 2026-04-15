import { MessageCircle, Send, ShoppingBag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAllChatsRealtime } from '@/hooks/useAllChatsRealtime'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import {
  countUnread,
  fetchAllChatSessions,
  sendStoreMessage,
} from '@/services/chat'
import type { ChatMessage, ChatSession } from '@/services/chat'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()

  if (isToday) return formatTime(iso)

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function avatarColor(str: string) {
  const colors = [
    '#f97316', '#ef4444', '#8b5cf6', '#06b6d4',
    '#10b981', '#f59e0b', '#ec4899', '#6366f1',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function ChatAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.slice(0, 1).toUpperCase()
  const color = avatarColor(name)
  const sizeClass = size === 'lg' ? 'h-10 w-10 text-sm' : size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full font-bold text-white', sizeClass)}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  )
}

export function PartnerMessagesPage() {
  const { data } = usePartnerPageData()
  const storeId = data.store.id
  const { clearUnreadMessages } = usePartnerDraftStore()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  // unread counts per session (reset when session is selected)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeSession = sessions.find((s) => s.id === activeChatId) ?? null

  // Scroll to bottom when active session messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length])

  // Load all sessions on mount + clear badge
  useEffect(() => {
    clearUnreadMessages(storeId)
    let active = true
    setLoading(true)

    fetchAllChatSessions(storeId)
      .then((result) => {
        if (!active) return
        setSessions(result)
        // Init unread counts
        const map: Record<string, number> = {}
        result.forEach((s) => { map[s.id] = countUnread(s) })
        setUnreadMap(map)
        // Auto-select first session
        if (result.length > 0) setActiveChatId(result[0].id)
      })
      .catch(() => {
        if (!active) return
        toast.error('Nao foi possivel carregar as conversas.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [storeId])

  // Realtime: receive new messages from any session
  const sessionIds = sessions.map((s) => s.id)

  useAllChatsRealtime(storeId, sessionIds, (msg) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== msg.chatId) return s
        // Avoid duplicates (optimistic already added)
        if (s.messages.some((m) => m.id === msg.id)) return s
        return { ...s, messages: [...s.messages, msg], updatedAt: msg.createdAt }
      })
      // Re-sort by updatedAt desc
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    )

    // Increment unread if not the active chat and message is from user
    if (msg.sender === 'user' && msg.chatId !== activeChatId) {
      setUnreadMap((prev) => ({ ...prev, [msg.chatId]: (prev[msg.chatId] ?? 0) + 1 }))
      toast(`Nova mensagem de cliente`, { icon: '💬', duration: 3000 })
    }
  })

  function handleSelectSession(id: string) {
    setActiveChatId(id)
    setUnreadMap((prev) => ({ ...prev, [id]: 0 }))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !activeSession || sending) return

    setSending(true)
    setInput('')

    // Optimistic
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      chatId: activeSession.id,
      sender: 'store',
      body: text,
      createdAt: new Date().toISOString(),
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, messages: [...s.messages, optimistic], updatedAt: optimistic.createdAt }
          : s
      )
    )

    try {
      const saved = await sendStoreMessage(activeSession.id, text)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: s.messages.map((m) => (m.id === optimisticId ? saved : m)) }
            : s
        )
      )
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: s.messages.filter((m) => m.id !== optimisticId) }
            : s
        )
      )
      setInput(text)
      toast.error('Nao foi possivel enviar a mensagem.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)

  return (
    <section className="animate-rise">
      <div className="panel-card overflow-hidden" style={{ height: 'calc(100dvh - 140px)' }}>
        <div className="flex h-full">

          {/* ── Sidebar: lista de conversas ── */}
          <div className="flex w-72 shrink-0 flex-col border-r border-ink-100">
            <div className="border-b border-ink-100 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Mensagens</p>
                  <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.02em] text-ink-900">Conversas</p>
                </div>
                {totalUnread > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-sm text-ink-400">Carregando...</div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <MessageCircle className="h-8 w-8 text-ink-200" />
                  <p className="text-sm text-ink-400">Nenhuma conversa ainda.</p>
                  <p className="text-xs text-ink-300">As conversas iniciadas nos pedidos aparecem aqui.</p>
                </div>
              ) : (
                sessions.map((session) => {
                  const lastMsg = session.messages[session.messages.length - 1]
                  const unread = unreadMap[session.id] ?? 0
                  const isActive = session.id === activeChatId

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition',
                        isActive ? 'bg-coral-50' : 'hover:bg-ink-50'
                      )}
                    >
                      <ChatAvatar name={session.orderCode} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            'truncate text-sm font-semibold',
                            isActive ? 'text-coral-700' : 'text-ink-900'
                          )}>
                            Pedido {session.orderCode}
                          </p>
                          <span className="shrink-0 text-[10px] text-ink-400">
                            {formatDate(session.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-ink-500">
                            {lastMsg
                              ? `${lastMsg.sender === 'store' ? 'Você: ' : ''}${lastMsg.body}`
                              : 'Sem mensagens'}
                          </p>
                          {unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Área de chat ── */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-3.5">
              {activeSession ? (
                <>
                  <ChatAvatar name={activeSession.orderCode} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">
                      Pedido {activeSession.orderCode}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3 w-3 text-ink-400" />
                      <p className="text-xs text-ink-500">
                        {activeSession.messages.length} mensagem{activeSession.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-ink-900">Mensagens</p>
                  <p className="text-xs text-ink-500">Selecione uma conversa</p>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">
              {!activeSession ? (
                <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3">
                  <MessageCircle className="h-10 w-10 text-ink-200" />
                  <p className="text-sm text-ink-400">Selecione uma conversa para ver as mensagens.</p>
                </div>
              ) : activeSession.messages.length === 0 ? (
                <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3">
                  <MessageCircle className="h-10 w-10 text-ink-200" />
                  <p className="text-sm text-ink-400">Nenhuma mensagem ainda. Diga oi!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSession.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-end gap-2',
                        msg.sender === 'store' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {msg.sender === 'user' && (
                        <ChatAvatar name={activeSession.orderCode} size="sm" />
                      )}
                      <div
                        className={cn(
                          'max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          msg.sender === 'store'
                            ? 'rounded-br-sm bg-coral-500 text-white'
                            : 'rounded-bl-sm bg-ink-100 text-ink-900'
                        )}
                      >
                        <p>{msg.body}</p>
                        <p className={cn(
                          'mt-1 text-[10px]',
                          msg.sender === 'store' ? 'text-white/70' : 'text-ink-400'
                        )}>
                          {formatTime(msg.createdAt)}
                          {msg.sender === 'store' && <span className="ml-1">· Loja</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-ink-100 px-4 py-3">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); void handleSend() }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeSession ? 'Digite uma mensagem...' : 'Selecione uma conversa'}
                  disabled={!activeSession || sending}
                  className="flex-1 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 focus:bg-white transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !activeSession || sending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-coral-500 text-white transition hover:bg-coral-600 disabled:opacity-40"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
