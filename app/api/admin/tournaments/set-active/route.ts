import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const tournamentId = (body?.tournamentId as string | undefined)?.trim() ?? ''

  if (!tournamentId || !uuidRegex.test(tournamentId)) {
    return NextResponse.json({ error: `Invalid tournamentId: ${tournamentId}` }, { status: 400 })
  }

  // Deactivate any currently-active tournament
  const off = await supabaseServer.from('tournaments').update({ is_active: false }).eq('is_active', true)
  if (off.error) return NextResponse.json({ error: off.error.message }, { status: 500 })

  // Activate requested tournament
  const on = await supabaseServer
    .from('tournaments')
    .update({ is_active: true })
    .eq('id', tournamentId)
    .select('id, label, year_start, year_end, is_active, created_at')
    .single()

  if (on.error) return NextResponse.json({ error: on.error.message }, { status: 500 })
  if (!on.data?.id) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  return NextResponse.json({ tournament: on.data })
}
