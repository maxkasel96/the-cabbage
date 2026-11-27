import { NextResponse } from 'next/server'
import { supabaseServerForToken } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (typeof body?.accessToken !== 'string' || !body.accessToken) {
    return NextResponse.json({ error: 'Sign in to link your player.' }, { status: 401 })
  }
  const { error } = await supabaseServerForToken(body.accessToken).rpc('accept_player_invitation')
  if (error) {
    const denied = error.code === '42501'
    return NextResponse.json(
      {
        error: denied
          ? 'Ask an admin to approve your Google email or check that your membership is active.'
          : 'Unable to complete sign-in.',
      },
      { status: denied ? 403 : 500 },
    )
  }
  return NextResponse.json({ ok: true })
}
