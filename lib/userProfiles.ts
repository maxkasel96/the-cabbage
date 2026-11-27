import type { User } from '@supabase/supabase-js'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

const columns = 'user_id,email,display_name,role,profile_data,created_at,updated_at,last_sign_in_at'

export async function getOwnProfile(user: User) {
  const { data, error } = await getSupabaseServiceRole()
    .from('user_profiles')
    .select(columns)
    .eq('user_id', user.id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateOwnUserProfile(
  user: User,
  changes: {
    display_name?: string
    profile_data?: Record<string, unknown>
  },
) {
  const { data, error } = await getSupabaseServiceRole()
    .rpc('update_member_profile_fields', {
      p_user_id: user.id,
      p_display_name: changes.display_name,
      p_fields: changes.profile_data ?? {},
    })
    .select(columns)
    .single()
  if (error) throw new Error(error.message)
  return data as Record<string, unknown>
}
