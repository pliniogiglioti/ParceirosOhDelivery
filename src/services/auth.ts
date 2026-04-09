import { isSupabaseConfigured, simulationModeEnabled, supabase } from '@/lib/supabase'
import type { PartnerAuthUser } from '@/types'

const MOCK_CODE = '123456'

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
  if (simulationModeEnabled || !isSupabaseConfigured || !supabase) {
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
  if (simulationModeEnabled || !isSupabaseConfigured || !supabase) {
    return { mode: 'mock' as const, code: MOCK_CODE }
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
  if (simulationModeEnabled || !isSupabaseConfigured || !supabase) {
    if (code !== MOCK_CODE) {
      throw new Error('Codigo invalido. Use o codigo demo 123456.')
    }

    return {
      email,
      name: parseNameFromEmail(email),
    }
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
  if (simulationModeEnabled || !isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
