import { supabaseServer, supabaseServerForToken } from '@/lib/supabaseServer'

export async function getActiveTournamentId(token?: string | null) {
  const client = typeof token === 'string' ? supabaseServerForToken(token) : supabaseServer

  const { data, error } = await client
    .from('tournaments')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) return null
  return data.id as string
}
