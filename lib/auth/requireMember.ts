import type { User } from '@supabase/supabase-js'
import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { getRoleFromUser } from '@/lib/auth/roles'
import { supabaseServer } from '@/lib/supabaseServer'

type AuthenticatedMember = {
  ok: true
  token: string
  userId: string
  role: 'admin' | 'standard'
  user: User
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

  return {
    ok: true,
    token,
    userId: data.user.id,
    role: getRoleFromUser(data.user),
    user: data.user,
  }
}
