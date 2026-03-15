import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { supabaseServer } from '@/lib/supabaseServer'

type AuthenticatedMember = {
  ok: true
  userId: string
  role: string | null
}

type UnauthorizedMember = {
  ok: false
  status: number
  message: string
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

  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role ?? null

  if (role !== 'admin' && role !== 'member') {
    return { ok: false, status: 403, message: 'Member access required.' }
  }

  return {
    ok: true,
    userId: data.user.id,
    role,
  }
}

