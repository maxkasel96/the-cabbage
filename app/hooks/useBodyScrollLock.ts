import { useEffect } from 'react'

const lockCountKey = 'scrollLockCount'
const bodyOverflowKey = 'scrollLockBodyOverflow'
const htmlOverflowKey = 'scrollLockHtmlOverflow'
const paddingRightKey = 'scrollLockPaddingRight'

export default function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') {
      return
    }

    const body = document.body
    const html = document.documentElement
    const currentCount = Number(body.dataset[lockCountKey] ?? '0')
    body.dataset[lockCountKey] = String(currentCount + 1)

    if (currentCount === 0) {
      body.dataset[bodyOverflowKey] = body.style.overflow
      body.dataset[htmlOverflowKey] = html.style.overflow
      body.dataset[paddingRightKey] = body.style.paddingRight

      const scrollbarWidth = window.innerWidth - html.clientWidth
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`
      }

      body.style.overflow = 'hidden'
      html.style.overflow = 'hidden'
    }

    return () => {
      const nextCount = Math.max(
        Number(body.dataset[lockCountKey] ?? '1') - 1,
        0
      )

      if (nextCount === 0) {
        body.style.overflow = body.dataset[bodyOverflowKey] ?? ''
        html.style.overflow = body.dataset[htmlOverflowKey] ?? ''
        body.style.paddingRight = body.dataset[paddingRightKey] ?? ''
        delete body.dataset[bodyOverflowKey]
        delete body.dataset[htmlOverflowKey]
        delete body.dataset[paddingRightKey]
        delete body.dataset[lockCountKey]
      } else {
        body.dataset[lockCountKey] = String(nextCount)
      }
    }
  }, [isLocked])
}
