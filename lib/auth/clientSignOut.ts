import { supabaseBrowser } from '@/lib/supabaseBrowser'

export async function signOutAndRedirect() {
  const supabase = supabaseBrowser()
  await supabase.auth.signOut()
  window.location.assign('/auth/logout')
}
