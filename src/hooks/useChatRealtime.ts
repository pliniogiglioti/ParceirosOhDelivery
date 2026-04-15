import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/services/chat'

export function useChatRealtime(
  chatId: string | null,
  onNewMessage: (message: ChatMessage) => void
) {
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  useEffect(() => {
    if (!chatId || !supabase) return

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const message: ChatMessage = {
            id: String(row.id),
            chatId: String(row.chat_id),
            sender: String(row.sender) === 'store' ? 'store' : 'user',
            body: String(row.body ?? ''),
            createdAt: String(row.created_at ?? new Date().toISOString()),
          }
          callbackRef.current(message)
        }
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [chatId])
}
