import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function ContentLayout({ children }: Props) {
  return (
    <div className="relative">
      <div className="grid gap-8 lg:grid-cols-2">{children}</div>
    </div>
  )
}
