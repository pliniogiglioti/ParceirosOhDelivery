import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type MemberRole = 'operador' | 'gerente' | 'financeiro'
export type MemberStatus = 'pendente' | 'ativo' | 'inativo'

export interface StoreMember {
  id: string
  storeId: string
  email: string
  name: string | null
  role: MemberRole
  status: MemberStatus
  invitedAt: string
  acceptedAt: string | null
}

function mapMember(row: Record<string, unknown>): StoreMember {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    role: (row.role ?? 'operador') as MemberRole,
    status: (row.status ?? 'pendente') as MemberStatus,
    invitedAt: String(row.invited_at ?? row.created_at ?? new Date().toISOString()),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
  }
}

export async function fetchStoreMembers(storeId: string): Promise<StoreMember[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('store_members')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((r) => mapMember(r as Record<string, unknown>))
}

export async function inviteStoreMember(
  storeId: string,
  email: string,
  role: MemberRole
): Promise<StoreMember> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const normalizedEmail = email.trim().toLowerCase()

  // Tenta buscar o nome do perfil se já existir
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('email', normalizedEmail)
    .maybeSingle()

  const { data, error } = await supabase
    .from('store_members')
    .upsert(
      {
        store_id: storeId,
        email: normalizedEmail,
        name: profile?.name ?? null,
        role,
        status: 'pendente',
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,email' }
    )
    .select('*')
    .single()

  if (error) throw error
  return mapMember(data as Record<string, unknown>)
}

export async function updateStoreMember(
  memberId: string,
  storeId: string,
  patch: { role?: MemberRole; status?: MemberStatus }
): Promise<StoreMember> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('store_members')
    .update({
      ...(patch.role !== undefined && { role: patch.role }),
      ...(patch.status !== undefined && { status: patch.status }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) throw error
  return mapMember(data as Record<string, unknown>)
}

export async function removeStoreMember(memberId: string, storeId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('id', memberId)
    .eq('store_id', storeId)

  if (error) throw error
}
