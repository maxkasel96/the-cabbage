import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { getRoleFromUser } from '@/lib/auth/roles'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { supabaseServer } from '@/lib/supabaseServer'

type Player = { id: string; display_name: string; is_active: boolean }

export async function getAccountAccess(req: Request) {
  const token = getAccessTokenFromRequest(req)
  if (!token) return { ok: false, status: 401, message: 'Sign in to continue.' } as const
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(token)
  if (error || !user) return { ok: false, status: 401, message: 'Please sign in again.' } as const

  const { data, error: lookupError } = await getSupabaseServiceRole()
    .from('player_memberships')
    .select('is_active, players!inner(id,display_name,is_active)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (lookupError) return { ok: false, status: 500, message: 'Unable to load membership.' } as const
  const linked = data?.players
  const player: Player | null = (Array.isArray(linked) ? linked[0] : linked) ?? null
  if (data && (!data.is_active || !player?.is_active)) {
    return { ok: false, status: 403, message: 'This membership is inactive.' } as const
  }
  return { ok: true, user, token, userId: user.id, role: getRoleFromUser(user), player } as const
}

export async function requireMember(req: Request) {
  const access = await getAccountAccess(req)
  if (!access.ok) return access
  if (!access.player)
    return { ok: false, status: 403, message: 'An approved player membership is required.' } as const
  return { ...access, player: access.player }
}
