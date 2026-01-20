'use client'

import type { ReactNode } from 'react'

type PageTitleProps = {
  children: ReactNode
}

export default function PageTitle({ children }: PageTitleProps) {
  return (
    <h1
      style={{
        margin: '18px 0 10px',
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: 1,
        display: 'inline-block',
        backgroundImage:
          'linear-gradient(120deg, var(--primary) 0%, var(--secondary) 60%, var(--nav-surface) 100%)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        textShadow: '0 8px 20px rgba(30, 43, 24, 0.2)',
      }}
    >
      {children}
    </h1>
  )
}
