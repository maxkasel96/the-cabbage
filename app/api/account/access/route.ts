import { NextResponse } from 'next/server'
import { getAccountAccess } from '@/lib/auth/requireMember'

export async function GET(request: Request) {
  const access = await getAccountAccess(request)
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })
  return NextResponse.json({ player: access.player, role: access.role, userId: access.userId })
}
