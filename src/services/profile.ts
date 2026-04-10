import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Profile, StoreCategory, UserRole } from '@/types'

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name != null ? String(row.name) : null,
    phone: row.phone != null ? String(row.phone) : null,
    avatarUrl: row.avatar_url != null ? String(row.avatar_url) : null,
    roles: (row.roles as UserRole[]) ?? ['customer'],
    createdAt: String(row.created_at),
  }
}

export async function getOrCreateProfile(
  userId: string,
  email: string,
  name: string
): Promise<Profile> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    return mapProfile(existing as Record<string, unknown>)
  }

  const { data: created, error } = await supabase
    .from('profiles')
    .insert({ id: userId, email, name, roles: ['customer'] })
    .select('*')
    .single()

  if (error) throw error

  return mapProfile(created as Record<string, unknown>)
}

export async function addRoleToProfile(userId: string, role: UserRole): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  const roles = (data.roles as UserRole[]) ?? ['customer']
  if (roles.includes(role)) return

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ roles: [...roles, role], updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) throw updateError
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('store_categories')
    .select('id, name, icon')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    icon: String(row.icon),
  }))
}
