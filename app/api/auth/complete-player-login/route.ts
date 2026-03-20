import { NextResponse } from 'next/server'
import { authorizePlayerLogin } from '@/lib/auth/authorizePlayerLogin'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const accessToken = body?.accessToken as string | undefined

  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer.auth.getUser(accessToken)

  if (error || !data?.user) {
    return NextResponse.json({ error: 'Invalid authorization token.' }, { status: 401 })
  }

  try {
    const result = await authorizePlayerLogin(data.user)

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 403 })
    }

    return NextResponse.json({ ok: true, playerId: result.playerId, playerName: result.playerName })
  } catch (authorizationError) {
    return NextResponse.json(
      {
        error:
          authorizationError instanceof Error
            ? authorizationError.message
            : 'Failed to authorize the signed-in player.',
      },
      { status: 500 }
    )
  }
}
