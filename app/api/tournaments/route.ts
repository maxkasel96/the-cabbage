import { NextResponse } from 'next/server'
import { getAccessTokenFromRequest } from '@/lib/auth/token'
import { supabaseServerForToken } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  const token = getAccessTokenFromRequest(req)
  const supabaseServer = supabaseServerForToken(token)
  const { data, error } = await supabaseServer
    .from('tournaments')
    .select('id, label, year_start, year_end, is_active, created_at')
    .order('year_start', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tournaments: data ?? [] })
}
