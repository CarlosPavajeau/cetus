import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function ContentLayout({ children }: Readonly<Props>) {
  return <div className="grid grid-cols-1 gap-8 md:grid-cols-2">{children}</div>
}
