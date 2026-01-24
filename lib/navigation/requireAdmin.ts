import { supabaseServer } from '@/lib/supabaseServer'

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { ok: false, status: 401, message: 'Missing authorization token.' }
  }

  const { data, error } = await supabaseServer.auth.getUser(token)

  if (error || !data?.user) {
    return { ok: false, status: 401, message: 'Invalid authorization token.' }
  }

  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role

  if (role !== 'admin') {
    return { ok: false, status: 403, message: 'Admin access required.' }
  }

  return { ok: true }
}
