import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { normalizeAppRole, type AppRole } from '@/lib/auth/roles'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { listUserProfiles } from '@/lib/userProfiles'

const parseRole = (value: unknown): AppRole | null => {
  if (value === 'admin' || value === 'standard' || value === 'member') {
    return normalizeAppRole(value)
  }

  return null
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = getSupabaseServiceRole()

  try {
    const [{ data, error }, profiles] = await Promise.all([supabase.auth.admin.listUsers(), listUserProfiles()])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]))
    const users = data.users.map((user) => {
      const profile = profileMap.get(user.id)

      return {
        id: user.id,
        email: user.email,
        role: parseRole(user.app_metadata?.role) ?? 'standard',
        created_at: user.created_at,
        profile: profile
          ? {
              display_name: profile.display_name,
              player_id: profile.player_id,
              linked_player_name: profile.linked_player?.display_name ?? null,
              updated_at: profile.updated_at,
            }
          : null,
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load user profiles.' },
      { status: 500 }
    )
  }
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
  const { data: existingUser, error: existingUserError } = await supabase.auth.admin.getUserById(userId)

  if (existingUserError || !existingUser.user) {
    return NextResponse.json(
      { error: existingUserError?.message ?? 'Failed to load the selected user.' },
      { status: 500 }
    )
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(existingUser.user.app_metadata ?? {}),
      role,
    },
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to update user.' }, { status: 500 })
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: parseRole(data.user.app_metadata?.role) ?? 'standard',
    },
  })
}
