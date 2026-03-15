import { supabaseServer } from '@/lib/supabaseServer'
import { defaultNavConfig } from '@/lib/navigation/defaultConfig'
import { navConfigSchema, type NavConfig } from '@/lib/navigation/schema'

function ensureAdminUsersLink(config: NavConfig): NavConfig {
  const adminMenu = config.megaMenus.find((menu) => menu.id === 'admin')

  if (!adminMenu) {
    return config
  }

  const alreadyHasUsersLink = adminMenu.groups.some((group) =>
    group.items.some((item) => item.href === '/admin/users'),
  )

  if (alreadyHasUsersLink) {
    return config
  }

  const appOpsGroup = adminMenu.groups.find((group) => group.id === '8b944ed1-b3a8-43fc-98a8-010f1c7851a0')

  if (!appOpsGroup) {
    return config
  }

  appOpsGroup.items.push({
    id: crypto.randomUUID(),
    href: '/admin/users',
    title: 'Users',
    description: 'Manage admin and member role assignments.',
    icon: 'users',
    tone: 'mint',
    sortOrder: appOpsGroup.items.length + 1,
    isVisible: true,
  })

  return config
}

export async function getNavConfig(name = 'main') {
  const { data, error } = await supabaseServer
    .from('navigation_configs')
    .select('config')
    .eq('name', name)
    .maybeSingle()

  if (error || !data?.config) {
    return ensureAdminUsersLink(defaultNavConfig)
  }

  const parsed = navConfigSchema.safeParse(data.config)
  if (!parsed.success) {
    return ensureAdminUsersLink(defaultNavConfig)
  }

  return ensureAdminUsersLink(parsed.data)
}
