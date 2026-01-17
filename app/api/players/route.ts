import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('players')
    .select('id, display_name')
    .eq('is_active', true)
    .order('display_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data ?? [] })
}
