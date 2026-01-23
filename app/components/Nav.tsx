'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type {
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'

type NavProps = {
  showAdminMenu?: boolean
}

type NavLink = {
  href: string
  label: string
  icon: string
  description?: string
}

type MegaMenuItem = {
  href: string
  title: string
  description: string
  icon: keyof typeof iconPaths
  tone: 'sage' | 'mint' | 'wheat' | 'sky' | 'moss' | 'peach'
}

type MegaMenuGroup = {
  title: string
  items: MegaMenuItem[]
}

type MegaMenuConfig = {
  id: string
  label: string
  groups: MegaMenuGroup[]
}

const primaryLinks: NavLink[] = [
  {
    href: '/',
    label: 'The Game Cabbage',
    icon: '🥬',
    description: 'Home for today’s matchup.',
  },
  {
    href: '/history',
    label: 'The Annals',
    icon: '📜',
    description: 'Past champions and stories.',
  },
  {
    href: '/player-cards',
    label: 'Player Cards',
    icon: '🃏',
    description: 'Quick stats at a glance.',
  },
  {
    href: '/players',
    label: 'Players',
    icon: '👤',
    description: 'Roster and bios.',
  },
  {
    href: '/bracket',
    label: 'Bracket Generator',
    icon: '🏆',
    description: 'Spin up new tournaments.',
  },
]

const iconPaths = {
  leaf: (
    <path d="M12 3c4.4 0 7 3.6 7 8 0 4.4-3.6 8-8 8-1.6 0-3.3-.5-4.7-1.4l-2.3 2.4a1 1 0 0 1-1.4-1.4l2.4-2.3A8.1 8.1 0 0 1 4 11c0-4.4 3.6-8 8-8z" />
  ),
  scroll: (
    <path d="M7 5h7a3 3 0 0 1 0 6H7a2 2 0 0 0 0 4h9a1 1 0 1 1 0 2H7a4 4 0 1 1 0-8h7a1 1 0 0 0 0-2H7a1 1 0 1 1 0-2z" />
  ),
  bracket: (
    <path d="M8 5H6a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h2v-2H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2V5zm8 0h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2v-2h2a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-2V5z" />
  ),
  guide: (
    <path d="M5 4h9a3 3 0 0 1 3 3v11a1 1 0 0 1-1.6.8L12 16l-3.4 2.8A1 1 0 0 1 7 18V7a3 3 0 0 1 3-3H5a1 1 0 1 1 0-2z" />
  ),
  tags: (
    <path d="M12.6 4.4 18 9.8a2 2 0 0 1 0 2.8l-4.4 4.4a2 2 0 0 1-2.8 0L5.4 11.6a2 2 0 0 1-.6-1.4V5a1 1 0 0 1 1-1h5.2a2 2 0 0 1 1.4.4zM9 8a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 9 8z" />
  ),
  users: (
    <path d="M9 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm7 1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM3 18a5 5 0 0 1 10 0v1H3v-1zm11.5 1v-1a4 4 0 0 1 7 0v1h-7z" />
  ),
  trophy: (
    <path d="M7 4h10a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-1a4 4 0 0 1-8 0H4a4 4 0 0 1-4-4V5a1 1 0 0 1 1-1h6zm0 2H2v1a2 2 0 0 0 2 2h1V6zm10 0v3h1a2 2 0 0 0 2-2V6h-3zM9 17h6v2H9v-2z" />
  ),
  controller: (
    <path d="M7 10a1 1 0 0 1 1-1h2V7a1 1 0 1 1 2 0v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H8a1 1 0 0 1-1-1zm10-4a5 5 0 0 1 4.8 6.2l-1.3 4.8a2 2 0 0 1-3.1 1.1l-2.9-2.1H9.5l-2.9 2.1a2 2 0 0 1-3.1-1.1L2.2 12A5 5 0 0 1 7 6h10z" />
  ),
}

const adminMenu: MegaMenuConfig = {
  id: 'admin',
  label: 'Admin',
  groups: [
    {
      title: 'Game Ops',
      items: [
        {
          href: '/admin/games',
          title: 'Games',
          description: 'Manage matchups and outcomes.',
          icon: 'controller',
          tone: 'moss',
        },
        {
          href: '/admin/tags',
          title: 'Tags',
          description: 'Curate metadata and categories.',
          icon: 'tags',
          tone: 'wheat',
        },
        {
          href: '/admin/tournaments',
          title: 'Tournaments',
          description: 'Organize brackets and schedules.',
          icon: 'trophy',
          tone: 'sky',
        },
      ],
    },
    {
      title: 'Player Ops',
      items: [
        {
          href: '/admin/players',
          title: 'Players',
          description: 'Update rosters and bios.',
          icon: 'users',
          tone: 'mint',
        },
      ],
    },
  ],
}

const megaMenus = [adminMenu]

type IconProps = {
  name: keyof typeof iconPaths
}

const Icon = ({ name }: IconProps) => (
  <svg
    className="mega-menu__icon-svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    {iconPaths[name]}
  </svg>
)

