'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type NavProps = {
  showAdminMenu?: boolean
}

const primaryLinks = [
  { href: '/', label: 'The Game Cabbage', icon: '🥬' },
  { href: '/history', label: 'The Annals', icon: '📜' },
  { href: '/bracket', label: 'Bracket Generator', icon: '🏆' },
]

const adminLinks = [
  { href: '/admin/games', label: 'Games', icon: '🎮' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
  { href: '/admin/players', label: 'Players', icon: '👥' },
  { href: '/admin/tournaments', label: 'Tournaments', icon: '🏟️' },
]

export default function Nav({ showAdminMenu = true }: NavProps) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleAdminItemClick = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
    setIsAdminMenuOpen(false)
  }

  useEffect(() => {
    setIsAdminMenuOpen(false)
    setIsMobileMenuOpen(false)
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

  const handleMobileClose = () => {
    setIsMobileMenuOpen(false)
  }

  const renderMobileLink = (href: string, label: string, icon: string) => (
    <Link
      key={href}
      href={href}
      className="main-nav__sheet-link"
      data-active={pathname === href}
      onClick={handleMobileClose}
    >
      <span className="main-nav__sheet-dot" aria-hidden="true" />
      <span className="main-nav__sheet-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="main-nav__sheet-label">{label}</span>
    </Link>
  )

  return (
    <nav className="main-nav" aria-label="Primary">
      <div className="main-nav__bar">
        <Link href="/" className="main-nav__brand">
          <span aria-hidden="true">🥬</span>
          <span>The Game Cabbage</span>
        </Link>
        <button
          type="button"
          className="main-nav__menu-button"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          ≡
        </button>
      </div>

      <div className="main-nav__desktop">
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
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  {...linkProps(link.href)}
                  onClick={handleAdminItemClick}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <button
        type="button"
        className={`main-nav__scrim ${isMobileMenuOpen ? 'is-visible' : ''}`}
        aria-hidden="true"
        tabIndex={-1}
        onClick={handleMobileClose}
      />

      <div
        className={`main-nav__sheet ${isMobileMenuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="main-nav__sheet-handle" />
        <div className="main-nav__sheet-title">Navigation</div>
        <div className="main-nav__sheet-links">
          {primaryLinks.map((link) => renderMobileLink(link.href, link.label, link.icon))}
        </div>
        {showAdminMenu ? (
          <div className="main-nav__sheet-section">
            <div className="main-nav__sheet-section-title">Admin</div>
            <div className="main-nav__sheet-links">
              {adminLinks.map((link) => renderMobileLink(link.href, link.label, link.icon))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="main-nav__sheet-close"
          onClick={handleMobileClose}
        >
          Close
        </button>
      </div>
    </nav>
  )
}
