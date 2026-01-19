'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type NavProps = {
  showAdminMenu?: boolean
}

export default function Nav({ showAdminMenu = true }: NavProps) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

  const handleAdminItemClick = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
    setIsAdminMenuOpen(false)
  }

  useEffect(() => {
    setIsAdminMenuOpen(false)
  }, [pathname])

  const handleAdminToggle = () => {
    if (detailsRef.current) {
      setIsAdminMenuOpen(detailsRef.current.open)
    }
  }

  const linkProps = (href: string) => ({
    className: 'main-nav__link',
    'data-active': pathname === href,
  })

  return (
    <nav className="main-nav">
      <Link href="/" {...linkProps('/')}>The Game Cabbage</Link>
      <Link href="/history" {...linkProps('/history')}>
        The Annals
      </Link>
      <Link href="/bracket" {...linkProps('/bracket')}>
        Bracket Generator
      </Link>
      {showAdminMenu ? (
        <details
          ref={detailsRef}
          className="main-nav__details"
          open={isAdminMenuOpen}
          onToggle={handleAdminToggle}
        >
          <summary
            className="main-nav__link"
            data-active={isAdmin}
          >
            Admin pages
          </summary>
          <div className="main-nav__dropdown">
            <Link
              href="/admin/games"
              {...linkProps('/admin/games')}
              onClick={handleAdminItemClick}
            >
              Games
            </Link>
            <Link
              href="/admin/tags"
              {...linkProps('/admin/tags')}
              onClick={handleAdminItemClick}
            >
              Tags
            </Link>
            <Link
              href="/admin/players"
              {...linkProps('/admin/players')}
              onClick={handleAdminItemClick}
            >
              Players
            </Link>
            <Link
              href="/admin/tournaments"
              {...linkProps('/admin/tournaments')}
              onClick={handleAdminItemClick}
            >
              Tournaments
            </Link>
          </div>
        </details>
      ) : null}
    </nav>
  )
}
