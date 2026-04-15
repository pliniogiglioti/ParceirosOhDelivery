import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import {
  fetchChatSessionByOrder,
  getOrCreateChatSession,
  sendStoreMessage,
} from '@/services/chat'
import type { ChatMessage, ChatSession } from '@/services/chat'
import type { PartnerOrder } from '@/types'
import { cn } from '@/lib/utils'

interface OrderChatPanelProps {
  order: PartnerOrder
  storeId: string
  storeName: string
  /** profile_id do cliente — necessário para criar a sessão se não existir */
  profileId?: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function OrderChatPanel({ order, storeId, storeName, profileId }: OrderChatPanelProps) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [starting, setStarting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing session on mount
  useEffect(() => {
    let active = true
    setLoading(true)

    fetchChatSessionByOrder(order.id, storeId)
      .then((s) => {
        if (!active) return
        setSession(s)
        setMessages(s?.messages ?? [])
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setMessages([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [order.id, storeId])

  // Realtime: append new messages (avoid duplicates)
  useChatRealtime(session?.id ?? null, (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  })

  async function handleStartChat() {
    if (!profileId) {
      toast.error('Nao foi possivel identificar o cliente para iniciar o chat.')
      return
    }
    setStarting(true)
    try {
      const s = await getOrCreateChatSession(
        order.id,
        order.code,
        storeId,
        storeName,
        profileId
      )
      setSession(s)
      setMessages(s.messages)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {
      toast.error('Nao foi possivel iniciar o chat.')
    } finally {
      setStarting(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !session || sending) return

    setSending(true)
    setInput('')

    // Optimistic update
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      chatId: session.id,
      sender: 'store',
      body: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const saved = await sendStoreMessage(session.id, text)
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)))
    } catch {
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInput(text)
      toast.error('Nao foi possivel enviar a mensagem.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-ink-400">Carregando chat...</p>
      </div>
    )
  }

  // No session yet — show start button
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
          <MessageCircle className="h-5 w-5 text-ink-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink-900">Nenhuma conversa ainda</p>
          <p className="mt-1 text-xs text-ink-500">
            Inicie um chat para enviar uma mensagem ao cliente sobre este pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStartChat}
          disabled={starting || !profileId}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          {starting ? 'Iniciando...' : 'Iniciar conversa'}
        </button>
        {!profileId && (
          <p className="text-xs text-ink-400">
            Perfil do cliente nao disponivel para este pedido.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white" style={{ height: '340px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
        <MessageCircle className="h-4 w-4 text-coral-500" />
        <p className="text-xs font-semibold text-ink-700">
          Chat com cliente · {order.customerName}
        </p>
        <span className="ml-auto flex h-2 w-2 rounded-full bg-green-400" title="Online" />
      </div>

      {/* Messages */}
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-ink-400">Nenhuma mensagem ainda. Diga oi!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.sender === 'store' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    msg.sender === 'store'
                      ? 'rounded-br-sm bg-coral-500 text-white'
                      : 'rounded-bl-sm bg-ink-100 text-ink-900'
                  )}
                >
                  <p>{msg.body}</p>
                  <p
                    className={cn(
                      'mt-0.5 text-[10px]',
                      msg.sender === 'store' ? 'text-white/70' : 'text-ink-400'
                    )}
                  >
                    {formatTime(msg.createdAt)}
                    {msg.sender === 'store' && (
                      <span className="ml-1">· Loja</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-ink-100 px-3 py-2.5">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSend()
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mensagem para o cliente..."
            className="flex-1 rounded-2xl border border-ink-100 bg-ink-50 px-3.5 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-300 focus:border-coral-300 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-coral-500 text-white transition hover:bg-coral-600 disabled:opacity-40"
            aria-label="Enviar mensagem"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
