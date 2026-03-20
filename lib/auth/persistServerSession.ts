import { supabaseBrowser } from '@/lib/supabaseBrowser'

let pendingServerSessionPersistence: Promise<boolean> | null = null

export const persistServerSession = async () => {
  if (pendingServerSessionPersistence) {
    return pendingServerSessionPersistence
  }

  pendingServerSessionPersistence = (async () => {
    const supabase = supabaseBrowser()
    const { data, error } = await supabase.auth.getSession()
    const session = data.session

    if (error || !session) {
      return false
    }

    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: session.access_token,
        expiresIn: session.expires_in,
        expiresAt: session.expires_at,
      }),
    })

    return response.ok
  })().finally(() => {
    pendingServerSessionPersistence = null
  })

  return pendingServerSessionPersistence
}
