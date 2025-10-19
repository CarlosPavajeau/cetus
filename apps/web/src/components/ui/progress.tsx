'use client'

import { Progress as ProgressPrimitive } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/shared/cn'

const DEFAULT_VALUE = 0
const MAX_VALUE = 100

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className,
      )}
      data-slot="progress"
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="size-full flex-1 bg-primary transition-all"
        data-slot="progress-indicator"
        style={{
          transform: `translateX(-${MAX_VALUE - (value || DEFAULT_VALUE)}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
