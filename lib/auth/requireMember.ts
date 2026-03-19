import type { User } from '@supabase/supabase-js'
import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { getRoleFromUser } from '@/lib/auth/roles'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { supabaseServer } from '@/lib/supabaseServer'

type LinkedPlayer = {
  id: string
  display_name: string
  is_active: boolean
}

type AuthenticatedMember = {
  ok: true
  token: string
  userId: string
  role: 'admin' | 'standard'
  user: User
  player: LinkedPlayer
}

type UnauthorizedMember = {
  ok: false
  status: number
  message: string
}

type UserProfileLookup = {
  user_id: string
  player_id: string | null
  players: LinkedPlayer | LinkedPlayer[] | null
}

export async function requireMember(req: Request): Promise<AuthenticatedMember | UnauthorizedMember> {
  const token = getAccessTokenFromRequest(req)

  if (!token) {
    return { ok: false, status: 401, message: 'Authentication required.' }
  }

  const { data, error } = await supabaseServer.auth.getUser(token)

  if (error || !data?.user) {
    return { ok: false, status: 401, message: 'Invalid authorization token.' }
  }

  const supabase = getSupabaseServiceRole()
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, player_id, players:player_id ( id, display_name, is_active )')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false, status: 500, message: profileError.message }
  }

  const typedProfile = profile as UserProfileLookup | null
  const player = Array.isArray(typedProfile?.players) ? typedProfile.players[0] ?? null : typedProfile?.players ?? null

  if (!typedProfile?.player_id || !player) {
    return { ok: false, status: 403, message: 'Your account is not linked to an approved player.' }
  }

  if (!player.is_active) {
    return { ok: false, status: 403, message: 'Your linked player profile is inactive.' }
  }

  return {
    ok: true,
    token,
    userId: data.user.id,
    role: getRoleFromUser(data.user),
    user: data.user,
    player,
  }
}
