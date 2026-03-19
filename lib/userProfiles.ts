import type { User } from '@supabase/supabase-js'
import { getRoleFromUser, normalizeAppRole, type AppRole } from '@/lib/auth/roles'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

export type UserProfileRecord = {
  user_id: string
  email: string | null
  display_name: string | null
  role: AppRole
  is_active: boolean
  player_id: string | null
  profile_data: Record<string, unknown>
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

const userProfileColumns =
  'user_id, email, display_name, role, is_active, player_id, profile_data, created_at, updated_at, last_sign_in_at'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getDisplayNameFromUser = (user: User) => {
  const name = user.user_metadata?.display_name ?? user.user_metadata?.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

const normalizeProfile = (profile: Omit<UserProfileRecord, 'role' | 'profile_data'> & {
  role: unknown
  profile_data: unknown
}): UserProfileRecord => ({
  ...profile,
  role: normalizeAppRole(profile.role),
  profile_data: isPlainObject(profile.profile_data) ? profile.profile_data : {},
})

export async function ensureUserProfile(user: User) {
  const supabase = getSupabaseServiceRole()
  const { data: existing, error: existingError } = await supabase
    .from('user_profiles')
    .select(userProfileColumns)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  const payload = {
    user_id: user.id,
    email: user.email ?? existing?.email ?? null,
    display_name: existing?.display_name ?? getDisplayNameFromUser(user),
    role: getRoleFromUser(user),
    is_active: existing?.is_active ?? true,
    player_id: existing?.player_id ?? null,
    profile_data: isPlainObject(existing?.profile_data) ? existing.profile_data : {},
    last_sign_in_at: user.last_sign_in_at ?? existing?.last_sign_in_at ?? null,
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select(userProfileColumns)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeProfile(data)
}

export async function listUserProfiles() {
  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`${userProfileColumns}, players:player_id ( id, display_name )`)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((profile) => ({
    ...normalizeProfile(profile),
    linked_player: Array.isArray(profile.players) ? profile.players[0] ?? null : profile.players ?? null,
  }))
}

export async function updateOwnUserProfile(
  user: User,
  changes: {
    display_name?: string | null
    profile_data?: Record<string, unknown>
  }
) {
  const currentProfile = await ensureUserProfile(user)
  const supabase = getSupabaseServiceRole()
  const nextDisplayName =
    typeof changes.display_name === 'string'
      ? changes.display_name.trim() || null
      : currentProfile.display_name
  const nextProfileData = isPlainObject(changes.profile_data)
    ? changes.profile_data
    : currentProfile.profile_data

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      display_name: nextDisplayName,
      profile_data: nextProfileData,
    })
    .eq('user_id', user.id)
    .select(userProfileColumns)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeProfile(data)
}
