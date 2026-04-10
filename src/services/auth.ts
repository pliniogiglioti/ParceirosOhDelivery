import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PartnerAuthUser } from '@/types'

function parseNameFromEmail(email: string) {
  const prefix = email.split('@')[0] ?? 'parceiro'
  const normalized = prefix.replace(/[._-]+/g, ' ').trim()

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function getCurrentAuthUser(): Promise<PartnerAuthUser | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user
  if (!user?.email) return null

  return {
    id: user.id,
    email: user.email,
    name: String(user.user_metadata?.full_name ?? parseNameFromEmail(user.email)),
  }
}

export async function sendLoginCode(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    throw error
  }

  return { mode: 'supabase' as const }
}

export async function verifyLoginCode(email: string, code: string): Promise<PartnerAuthUser> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  if (error) {
    throw error
  }

  const authUser = data.user!
  const userEmail = authUser.email ?? email

  return {
    id: authUser.id,
    email: userEmail,
    name: String(authUser.user_metadata?.full_name ?? parseNameFromEmail(userEmail)),
  }
}

export async function signOutAuth() {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
