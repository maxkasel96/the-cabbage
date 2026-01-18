import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const label = (body?.label as string | undefined)?.trim() || ''

  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })

  // Turn off current active
  const off = await supabaseServer.from('tournaments').update({ is_active: false }).eq('is_active', true)
  if (off.error) return NextResponse.json({ error: off.error.message }, { status: 500 })

  // Create new + set active
  const ins = await supabaseServer
    .from('tournaments')
    .insert([{ label, is_active: true }])
    .select('id, label, is_active')
    .single()

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })

  return NextResponse.json({ tournament: ins.data })
}
