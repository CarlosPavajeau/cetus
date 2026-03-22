import { cn } from '@cetus/web/shared/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
