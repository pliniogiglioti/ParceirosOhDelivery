import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido'
export type TicketCategory = 'financeiro' | 'pedido' | 'cardapio' | 'tecnico' | 'outro'

export interface SupportTicket {
  id: string
  protocol: string
  title: string
  category: TicketCategory
  description: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

function generateProtocol(): string {
  const num = Math.floor(Math.random() * 90000) + 10000
  return `SUP-${num}`
}

function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    protocol: String(row.protocol ?? ''),
    title: String(row.title ?? ''),
    category: (row.category ?? 'outro') as TicketCategory,
    description: String(row.description ?? ''),
    status: (row.status ?? 'aberto') as TicketStatus,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }
}

export async function fetchSupportTickets(storeId: string): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>))
}

export async function createSupportTicket(
  storeId: string,
  input: { title: string; category: TicketCategory; description: string }
): Promise<SupportTicket> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      store_id: storeId,
      protocol: generateProtocol(),
      title: input.title,
      category: input.category,
      description: input.description,
      status: 'aberto',
    })
    .select('*')
    .single()

  if (error) throw error

  return mapTicket(data as Record<string, unknown>)
}
