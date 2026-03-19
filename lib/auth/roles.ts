import type { User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'standard'
export type LegacyAppRole = 'member'

export const normalizeAppRole = (value: unknown): AppRole => {
  if (value === 'admin') {
    return 'admin'
  }

  return 'standard'
}

export const isAdminRole = (value: unknown) => normalizeAppRole(value) === 'admin'

export const canAccessAuthenticatedApp = (value: unknown) => {
  const normalized = normalizeAppRole(value)
  return normalized === 'admin' || normalized === 'standard'
}

export const getRoleFromUser = (user: Pick<User, 'app_metadata' | 'user_metadata'>): AppRole =>
  normalizeAppRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)

export const getRoleLabel = (value: unknown) => normalizeAppRole(value)
