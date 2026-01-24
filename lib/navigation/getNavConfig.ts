import { supabaseServer } from '@/lib/supabaseServer'
import { defaultNavConfig } from '@/lib/navigation/defaultConfig'
import { navConfigSchema } from '@/lib/navigation/schema'

export async function getNavConfig(name = 'main') {
  const { data, error } = await supabaseServer
    .from('navigation_configs')
    .select('config')
    .eq('name', name)
    .maybeSingle()

  if (error || !data?.config) {
    return defaultNavConfig
  }

  const parsed = navConfigSchema.safeParse(data.config)
  if (!parsed.success) {
    return defaultNavConfig
  }

  return parsed.data
}
