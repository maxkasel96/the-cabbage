'use client'

import Link from 'next/link'
import { adminNavLinks } from '@/lib/navigation/defaultConfig'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { persistServerSession } from '@/lib/auth/persistServerSession'

export default function AdminSubNav() {
  const pathname = usePathname()
  const router = useRouter()

  const links = adminNavLinks
  const [isExpanded, setIsExpanded] = useState(false)


  const handleNavigation =
    (href: string) => async (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        pathname === href
      ) {
        return
      }

      setIsExpanded(false)
      event.preventDefault()
      await persistServerSession()
      router.push(href)
    }

  return (
    <nav className="admin-side-nav" aria-label="Admin pages">
      <div className="admin-side-nav__title">Admin pages</div>
      <button data-nav-control type="button" className="admin-mobile-switcher" aria-expanded={isExpanded}
        aria-controls="admin-page-links" onClick={() => setIsExpanded(value => !value)}>
        <span>Administration · {links.find(link => link.href === pathname)?.label ?? 'Pages'}</span>
        <span className="mobile-nav-disclosure" aria-hidden="true">{isExpanded ? 'Hide' : 'Show'}</span>
      </button>
      <div id="admin-page-links" className={`admin-side-nav__links${isExpanded ? ' is-expanded' : ''}`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={`admin-side-nav__link${pathname === link.href ? ' is-active' : ''}`}
            onClick={handleNavigation(link.href)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
