import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

type Role = 'admin' | 'member'

const parseRole = (value: unknown): Role | null => {
  if (value === 'admin' || value === 'member') {
    return value
  }

  return null
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = data.users.map((user) => ({
    id: user.id,
    email: user.email,
    role: parseRole(user.app_metadata?.role) ?? 'member',
    created_at: user.created_at,
  }))

  return NextResponse.json({ users })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const userId = body?.userId as string | undefined
  const role = parseRole(body?.role)

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to update user.' }, { status: 500 })
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: parseRole(data.user.app_metadata?.role) ?? 'member',
    },
  })
}
