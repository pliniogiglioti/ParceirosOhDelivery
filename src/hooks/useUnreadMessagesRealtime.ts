import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Escuta novas mensagens de clientes (sender = 'user') para a loja.
 * Usado no PartnerLayout para manter o badge da topbar atualizado.
 */
export function useUnreadMessagesRealtime(
  storeId: string,
  onNewUserMessage: () => void
) {
  const callbackRef = useRef(onNewUserMessage)
  callbackRef.current = onNewUserMessage

  useEffect(() => {
    if (!storeId || !supabase) return

    // Escuta INSERT em chat_sessions da loja para obter os chat_ids
    // e depois filtra mensagens de 'user' nessas sessões
    const channel = supabase
      .channel(`unread-msgs:store:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>

          // Só conta mensagens do cliente
          if (String(row.sender) !== 'user') return

          // Verifica se o chat_id pertence a esta loja
          const { data } = await supabase!
            .from('chat_sessions')
            .select('id')
            .eq('id', String(row.chat_id))
            .eq('store_id', storeId)
            .maybeSingle()

          if (data) {
            callbackRef.current()
          }
        }
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [storeId])
}
