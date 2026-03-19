import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

type PlayerLoginIdentityRow = {
  id: string
  player_id: string
  provider: 'google'
  email: string
  auth_user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  players:
    | {
        id: string
        display_name: string
        is_active: boolean
      }
    | {
        id: string
        display_name: string
        is_active: boolean
      }[]
    | null
}

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized || null
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = getSupabaseServiceRole()

  try {
    const [{ data: identities, error: identitiesError }, { data: players, error: playersError }] = await Promise.all([
      supabase
        .from('player_login_identities')
        .select('id, player_id, provider, email, auth_user_id, is_active, created_at, updated_at, players:player_id ( id, display_name, is_active )')
        .order('created_at', { ascending: false }),
      supabase.from('players').select('id, display_name, is_active').order('display_name'),
    ])

    if (identitiesError) {
      return NextResponse.json({ error: identitiesError.message }, { status: 500 })
    }

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    const rows = (identities ?? []).map((identity) => {
      const typedIdentity = identity as PlayerLoginIdentityRow
      const player = Array.isArray(typedIdentity.players) ? typedIdentity.players[0] ?? null : typedIdentity.players

      return {
        id: typedIdentity.id,
        player_id: typedIdentity.player_id,
        provider: typedIdentity.provider,
        email: typedIdentity.email,
        auth_user_id: typedIdentity.auth_user_id,
        is_active: typedIdentity.is_active,
        created_at: typedIdentity.created_at,
        updated_at: typedIdentity.updated_at,
        player,
      }
    })

    return NextResponse.json({
      identities: rows,
      players: players ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load player login identities.' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const playerId = typeof body?.playerId === 'string' ? body.playerId : null
  const email = normalizeEmail(body?.email)
  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : true

  if (!playerId || !email) {
    return NextResponse.json({ error: 'playerId and email are required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRole()
  const payload = {
    player_id: playerId,
    provider: 'google' as const,
    email,
    is_active: isActive,
  }

  const { data, error } = await supabase
    .from('player_login_identities')
    .upsert(payload, { onConflict: 'player_id,provider' })
    .select('id, player_id, provider, email, auth_user_id, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ identity: data })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null
  const email = body?.email === undefined ? undefined : normalizeEmail(body.email)
  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined
  const clearAuthUserId = body?.clearAuthUserId === true

  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  if (body?.email !== undefined && !email) {
    return NextResponse.json({ error: 'email must be a non-empty string when provided.' }, { status: 400 })
  }

  const updates: { email?: string; is_active?: boolean; auth_user_id?: null } = {}

  if (typeof email === 'string') {
    updates.email = email
  }

  if (isActive !== undefined) {
    updates.is_active = isActive
  }

  if (clearAuthUserId) {
    updates.auth_user_id = null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Provide email, isActive, and/or clearAuthUserId to update a login identity.' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase
    .from('player_login_identities')
    .update(updates)
    .eq('id', id)
    .select('id, player_id, provider, email, auth_user_id, is_active, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ identity: data })
}
