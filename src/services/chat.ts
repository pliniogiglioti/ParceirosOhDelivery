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
