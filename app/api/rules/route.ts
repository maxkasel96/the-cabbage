import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type RulePayload = {
  id?: string
  tournament_id?: string
  content?: string
  status?: 'Proposed' | 'Accepted' | 'Rejected'
}

const allowedStatuses = new Set(['Proposed', 'Accepted', 'Rejected'])

export async function GET() {
  const { data, error } = await supabaseServer
    .from('rules')
    .select('id, tournament_id, content, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rules: data ?? [] })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RulePayload | null

  const tournament_id = body?.tournament_id?.trim() ?? ''
  const content = body?.content?.trim() ?? ''

  if (!tournament_id || !content) {
    return NextResponse.json({ error: 'tournament_id and content are required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('rules')
    .insert([{ tournament_id, content, status: 'Proposed' }])
    .select('id, tournament_id, content, status, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rule: data })
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as RulePayload | null
  const id = body?.id?.trim() ?? ''
  const status = body?.status ?? 'Proposed'

  if (!id || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'id and valid status are required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('rules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, tournament_id, content, status, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rule: data })
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as RulePayload | null
  const id = body?.id?.trim() ?? ''

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('rules').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
