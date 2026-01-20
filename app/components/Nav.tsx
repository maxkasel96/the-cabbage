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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollStateRef = useRef({
    lastPosition: 0,
    ticking: false,
  })
  const wasMenuOpenRef = useRef(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNavHidden, setIsNavHidden] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsNavHidden(false)
  }, [pathname])

  const handleMobileClose = () => {
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    const handleScroll = () => {
      if (scrollStateRef.current.ticking) {
        return
      }

      scrollStateRef.current.ticking = true
      window.requestAnimationFrame(() => {
        const currentPosition = window.scrollY
        const delta = currentPosition - scrollStateRef.current.lastPosition
        const threshold = 8

        // Scroll direction detection with a small threshold to prevent jitter.
        if (currentPosition <= 4) {
          setIsNavHidden(false)
        } else if (delta > threshold) {
          setIsNavHidden(true)
        } else if (delta < -threshold) {
          setIsNavHidden(false)
        }

        scrollStateRef.current.lastPosition = currentPosition
        scrollStateRef.current.ticking = false
      })
    }

    scrollStateRef.current.lastPosition = window.scrollY
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      if (wasMenuOpenRef.current) {
        menuButtonRef.current?.focus()
      }
      wasMenuOpenRef.current = false
      return
    }

    wasMenuOpenRef.current = true

    const sheet = sheetRef.current
    const focusableElements = sheet
      ? Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
      : []
    const firstElement = focusableElements[0] ?? sheet

    // Move focus into the drawer when it opens.
    firstElement?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const activeElement = document.activeElement as HTMLElement | null
      const currentIndex = focusableElements.indexOf(activeElement ?? focusableElements[0])
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1

      event.preventDefault()
      focusableElements[nextIndex].focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  const renderMobileLink = (href: string, label: string, icon: string) => (
    <Link
      key={href}
      href={href}
      className="main-nav__sheet-link"
      data-active={pathname === href}
      onClick={handleMobileClose}
    >
      <span className="main-nav__sheet-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="main-nav__sheet-label">{label}</span>
    </Link>
  )

  return (
    <nav
      className={`main-nav ${isNavHidden && !isMobileMenuOpen ? 'is-hidden' : ''}`}
      aria-label="Primary"
    >
      <div className="main-nav__bar">
        <Link href="/" className="main-nav__brand">
          <span>The Cabbage</span>
        </Link>
        <button
          type="button"
          className="main-nav__menu-button"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          ref={menuButtonRef}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span aria-hidden="true">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
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
        ref={sheetRef}
        tabIndex={-1}
      >
        <div className="main-nav__sheet-handle" />
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
