'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSubNav() {
  const pathname = usePathname()

  return (
    <nav className="admin-side-nav" aria-label="Admin pages">
      <div className="admin-side-nav__title">Admin pages</div>
      <div className="admin-side-nav__links">
        <Link
          href="/admin/games"
          className={`admin-side-nav__link${pathname === '/admin/games' ? ' is-active' : ''}`}
        >
        Games
        </Link>
        <Link
          href="/admin/tags"
          className={`admin-side-nav__link${pathname === '/admin/tags' ? ' is-active' : ''}`}
        >
        Tags
        </Link>
        <Link
          href="/admin/players"
          className={`admin-side-nav__link${pathname === '/admin/players' ? ' is-active' : ''}`}
        >
        Players
        </Link>
        <Link
          href="/admin/tournaments"
          className={`admin-side-nav__link${pathname === '/admin/tournaments' ? ' is-active' : ''}`}
        >
        Tournaments
        </Link>
        <Link
          href="/admin/app-configurations"
          className={`admin-side-nav__link${
            pathname === '/admin/app-configurations' ? ' is-active' : ''
          }`}
        >
        App configurations
        </Link>
        <Link
          href="/admin/navigation"
          className={`admin-side-nav__link${pathname === '/admin/navigation' ? ' is-active' : ''}`}
        >
        Navigation
        </Link>
      </div>
    </nav>
  )
}
