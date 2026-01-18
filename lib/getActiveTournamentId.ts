import { supabaseServer } from '@/lib/supabaseServer'

export async function getActiveTournamentId() {
  const { data, error } = await supabaseServer
    .from('tournaments')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) return null
  return data.id as string
}
