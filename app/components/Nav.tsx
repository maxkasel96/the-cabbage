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
    color: '#18b500',
    fontWeight: 600 as const,
  })

  return (
    <nav style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
      <Link href="/" style={linkStyle('/')}>
        Home
      </Link>
      <Link href="/admin/games" style={linkStyle('/admin/games')}>
        Admin: Games
      </Link>
      <Link href="/history" style={linkStyle('/history')}>
        History
      </Link>
    </nav>
  )
}
