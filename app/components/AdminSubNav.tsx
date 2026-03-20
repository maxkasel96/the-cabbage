'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { persistServerSession } from '@/lib/auth/persistServerSession'

export default function AdminSubNav() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: '/admin/games', label: 'Games' },
    { href: '/admin/tags', label: 'Tags' },
    { href: '/admin/players', label: 'Players' },
    { href: '/admin/player-logins', label: 'Player logins' },
    { href: '/admin/tournaments', label: 'Tournaments' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/app-configurations', label: 'App configurations' },
  ] as const

  const handleNavigation =
    (href: string) => async (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        pathname === href
      ) {
        return
      }

      event.preventDefault()
      await persistServerSession()
      router.push(href)
    }

  return (
    <nav className="admin-side-nav" aria-label="Admin pages">
      <div className="admin-side-nav__title">Admin pages</div>
      <div className="admin-side-nav__links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={`admin-side-nav__link${pathname === link.href ? ' is-active' : ''}`}
            onClick={handleNavigation(link.href)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
