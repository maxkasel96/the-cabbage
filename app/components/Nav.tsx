'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  const linkStyle = (href: string) => {
    const isActive = pathname === href
    return {
      padding: '10px 14px',
      borderRadius: 999,
      border: isActive ? '1px solid #1b5e20' : '1px solid #e2e8f0',
      textDecoration: 'none',
      color: isActive ? '#ffffff' : '#1b5e20',
      backgroundColor: isActive ? '#1b5e20' : '#f5f7f9',
      fontWeight: 600 as const,
      fontSize: 14,
      letterSpacing: 0.2,
      transition: 'all 0.2s ease',
      boxShadow: isActive ? '0 6px 14px rgba(27, 94, 32, 0.18)' : 'none',
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
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Link href="/" style={linkStyle('/')}>
        The Game Cabbage
      </Link>
      <Link href="/history" style={linkStyle('/history')}>
        The Anals
      </Link>
      <details
        style={{ position: 'relative' }}
        open={isAdmin}
      >
        <summary
          style={{
            listStyle: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '10px 14px',
            borderRadius: 999,
            border: isAdmin ? '1px solid #1b5e20' : '1px solid #e2e8f0',
            color: isAdmin ? '#ffffff' : '#1b5e20',
            backgroundColor: isAdmin ? '#1b5e20' : '#f5f7f9',
            boxShadow: isAdmin ? '0 6px 14px rgba(27, 94, 32, 0.18)' : 'none',
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
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            backgroundColor: '#fff',
            minWidth: 200,
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 10,
            boxShadow: '0 16px 28px rgba(15, 23, 42, 0.14)',
          }}
        >
          <Link href="/admin/games" style={linkStyle('/admin/games')}>
            Games
          </Link>
          <Link href="/admin/tags" style={linkStyle('/admin/tags')}>
            Tags
          </Link>
          <Link href="/admin/players" style={linkStyle('/admin/players')}>
            Players
          </Link>
          <Link href="/admin/tournaments" style={linkStyle('/admin/tournaments')}>
            Tournaments
          </Link>
        </div>
      </details>
    </nav>
  )
}
