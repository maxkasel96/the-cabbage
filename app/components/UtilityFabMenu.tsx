'use client'

import { useEffect, useId, useRef, useState } from 'react'
import FloatingUtilityButton from './FloatingUtilityButton'
import SpotifyPlaylistModal from './SpotifyPlaylistModal'

export default function UtilityFabMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const actionsId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function toggleMenu() {
    setIsOpen((currentValue) => !currentValue)
  }

  function collapseMenu() {
    setIsOpen(false)
  }

  return (
    <>
      <div
        className={`utility-fab-menu__backdrop${isOpen ? ' utility-fab-menu__backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={collapseMenu}
      />

      <div className={`utility-fab-menu${isOpen ? ' utility-fab-menu--open' : ''}`} ref={menuRef}>
        <div
          id={actionsId}
          className="utility-fab-menu__actions"
          aria-hidden={!isOpen}
        >
          <div
            className="utility-fab-menu__action utility-fab-menu__action--spotify"
            onClickCapture={collapseMenu}
          >
            <SpotifyPlaylistModal
              className="spotify-playlist-button--menu-child"
              tabIndex={isOpen ? 0 : -1}
            />
          </div>
          <div
            className="utility-fab-menu__action utility-fab-menu__action--utility"
            onClickCapture={collapseMenu}
          >
            <FloatingUtilityButton
              className="floating-utility-button--menu-child"
              tabIndex={isOpen ? 0 : -1}
            />
          </div>
        </div>

        <button
          type="button"
          className="floating-utility-button utility-fab-menu__trigger"
          aria-label={isOpen ? 'Close utility menu' : 'Open utility menu'}
          aria-expanded={isOpen}
          aria-controls={actionsId}
          onClick={toggleMenu}
        >
          <span className="utility-fab-menu__trigger-icon" aria-hidden="true">
            <span className="utility-fab-menu__trigger-line utility-fab-menu__trigger-line--horizontal" />
            <span className="utility-fab-menu__trigger-line utility-fab-menu__trigger-line--vertical" />
          </span>
        </button>
      </div>
    </>
  )
}
