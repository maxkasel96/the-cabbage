import type { User } from '@supabase/supabase-js'
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

type ClaimPlayerLoginIdentityRow = {
  player_login_identity_id: string
  player_id: string
  auth_user_id: string
  player_name: string
  matched_provider: string
  match_strategy: string
}

const normalizeEmail = (email: string | null | undefined) => {
  if (typeof email !== 'string') {
    return null
  }

  const normalized = email.trim().toLowerCase()
  return normalized || null
}

export async function authorizePlayerLogin(
  user: User,
  options?: { providerHint?: string | null }
): Promise<PlayerLoginAuthorizationResult> {
  const email = normalizeEmail(user.email)

  if (!email) {
    return { ok: false, reason: 'No email was returned from your account.' }
  }

  const providerHint =
    typeof options?.providerHint === 'string' && options.providerHint.trim()
      ? options.providerHint.trim().toLowerCase()
      : null
  const provider =
    providerHint ??
    (typeof user.app_metadata?.provider === 'string'
      ? user.app_metadata.provider
      : Array.isArray(user.app_metadata?.providers) && typeof user.app_metadata.providers[0] === 'string'
        ? user.app_metadata.providers[0]
        : null)

  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase.rpc('claim_player_login_identity', {
    p_auth_user_id: user.id,
    p_email: email,
    p_provider: provider,
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const claim = Array.isArray(data) ? (data[0] as ClaimPlayerLoginIdentityRow | undefined) : undefined

  if (!claim) {
    return { ok: false, reason: 'Failed to claim the approved player login.' }
  }

  return {
    ok: true,
    playerId: claim.player_id,
    playerName: claim.player_name,
  }
}
