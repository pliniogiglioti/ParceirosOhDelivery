import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  chatId: string
  sender: 'user' | 'store'
  body: string
  createdAt: string
}

export interface ChatSession {
  id: string
  orderId: string | null
  orderCode: string
  storeId: string
  storeName: string
  profileId: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    chatId: String(row.chat_id),
    sender: String(row.sender) === 'store' ? 'store' : 'user',
    body: String(row.body ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

/** Busca ou cria uma sessão de chat para um pedido específico */
export async function getOrCreateChatSession(
  orderId: string,
  orderCode: string,
  storeId: string,
  storeName: string,
  profileId: string
): Promise<ChatSession> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  // Tenta encontrar sessão existente para este pedido
  const { data: existing, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('order_id', orderId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (fetchError) throw fetchError

  let session = existing

  if (!session) {
    const { data: created, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        order_id: orderId,
        order_code: orderCode,
        store_id: storeId,
        store_name: storeName,
        profile_id: profileId,
      })
      .select('*')
      .single()

    if (createError) throw createError
    session = created
  }

  // Busca mensagens da sessão
  const { data: messageRows, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', session.id)
    .order('created_at', { ascending: true })

  if (msgError) throw msgError

  return {
    id: String(session.id),
    orderId: session.order_id ? String(session.order_id) : null,
    orderCode: String(session.order_code ?? orderCode),
    storeId: String(session.store_id),
    storeName: String(session.store_name ?? storeName),
    profileId: String(session.profile_id),
    createdAt: String(session.created_at),
    updatedAt: String(session.updated_at),
    messages: (messageRows ?? []).map((r) => mapMessage(r as Record<string, unknown>)),
  }
}

/** Busca sessão de chat existente para um pedido (sem criar) */
export async function fetchChatSessionByOrder(
  orderId: string,
  storeId: string
): Promise<ChatSession | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('order_id', orderId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) throw error
  if (!session) return null

  const { data: messageRows, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', session.id)
    .order('created_at', { ascending: true })

  if (msgError) throw msgError

  return {
    id: String(session.id),
    orderId: session.order_id ? String(session.order_id) : null,
    orderCode: String(session.order_code ?? ''),
    storeId: String(session.store_id),
    storeName: String(session.store_name ?? ''),
    profileId: String(session.profile_id),
    createdAt: String(session.created_at),
    updatedAt: String(session.updated_at),
    messages: (messageRows ?? []).map((r) => mapMessage(r as Record<string, unknown>)),
  }
}

/** Envia uma mensagem da loja */
export async function sendStoreMessage(chatId: string, body: string): Promise<ChatMessage> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: chatId,
      sender: 'store',
      body: body.trim(),
    })
    .select('*')
    .single()

  if (error) throw error

  return mapMessage(data as Record<string, unknown>)
}

/** Busca todas as sessões de chat de uma loja com a última mensagem */
export async function fetchAllChatSessions(storeId: string): Promise<ChatSession[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => String(s.id))

  const { data: allMessages, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .in('chat_id', sessionIds)
    .order('created_at', { ascending: true })

  if (msgError) throw msgError

  const messagesByChat = new Map<string, ChatMessage[]>()
  ;(allMessages ?? []).forEach((row) => {
    const chatId = String(row.chat_id)
    const list = messagesByChat.get(chatId) ?? []
    list.push(mapMessage(row as Record<string, unknown>))
    messagesByChat.set(chatId, list)
  })

  return sessions.map((s) => ({
    id: String(s.id),
    orderId: s.order_id ? String(s.order_id) : null,
    orderCode: String(s.order_code ?? ''),
    storeId: String(s.store_id),
    storeName: String(s.store_name ?? ''),
    profileId: String(s.profile_id),
    createdAt: String(s.created_at),
    updatedAt: String(s.updated_at),
    messages: messagesByChat.get(String(s.id)) ?? [],
  }))
}

/** Conta mensagens não lidas (sender = 'user') após a última mensagem da loja */
export function countUnread(session: ChatSession): number {
  const messages = session.messages
  if (messages.length === 0) return 0

  // Encontra o índice da última mensagem da loja
  let lastStoreIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'store') {
      lastStoreIdx = i
      break
    }
  }

  // Conta mensagens do cliente após a última da loja
  return messages.slice(lastStoreIdx + 1).filter((m) => m.sender === 'user').length
}
