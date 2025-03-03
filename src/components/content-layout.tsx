import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function ContentLayout({ children }: Props) {
  return (
    <div className="relative my-16">
      <div className="grid gap-8 lg:grid-cols-2">{children}</div>
    </div>
  )
}
