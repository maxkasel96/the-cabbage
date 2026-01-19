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

  const palette = {
    navBackground: 'var(--nav-surface)',
    navBorder: 'var(--border-strong)',
    linkIdleBackground: 'var(--secondary)',
    linkIdleBorder: 'var(--primary)',
    linkIdleText: 'var(--text-primary)',
    linkActiveBackground: 'var(--primary-hover)',
    linkActiveBorder: 'var(--primary-hover)',
    linkActiveText: 'var(--text-inverse)',
    dropdownBackground: 'var(--nav-surface)',
    dropdownBorder: 'var(--border-strong)',
    shadowStrong: '0 16px 30px rgba(30, 43, 24, 0.35)',
    shadowSoft: '0 10px 22px rgba(30, 43, 24, 0.25)',
  }

  const linkStyle = (href: string) => {
    const isActive = pathname === href
    return {
      padding: '10px 16px',
      borderRadius: 999,
      border: `1px solid ${
        isActive ? palette.linkActiveBorder : palette.linkIdleBorder
      }`,
      textDecoration: 'none',
      color: isActive ? palette.linkActiveText : palette.linkIdleText,
      backgroundColor: isActive
        ? palette.linkActiveBackground
        : palette.linkIdleBackground,
      fontWeight: 600 as const,
      fontSize: 14,
      letterSpacing: 0.2,
      transition: 'all 0.2s ease',
      boxShadow: isActive ? palette.shadowSoft : 'none',
    }
  }

  return (
    <nav
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '14px 18px',
        borderRadius: 20,
        border: `1px solid ${palette.navBorder}`,
        backgroundImage: palette.navBackground,
        boxShadow: palette.shadowStrong,
      }}
    >
      <Link href="/" style={linkStyle('/')}>
        The Game Cabbage
      </Link>
      <Link href="/history" style={linkStyle('/history')}>
        The Annals
      </Link>
      <Link href="/bracket" style={linkStyle('/bracket')}>
        Bracket Generator
      </Link>
      {showAdminMenu ? (
        <details
          ref={detailsRef}
          style={{ position: 'relative' }}
          open={isAdminMenuOpen}
          onToggle={handleAdminToggle}
        >
          <summary
            style={{
              listStyle: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '10px 16px',
              borderRadius: 999,
              border: `1px solid ${
                isAdmin ? palette.linkActiveBorder : palette.linkIdleBorder
              }`,
              color: isAdmin ? palette.linkActiveText : palette.linkIdleText,
              backgroundColor: isAdmin
                ? palette.linkActiveBackground
                : palette.linkIdleBackground,
              boxShadow: isAdmin ? palette.shadowSoft : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Admin pages
          </summary>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              border: `1px solid ${palette.dropdownBorder}`,
              borderRadius: 14,
              backgroundColor: palette.dropdownBackground,
              width: 'min(240px, calc(100vw - 32px))',
              maxWidth: 'calc(100vw - 32px)',
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              marginInline: 'auto',
              zIndex: 10,
              boxShadow: palette.shadowStrong,
              boxSizing: 'border-box',
            }}
          >
            <Link
              href="/admin/games"
              style={linkStyle('/admin/games')}
              onClick={handleAdminItemClick}
            >
              Games
            </Link>
            <Link
              href="/admin/tags"
              style={linkStyle('/admin/tags')}
              onClick={handleAdminItemClick}
            >
              Tags
            </Link>
            <Link
              href="/admin/players"
              style={linkStyle('/admin/players')}
              onClick={handleAdminItemClick}
            >
              Players
            </Link>
            <Link
              href="/admin/tournaments"
              style={linkStyle('/admin/tournaments')}
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
