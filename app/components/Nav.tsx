'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function Nav() {
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

  const linkStyle = (href: string) => {
    const isActive = pathname === href
    return {
      padding: '10px 14px',
      borderRadius: 999,
      border: isActive ? '1px solid #2f6d4a' : '1px solid #8fb29a',
      textDecoration: 'none',
      color: isActive ? '#1d4732' : '#1f4d3a',
      backgroundColor: isActive ? '#d7ead3' : '#f5f2e8',
      fontWeight: 600 as const,
      fontSize: 14,
      letterSpacing: 0.2,
      transition: 'all 0.2s ease',
      boxShadow: isActive ? '0 6px 14px rgba(47, 109, 74, 0.18)' : 'none',
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
        padding: '12px 16px',
        borderRadius: 18,
        border: '1px solid #cbd5c1',
        backgroundColor: '#e9f1e5',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
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
            padding: '10px 14px',
            borderRadius: 999,
            border: isAdmin ? '1px solid #2f6d4a' : '1px solid #8fb29a',
            color: isAdmin ? '#1d4732' : '#1f4d3a',
            backgroundColor: isAdmin ? '#d7ead3' : '#f5f2e8',
            boxShadow: isAdmin
              ? '0 6px 14px rgba(47, 109, 74, 0.18)'
              : 'none',
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
            border: '1px solid #e2e8d7',
            borderRadius: 14,
            backgroundColor: '#f8f7f2',
            width: 'min(240px, calc(100vw - 32px))',
            maxWidth: 'calc(100vw - 32px)',
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            marginInline: 'auto',
            zIndex: 10,
            boxShadow: '0 16px 28px rgba(15, 23, 42, 0.14)',
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
    </nav>
  )
}
