import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/services/chat'

/**
 * Escuta INSERT em chat_messages para qualquer sessão da loja.
 * Usado na página de Mensagens para atualizar todas as conversas em tempo real.
 */
export function useAllChatsRealtime(
  storeId: string,
  sessionIds: string[],
  onNewMessage: (message: ChatMessage) => void
) {
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  // Serializa para detectar mudanças na lista de sessões
  const sessionKey = sessionIds.slice().sort().join(',')

  useEffect(() => {
    if (!storeId || !supabase || sessionIds.length === 0) return

    const channel = supabase
      .channel(`all-chats:store:${storeId}:${sessionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const chatId = String(row.chat_id)

          // Só processa mensagens das sessões desta loja
          if (!sessionIds.includes(chatId)) return

          const message: ChatMessage = {
            id: String(row.id),
            chatId,
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
  }, [storeId, sessionKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
