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
          'linear-gradient(120deg, #f0c26c 0%, #4ade80 45%, #38bdf8 100%)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        textShadow: '0 10px 24px rgba(4, 8, 6, 0.45)',
      }}
    >
      {children}
    </h1>
  )
}
