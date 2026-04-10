import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  text: string
  from: 'me' | 'them'
  time: string
}

interface Chat {
  id: string
  name: string
  initial: string
  color: string
  role: string
  unread: number
  messages: Message[]
}

const INITIAL_CHATS: Chat[] = []

function ChatAvatar({ initial, color, size = 'md' }: { initial: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
      )}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  )
}

export function PartnerMessagesPage() {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS)
  const [activeChatId, setActiveChatId] = useState<string>(INITIAL_CHATS[0]?.id ?? '')
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeChat = chats.find((c) => c.id === activeChatId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages])

  function handleSelectChat(id: string) {
    setActiveChatId(id)
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    )
  }

  function handleSend() {
    const text = input.trim()
    if (!text || !activeChat) return

    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, { id: `msg-${Date.now()}`, from: 'me', text, time }] }
          : c
      )
    )
    setInput('')
  }

  return (
    <section className="animate-rise">
      <div className="panel-card overflow-hidden" style={{ height: 'calc(100dvh - 140px)' }}>
        <div className="flex h-full">

          {/* Conversation list */}
          <div className="flex w-72 shrink-0 flex-col border-r border-ink-100">
            <div className="border-b border-ink-100 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Mensagens</p>
              <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.02em] text-ink-900">Conversas</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="px-4 py-6 text-sm text-ink-400">Nenhuma conversa encontrada.</div>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSelectChat(chat.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3.5 text-left transition',
                      chat.id === activeChatId ? 'bg-coral-50' : 'hover:bg-ink-50'
                    )}
                  >
                    <ChatAvatar initial={chat.initial} color={chat.color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm font-semibold', chat.id === activeChatId ? 'text-coral-700' : 'text-ink-900')}>
                          {chat.name}
                        </p>
                        {chat.unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {chat.messages[chat.messages.length - 1]?.text}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-3.5">
              {activeChat ? <ChatAvatar initial={activeChat.initial} color={activeChat.color} size="sm" /> : null}
              <div>
                <p className="text-sm font-semibold text-ink-900">{activeChat?.name ?? 'Mensagens'}</p>
                <p className="text-xs text-ink-500">{activeChat?.role ?? 'Selecione uma conversa'}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {!activeChat ? (
                  <div className="flex h-full min-h-72 items-center justify-center text-sm text-ink-400">
                    Nenhuma conversa selecionada.
                  </div>
                ) : (
                  activeChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('flex items-end gap-2', msg.from === 'me' ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {msg.from === 'them' && (
                        <ChatAvatar initial={activeChat.initial} color={activeChat.color} size="sm" />
                      )}
                      <div
                        className={cn(
                          'max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          msg.from === 'me'
                            ? 'rounded-br-sm bg-coral-500 text-white'
                            : 'rounded-bl-sm bg-ink-100 text-ink-900'
                        )}
                      >
                        <p>{msg.text}</p>
                        <p className={cn('mt-1 text-[10px]', msg.from === 'me' ? 'text-white/70' : 'text-ink-400')}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-ink-100 px-4 py-3">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  disabled={!activeChat}
                  className="flex-1 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !activeChat}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-coral-500 text-white transition hover:bg-coral-600 disabled:opacity-40"
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
