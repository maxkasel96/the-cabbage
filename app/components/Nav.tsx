'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const linkStyle = (href: string) => ({
    padding: '8px 12px',
    borderRadius: 8,
    border: pathname === href ? '2px solid #000' : '1px solid #ddd',
    textDecoration: 'none',
    color: '#388e4a',
    fontWeight: 600 as const,
  })

  return (
    <nav
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 18,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}
    >
      <Link href="/" style={linkStyle('/')}>
        Home
      </Link>
      <Link href="/history" style={linkStyle('/history')}>
        History
      </Link>
      <details
        style={{ position: 'relative' }}
        open={pathname.startsWith('/admin')}
      >
        <summary
          style={{
            listStyle: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ddd',
            color: '#388e4a',
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
            padding: 10,
            border: '1px solid #ddd',
            borderRadius: 10,
            backgroundColor: '#fff',
            minWidth: 180,
          }}
        >
          <Link href="/admin/games" style={linkStyle('/admin/games')}>
            Games
          </Link>
          <Link href="/admin/tags" style={linkStyle('/admin/tags')}>
            Tags
          </Link>
          <Link href="/admin/tournaments" style={linkStyle('/admin/tournaments')}>
            Tournaments
          </Link>
        </div>
      </details>
    </nav>
  )
}
