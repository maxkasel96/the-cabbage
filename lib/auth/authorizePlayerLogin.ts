import type { User } from '@supabase/supabase-js'
import { ensureUserProfile } from '@/lib/userProfiles'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

export type AuthorizedPlayerLogin = {
  ok: true
  playerId: string
  playerName: string
}

export type UnauthorizedPlayerLogin = {
  ok: false
  reason: string
}

export type PlayerLoginAuthorizationResult = AuthorizedPlayerLogin | UnauthorizedPlayerLogin

type PlayerLoginIdentityRow = {
  id: string
  player_id: string
  auth_user_id: string | null
  is_active: boolean
  players:
    | {
        id: string
        display_name: string
        is_active: boolean
      }
    | {
        id: string
        display_name: string
        is_active: boolean
      }[]
    | null
}

const normalizeEmail = (email: string | null | undefined) => {
  if (typeof email !== 'string') {
    return null
  }

  const normalized = email.trim().toLowerCase()
  return normalized || null
}

export async function authorizePlayerLogin(user: User): Promise<PlayerLoginAuthorizationResult> {
  const email = normalizeEmail(user.email)

  if (!email) {
    return { ok: false, reason: 'No email was returned from your Google account.' }
  }

  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase
    .from('player_login_identities')
    .select('id, player_id, auth_user_id, is_active, players:player_id ( id, display_name, is_active )')
    .eq('provider', 'google')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const identity = data as PlayerLoginIdentityRow | null

  if (!identity || !identity.is_active) {
    return { ok: false, reason: 'This Google account is not authorized for this app.' }
  }

  const player = Array.isArray(identity.players) ? identity.players[0] ?? null : identity.players

  if (!player) {
    return { ok: false, reason: 'The approved player linked to this login could not be found.' }
  }

  if (!player.is_active) {
    return { ok: false, reason: 'Your linked player profile is inactive. Contact an admin for help.' }
  }

  if (identity.auth_user_id && identity.auth_user_id !== user.id) {
    return { ok: false, reason: 'This player login is already linked to another account.' }
  }

  if (!identity.auth_user_id) {
    const { error: linkError } = await supabase
      .from('player_login_identities')
      .update({ auth_user_id: user.id })
      .eq('id', identity.id)

    if (linkError) {
      throw new Error(linkError.message)
    }
  }

  await ensureUserProfile(user)

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ player_id: identity.player_id })
    .eq('user_id', user.id)

  if (profileError) {
    throw new Error(profileError.message)
  }

  return {
    ok: true,
    playerId: identity.player_id,
    playerName: player.display_name,
  }
}
