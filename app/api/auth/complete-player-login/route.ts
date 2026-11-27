import { NextResponse } from 'next/server'
import { supabaseServerForToken } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (typeof body?.accessToken !== 'string' || !body.accessToken) {
    return NextResponse.json({ error: 'Sign in to accept your invitation.' }, { status: 401 })
  }
  const { error } = await supabaseServerForToken(body.accessToken).rpc('accept_player_invitation')
  if (error) {
    const denied = error.code === '42501'
    return NextResponse.json(
      {
        error: denied
          ? 'An active player invitation or membership is required.'
          : 'Unable to complete sign-in.',
      },
      { status: denied ? 403 : 500 },
    )
  }
  return NextResponse.json({ ok: true })
}
