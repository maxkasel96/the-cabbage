import { getAccountAccess } from '@/lib/auth/requireMember'

export async function requireAdmin(req: Request) {
  const access = await getAccountAccess(req)
  if (!access.ok) return access
  if (access.role !== 'admin')
    return { ok: false, status: 403, message: 'Admin access required.' } as const
  return access
}
