'use client'

import type { ReactNode } from 'react'

type PageTitleProps = {
  children: ReactNode
}

export default function PageTitle({ children }: PageTitleProps) {
  return (
    <h1 className="page-title">{children}</h1>
  )
}
