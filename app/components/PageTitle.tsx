'use client'

import type { ReactNode } from 'react'

type PageTitleProps = {
  children: ReactNode
}

export default function PageTitle({ children }: PageTitleProps) {
  return (
    <h1
      style={{
        margin: '0 0 10px',
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: 1,
        display: 'inline-block',
        backgroundImage:
          'linear-gradient(120deg, var(--cabbage-green) 0%, var(--gloss-highlight) 45%, var(--leaf-green) 100%)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        textShadow: '0 10px 24px rgba(63, 90, 42, 0.25)',
      }}
    >
      {children}
    </h1>
  )
}
