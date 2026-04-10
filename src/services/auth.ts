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

  const email = session?.user?.email
  if (!email) return null

  return {
    email,
    name: String(session.user.user_metadata?.full_name ?? parseNameFromEmail(email)),
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

  const userEmail = data.user?.email ?? email

  return {
    email: userEmail,
    name: String(data.user?.user_metadata?.full_name ?? parseNameFromEmail(userEmail)),
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
