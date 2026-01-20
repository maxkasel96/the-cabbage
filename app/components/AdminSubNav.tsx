'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSubNav() {
  const pathname = usePathname()

  const palette = {
    background: 'var(--nav-surface)',
    border: 'var(--border-strong)',
    linkIdleBackground: 'transparent',
    linkIdleBorder: 'transparent',
    linkIdleText: 'var(--text-inverse)',
    linkActiveBackground: 'var(--primary)',
    linkActiveBorder: 'var(--primary)',
    linkActiveText: 'var(--text-inverse)',
    shadowSoft: '0 8px 18px rgba(30, 43, 24, 0.28)',
  }

  const linkStyle = (href: string) => {
    const isActive = pathname === href
    return {
      padding: '8px 14px',
      borderRadius: 999,
      border: `1px solid ${isActive ? palette.linkActiveBorder : palette.linkIdleBorder}`,
      textDecoration: 'none',
      color: isActive ? palette.linkActiveText : palette.linkIdleText,
      backgroundColor: isActive ? palette.linkActiveBackground : palette.linkIdleBackground,
      fontWeight: 600 as const,
      fontSize: 13,
      letterSpacing: 0.3,
      boxShadow: isActive ? palette.shadowSoft : 'none',
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        marginTop: 12,
        padding: '10px 14px',
        borderRadius: 16,
        marginBottom: 12,
        background: palette.background,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 0.6, color: 'var(--text-inverse)' }}>Admin pages</span>
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
  )
}
