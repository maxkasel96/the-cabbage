'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSubNav() {
  const pathname = usePathname()

  const palette = {
    background: 'rgba(31, 42, 26, 0.95)',
    border: 'rgba(166, 195, 139, 0.6)',
    linkIdleBackground: 'rgba(201, 216, 191, 0.2)',
    linkIdleBorder: 'var(--gloss-highlight)',
    linkIdleText: 'var(--pale-celery)',
    linkActiveBackground: 'var(--cabbage-green)',
    linkActiveBorder: 'var(--leaf-green)',
    linkActiveText: 'var(--pale-celery)',
    shadowSoft: '0 8px 18px rgba(31, 42, 26, 0.28)',
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
        padding: '10px 14px',
        borderRadius: 16,
        marginBottom: 12,
        background: palette.background,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 0.6, color: 'var(--pale-celery)' }}>Admin pages</span>
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