type MegaMenuItemProps = {
  item: MegaMenuItem
  onNavigate?: () => void
}

const MegaMenuItemCard = ({ item, onNavigate }: MegaMenuItemProps) => (
  <Link
    href={item.href}
    className="mega-menu__item"
    onClick={onNavigate}
    role="menuitem"
  >
    <span className={`mega-menu__icon mega-menu__icon--${item.tone}`}>
      <Icon name={item.icon} />
    </span>
    <span className="mega-menu__item-content">
      <span className="mega-menu__item-title">{item.title}</span>
      <span className="mega-menu__item-description">{item.description}</span>
    </span>
  </Link>
)

export default function Nav({ showAdminMenu = true }: NavProps) {
  const pathname = usePathname()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const desktopNavRef = useRef<HTMLDivElement>(null)
  const scrollStateRef = useRef({
    lastPosition: 0,
    ticking: false,
  })
  const wasMenuOpenRef = useRef(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNavHidden, setIsNavHidden] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!activeMenu) {
      return
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (desktopNavRef.current?.contains(target ?? null)) {
        return
      }
      setActiveMenu(null)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [activeMenu])

  const renderMobileLink = (
    href: string,
    label: string,
    icon: string,
    description?: string
  ) => (
    <Link
      key={href}
      href={href}
      className="main-nav__sheet-link"
      data-active={pathname === href}
      onClick={handleMobileClose}
    >
      <span className="main-nav__sheet-indicator" aria-hidden="true" />
      <span className="main-nav__sheet-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="main-nav__sheet-text">
        <span className="main-nav__sheet-label">{label}</span>
        {description ? (
          <span className="main-nav__sheet-description">{description}</span>
        ) : null}
      </span>
    </Link>
  )

  const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setActiveMenu(null)
    }
  }

  const handleDesktopKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setActiveMenu(null)
    }
  }

  const handleDesktopItemMouseLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setActiveMenu(null)
    }
  }

  const handleDesktopNavigate = () => {
    setActiveMenu(null)
  }

  return (
    <nav
      className={`main-nav ${isNavHidden && !isMobileMenuOpen ? 'is-hidden' : ''}`}
      aria-label="Primary"
    >
      <div className="main-nav__bar">
        <Link href="/" className="main-nav__brand">
          <span className="main-nav__brand-icon" aria-hidden="true">
            🥬
          </span>
          <span className="main-nav__brand-text">The Game Cabbage</span>
        </Link>
        <div
          className="main-nav__desktop"
          ref={desktopNavRef}
          onBlur={handleDesktopBlur}
          onKeyDown={handleDesktopKeyDown}
        >
          <div className="main-nav__desktop-links" role="menubar" aria-label="Primary">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="main-nav__desktop-link"
                data-active={pathname === link.href}
                role="menuitem"
                onMouseEnter={() => setActiveMenu(null)}
              >
                {link.label}
              </Link>
            ))}
            {showAdminMenu
              ? megaMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className="main-nav__desktop-item"
                    onMouseEnter={() => setActiveMenu(menu.id)}
                    onMouseLeave={handleDesktopItemMouseLeave}
                  >
                    <button
                      type="button"
                      className="main-nav__desktop-trigger"
                      aria-haspopup="true"
                      aria-expanded={activeMenu === menu.id}
                      aria-controls={`mega-menu-${menu.id}`}
                      onFocus={() => setActiveMenu(menu.id)}
                    >
                      {menu.label}
                    </button>
                    <div
                      id={`mega-menu-${menu.id}`}
                      className={`mega-menu ${activeMenu === menu.id ? 'is-open' : ''}`}
                      role="menu"
                      aria-label={`${menu.label} menu`}
                      onMouseEnter={() => setActiveMenu(menu.id)}
                    >
                      <div className="mega-menu__content">
                        {menu.groups.map((group) => (
                          <div key={group.title} className="mega-menu__group">
                            <div className="mega-menu__group-title">{group.title}</div>
                            <div className="mega-menu__items">
                              {group.items.map((item) => (
                                <MegaMenuItemCard
                                  key={item.title}
                                  item={item}
                                  onNavigate={handleDesktopNavigate}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>
        <button
          type="button"
          className="main-nav__menu-button"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
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
        <div className="main-nav__sheet-title">Navigation</div>
        <div className="main-nav__sheet-links">
          {primaryLinks.map((link) =>
            renderMobileLink(link.href, link.label, link.icon, link.description)
          )}
        </div>
        {showAdminMenu ? (
          <div className="main-nav__sheet-section">
            <div className="main-nav__sheet-section-title">Admin</div>
            {adminMenu.groups.map((group) => (
              <div key={group.title} className="main-nav__sheet-group">
                <div className="main-nav__sheet-group-title">{group.title}</div>
                <div className="main-nav__sheet-links">
                  {group.items.map((item) =>
                    renderMobileLink(item.href, item.title, '🛠️', item.description)
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="main-nav__sheet-close"
          onClick={handleMobileClose}
        >
          Close menu
        </button>
      </div>
    </nav>
  )
}
