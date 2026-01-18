import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const label = (body?.label as string | undefined)?.trim() ?? ''
  const year_start = Number(body?.year_start)
  const year_end = Number(body?.year_end)

  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })
  if (!Number.isInteger(year_start)) return NextResponse.json({ error: 'year_start must be an integer' }, { status: 400 })
  if (!Number.isInteger(year_end)) return NextResponse.json({ error: 'year_end must be an integer' }, { status: 400 })
  if (year_end !== year_start + 1) {
    return NextResponse.json({ error: 'year_end must equal year_start + 1' }, { status: 400 })
  }

  // Turn off current active tournament
  const off = await supabaseServer.from('tournaments').update({ is_active: false }).eq('is_active', true)
  if (off.error) return NextResponse.json({ error: off.error.message }, { status: 500 })

  // Insert new active tournament
  const ins = await supabaseServer
    .from('tournaments')
    .insert([{ label, year_start, year_end, is_active: true }])
    .select('id, label, year_start, year_end, is_active, created_at')
    .single()

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })

  return NextResponse.json({ tournament: ins.data })
}
