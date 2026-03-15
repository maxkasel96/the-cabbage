import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { supabaseServer } from '@/lib/supabaseServer'

export async function requireAdmin(req: Request) {
  const token = getAccessTokenFromRequest(req)

  if (!token) {
    return { ok: false, status: 401, message: 'Authentication required.' }
  }

  const { data, error } = await supabaseServer.auth.getUser(token)

  if (error || !data?.user) {
    return { ok: false, status: 401, message: 'Invalid authorization token.' }
  }

  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role

  if (role !== 'admin') {
    return { ok: false, status: 403, message: 'Admin access required.' }
  }

  return { ok: true, user: data.user }
}
