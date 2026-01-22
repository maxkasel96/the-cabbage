import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const isActive = body?.is_active
  const playerBio = body?.player_bio

  const update: { is_active?: boolean; player_bio?: string | null } = {}

  if (typeof isActive === 'boolean') {
    update.is_active = isActive
  }

  if (typeof playerBio === 'string') {
    update.player_bio = playerBio.trim() === '' ? null : playerBio
  } else if (playerBio === null) {
    update.player_bio = null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('players')
    .update(update)
    .eq('id', id)
    .select('id, display_name, is_active, player_bio')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ player: data })
}
