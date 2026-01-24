'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const FLOATING_IMAGE_URL =
  'https://mtywyenrzdkvypvvacjz.supabase.co/storage/v1/object/public/images/il_1588xN.7325241583_mwao%20copy.png'

export default function FloatingUtilityButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  function openModal() {
    setIsModalOpen(true)
  }

  function closeModal(event?: React.MouseEvent) {
    event?.stopPropagation()
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="floating-utility-button"
        onClick={openModal}
        aria-label="Open utility modal"
      >
        <img src={FLOATING_IMAGE_URL} alt="Utility" className="floating-utility-button__image" />
      </button>
      {isModalOpen && isMounted
        ? createPortal(
            <div className="player-card-modal" role="dialog" aria-modal="true">
              <div className="player-card-modal__backdrop" onClick={closeModal} />
              <div
                className="player-card-modal__content"
                role="document"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-base font-semibold">Test</p>
                <button type="button" className="player-card-modal__close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
