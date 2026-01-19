import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  params: {
    id: string
  }
}

export async function PUT(req: Request, { params }: Params) {
  const id = params.id
  const body = await req.json().catch(() => null)
  const isActive = body?.is_active

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('players')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id, display_name, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ player: data })
}
