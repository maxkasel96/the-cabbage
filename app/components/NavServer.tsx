import NavClient from '@/app/components/NavClient'
import { getNavConfig } from '@/lib/navigation/getNavConfig'

type NavServerProps = {
  showAdminMenu?: boolean
}

export default async function NavServer({ showAdminMenu }: NavServerProps) {
  const config = await getNavConfig('main')

  return <NavClient showAdminMenu={showAdminMenu} initialConfig={config} />
}
