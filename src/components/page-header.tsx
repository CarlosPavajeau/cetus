import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: ReactNode
}

export function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="max-w-3xl max-sm:text-center">
      <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
        {title}
      </h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
