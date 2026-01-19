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
    <nav style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
      <Link href="/" style={linkStyle('/')}>
        Home
      </Link>
      <Link href="/history" style={linkStyle('/history')}>
        History
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontWeight: 600 }}>Admin pages</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
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
      </div>
    </nav>
  )
}
