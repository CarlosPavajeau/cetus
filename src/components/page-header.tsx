import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: ReactNode
}

export function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6 max-w-3xl space-y-2 max-sm:text-center">
      <h1 className="font-heading font-semibold text-2xl sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  )
}
